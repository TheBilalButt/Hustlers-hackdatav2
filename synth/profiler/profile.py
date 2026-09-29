"""Column profiling: types, ranges, patterns, FK candidates, PII flags.

Runs deterministically on uploaded CSV/JSON samples.
Reference: FR-09, TRD §2, §6, §8, §9.1, RT-06, RT-07, RT-26.
"""

from __future__ import annotations

import math
import re
from decimal import Decimal, InvalidOperation
from typing import Any, Literal

from synth.ir.models import (
    CategoricalGenerator,
    Column,
    Dataset,
    DateRangeGenerator,
    FakerGenerator,
    NumericGenerator,
    PrivacyRule,
    SemanticType,
    SequenceGenerator,
    Table,
)
from synth.profiler.pii import detect_pii
from synth.profiler.redact import mask_examples
from synth.security.identifiers import sanitize_identifier

# ISO date/datetime regex
ISO_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
ISO_DATETIME_RE = re.compile(r"^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?")
UUID_RE = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)

DType = Literal["int", "float", "decimal", "str", "bool", "date", "datetime"]


def infer_semantic_type(
    col_name: str,
    non_null_values: list[str],
    is_numeric: bool,
    is_integer: bool,
    distinct_ratio: float,
    pii_type: str | None,
) -> SemanticType:
    """Infer the most appropriate SemanticType from the 31 IR literals."""
    col_lower = col_name.lower().strip()

    # 1. Primary or foreign IDs
    if col_lower == "id" or (col_lower.endswith("_id") and (is_integer or distinct_ratio > 0.8)):
        return "id"

    # 2. PII mappings
    if pii_type == "email":
        return "email"
    if pii_type == "phone":
        return "phone"
    if pii_type == "name":
        if "first" in col_lower:
            return "first_name"
        if "last" in col_lower:
            return "last_name"
        return "person_name"
    if pii_type == "address":
        return "street_address"
    if pii_type == "postal_code":
        return "postal_code"
    if pii_type == "credit_card":
        return "card_fake"
    if pii_type == "iban":
        return "iban_fake"

    # 3. UUID / SKU
    sample_sub = non_null_values[:20]
    if sample_sub:
        uuid_matches = sum(1 for v in sample_sub if UUID_RE.match(v))
        if uuid_matches / len(sample_sub) >= 0.8:
            return "sku"

    # 4. Dates and datetimes
    if non_null_values:
        sample_subset = non_null_values[:30]
        dt_matches = sum(1 for v in sample_subset if ISO_DATETIME_RE.match(v))
        if dt_matches / len(sample_subset) >= 0.7:
            return "datetime"
        date_matches = sum(1 for v in sample_subset if ISO_DATE_RE.match(v))
        if date_matches / len(sample_subset) >= 0.7:
            return "date"

    # 5. Currency / Price / Amount
    money_terms = ("price", "amount", "cost", "salary", "fee", "tax", "balance", "money")
    if is_numeric and any(term in col_lower for term in money_terms):
        return "money"

    # 6. Boolean
    if non_null_values:
        bool_vals = {"true", "false", "0", "1", "yes", "no", "t", "f"}
        if all(v.lower() in bool_vals for v in non_null_values[:50]):
            return "boolean"

    # 7. Percentage
    pct_terms = ("rate", "percent", "pct", "ratio", "margin")
    if is_numeric and any(term in col_lower for term in pct_terms):
        return "percent"

    # 8. Quantity
    qty_terms = ("qty", "quantity", "count", "num_", "units")
    if is_integer and any(term in col_lower for term in qty_terms):
        return "quantity"

    # 9. Numeric fallback
    if is_integer:
        return "integer"
    if is_numeric:
        return "float"

    # 10. Low cardinality categorical or geo
    if any(term in col_lower for term in ("country", "nation")):
        return "country"
    if any(term in col_lower for term in ("city", "town")):
        return "city"
    if any(term in col_lower for term in ("company", "org", "corp")):
        return "company"
    if any(term in col_lower for term in ("job", "title")):
        return "job_title"

    cat_terms = ("dept", "department", "category", "type", "tag", "role", "group", "status")
    if any(term in col_lower for term in cat_terms):
        return "category"

    if distinct_ratio <= 0.6 and len(non_null_values) >= 3:
        return "category"

    # 11. String / Text
    if non_null_values:
        avg_len = sum(len(v) for v in non_null_values) / len(non_null_values)
        if avg_len > 60 or "\n" in "".join(non_null_values[:10]):
            return "text_long"

    return "text_short"


def _calc_quantile(nums: list[float], q: float) -> float:
    idx = int(q * (len(nums) - 1))
    return nums[idx]


def profile_columns(
    rows: list[dict[str, Any]],
    column_names: list[str],
    table_name: str = "table_1",
) -> dict[str, Any]:
    """Profile each column and return stats, inferred types, and PII flags.

    Args:
        rows: Parsed rows from the uploaded sample.
        column_names: Column header names.
        table_name: Display table name.

    Returns:
        Per-column profiling results adhering to TRD §6, §8, §9.
    """
    total_rows = len(rows)
    column_profiles: dict[str, Any] = {}
    fk_candidates: list[dict[str, str]] = []

    for col in column_names:
        raw_values = [row.get(col) for row in rows]
        null_count = sum(
            1 for v in raw_values if v is None or str(v).strip() == "" or str(v).lower() == "null"
        )
        non_null_strings = [
            str(v).strip()
            for v in raw_values
            if v is not None and str(v).strip() != "" and str(v).lower() != "null"
        ]
        non_null_count = len(non_null_strings)
        null_rate = round(null_count / total_rows, 4) if total_rows > 0 else 0.0

        # Cardinality & distinct values
        distinct_vals = set(non_null_strings)
        distinct_count = len(distinct_vals)
        unique_rate = round(distinct_count / non_null_count, 4) if non_null_count > 0 else 0.0

        # Numeric check
        is_numeric = False
        is_integer = False
        num_floats: list[float] = []

        if non_null_count > 0:
            parsed_decimals = 0
            parsed_integers = 0
            for v in non_null_strings:
                try:
                    d = Decimal(v)
                    num_floats.append(float(d))
                    parsed_decimals += 1
                    if d % 1 == 0:
                        parsed_integers += 1
                except (InvalidOperation, ValueError):
                    pass

            if parsed_decimals == non_null_count:
                is_numeric = True
                if parsed_integers == non_null_count:
                    is_integer = True

        # PII Detection
        pii_category = detect_pii(col, non_null_strings)

        # Inferred semantic type
        semantic_type = infer_semantic_type(
            col,
            non_null_strings,
            is_numeric=is_numeric,
            is_integer=is_integer,
            distinct_ratio=unique_rate,
            pii_type=pii_category,
        )

        # Statistics computation
        stats: dict[str, Any] = {
            "total_count": total_rows,
            "null_count": null_count,
            "null_rate": null_rate,
            "distinct_count": distinct_count,
            "unique_rate": unique_rate,
        }

        if is_numeric and num_floats:
            sorted_nums = sorted(num_floats)
            min_val = sorted_nums[0]
            max_val = sorted_nums[-1]
            mean_val = sum(sorted_nums) / len(sorted_nums)
            variance = sum((x - mean_val) ** 2 for x in sorted_nums) / len(sorted_nums)
            std_val = math.sqrt(variance)

            p25 = _calc_quantile(sorted_nums, 0.25)
            p50 = _calc_quantile(sorted_nums, 0.50)
            p75 = _calc_quantile(sorted_nums, 0.75)
            iqr = p75 - p25

            # Winsorizing bounds to mitigate data poisoning (RT-06, RT-07)
            lower_bound = p25 - 3 * iqr
            upper_bound = p75 + 3 * iqr
            winsorized_min = max(min_val, lower_bound)
            winsorized_max = min(max_val, upper_bound)

            stats.update(
                {
                    "min": round(min_val, 4),
                    "max": round(max_val, 4),
                    "mean": round(mean_val, 4),
                    "std": round(std_val, 4),
                    "median": round(p50, 4),
                    "p25": round(p25, 4),
                    "p75": round(p75, 4),
                    "winsorized_min": round(winsorized_min, 4),
                    "winsorized_max": round(winsorized_max, 4),
                }
            )
        else:
            # String stats
            if non_null_strings:
                lengths = [len(s) for s in non_null_strings]
                stats.update(
                    {
                        "min_length": min(lengths),
                        "max_length": max(lengths),
                        "avg_length": round(sum(lengths) / len(lengths), 1),
                    }
                )
            # Top categories if categorical
            if distinct_count <= 20:
                counts: dict[str, int] = {}
                for s in non_null_strings:
                    counts[s] = counts.get(s, 0) + 1
                stats["top_categories"] = [
                    {"value": k, "count": v}
                    for k, v in sorted(counts.items(), key=lambda item: item[1], reverse=True)[:10]
                ]

        # Recommended privacy control
        privacy_control: str | None = None
        if pii_category in ("email", "phone", "name", "address", "ssn", "credit_card", "iban"):
            privacy_control = "mask"
        elif pii_category in ("date_of_birth", "postal_code"):
            privacy_control = "generalize"
        elif semantic_type == "id" and pii_category:
            privacy_control = "hmac_hash"

        # Safe masked examples (<= 5 values, no raw PII in prompts)
        examples = mask_examples(non_null_strings, max_examples=5)

        # Check for FK candidate
        if col.lower().endswith("_id") and col.lower() != "id":
            target_table = col[:-3].rstrip("_")
            fk_candidates.append(
                {
                    "source_column": col,
                    "target_table": target_table,
                    "target_column": "id",
                }
            )

        column_profiles[col] = {
            "name": col,
            "semantic_type": semantic_type,
            "pii": pii_category,
            "recommended_control": privacy_control,
            "stats": stats,
            "masked_examples": examples,
        }

    return {
        "table_name": table_name,
        "row_count": total_rows,
        "column_count": len(column_names),
        "columns": column_profiles,
        "fk_candidates": fk_candidates,
    }


def profile_to_ir(
    profile_result: dict[str, Any],
    table_name: str = "imported_table",
    dataset_name: str = "Imported Dataset",
    row_count: int | None = None,
) -> Dataset:
    """Construct a fully-valid Dataset IR from profiling results.

    Adheres to TRD §4 and guarantees all columns are sanitized identifiers.
    """
    safe_table_name = sanitize_identifier(table_name, fallback="imported_table")
    columns_data = profile_result.get("columns", {})
    ir_columns: list[Column] = []
    privacy_rules: list[PrivacyRule] = []

    for idx, (col_name, col_meta) in enumerate(columns_data.items()):
        safe_col_name = sanitize_identifier(col_name, fallback=f"col_{idx}")
        sem_type: SemanticType = col_meta.get("semantic_type", "text_short")
        stats = col_meta.get("stats", {})
        null_rate = min(float(stats.get("null_rate", 0.0)), 0.5)
        unique_rate = float(stats.get("unique_rate", 0.0))
        is_pk = (sem_type == "id" and idx == 0) or (safe_col_name == "id")
        is_unique = is_pk or (unique_rate >= 0.99 and stats.get("total_count", 0) > 10)

        dtype: DType
        generator: (
            SequenceGenerator
            | NumericGenerator
            | DateRangeGenerator
            | CategoricalGenerator
            | FakerGenerator
        )

        # Determine dtype and generator
        if sem_type == "id":
            dtype = "int"
            generator = SequenceGenerator(start=1, step=1)
        elif sem_type in ("integer", "quantity"):
            dtype = "int"
            mean_val = float(stats.get("mean", 50.0))
            std_val = max(float(stats.get("std", 15.0)), 1.0)
            generator = NumericGenerator(
                dist="normal",
                params={"mean": mean_val, "std": std_val},
                min_val=stats.get("winsorized_min", 0.0),
                max_val=stats.get("winsorized_max", 1000.0),
            )
        elif sem_type in ("float", "percent"):
            dtype = "float"
            mean_val = float(stats.get("mean", 50.0))
            std_val = max(float(stats.get("std", 15.0)), 1.0)
            generator = NumericGenerator(
                dist="normal",
                params={"mean": mean_val, "std": std_val},
                min_val=stats.get("winsorized_min", 0.0),
                max_val=stats.get("winsorized_max", 100.0),
            )
        elif sem_type == "money":
            dtype = "decimal"
            mean_val = float(stats.get("mean", 100.0))
            std_val = max(float(stats.get("std", 25.0)), 1.0)
            generator = NumericGenerator(
                dist="normal",
                params={"mean": mean_val, "std": std_val},
                min_val=stats.get("winsorized_min", 0.0),
                max_val=stats.get("winsorized_max", 10000.0),
            )
        elif sem_type in ("date", "datetime"):
            dtype = "date" if sem_type == "date" else "datetime"
            generator = DateRangeGenerator(start="2022-01-01", end="2026-12-31")
        elif sem_type == "boolean":
            dtype = "bool"
            generator = CategoricalGenerator(values=["true", "false"], weights=[0.5, 0.5])
        elif sem_type == "category" and "top_categories" in stats and stats["top_categories"]:
            dtype = "str"
            cats = stats["top_categories"]
            vals = [str(c["value"]) for c in cats]
            weights = [float(c["count"]) for c in cats]
            generator = CategoricalGenerator(values=vals, weights=weights)
        else:
            dtype = "str"
            generator = FakerGenerator(provider=sem_type)

        ir_columns.append(
            Column(
                name=safe_col_name,
                semantic_type=sem_type,
                dtype=dtype,
                generator=generator,
                nullable=null_rate > 0,
                null_rate=null_rate,
                outlier_rate=0.0,
                unique=is_unique,
                pk=is_pk,
                constraints=[],
            )
        )

        # Recommended privacy control
        rec_control = col_meta.get("recommended_control")
        if rec_control in ("mask", "hmac_hash", "drop", "generalize", "dp_marginals"):
            privacy_rules.append(
                PrivacyRule(
                    table=safe_table_name,
                    column=safe_col_name,
                    control=rec_control,
                )
            )

    actual_rows = row_count or profile_result.get("row_count", 100)
    table = Table(
        name=safe_table_name,
        row_count=min(actual_rows, 10_000),
        columns=ir_columns
        if ir_columns
        else [
            Column(
                name="id",
                semantic_type="id",
                dtype="int",
                generator=SequenceGenerator(start=1, step=1),
                pk=True,
                unique=True,
            )
        ],
    )

    return Dataset(
        ir_version="1.0",
        name=dataset_name[:80],
        mode="sample",
        seed=42,
        locale="en_US",
        tables=[table],
        relationships=[],
        invariants=[],
        privacy=privacy_rules,
        chaos=None,
        documents=[],
        world=None,
    )