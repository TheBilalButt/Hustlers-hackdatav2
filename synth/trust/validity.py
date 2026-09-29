"""Correct card metrics: schema conformance, PK uniqueness, FK orphans,
cardinality bounds, invariant violations.

All thresholds are conventions (0 tolerance). Reference: TRD ?7.1.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from synth.trust.models import MetricResult, Verdict

if TYPE_CHECKING:
    from synth.ir.models import Dataset


def evaluate_validity(
    dataset: Dataset,
    generated_data: dict[str, list[dict[str, Any]]],
) -> list[MetricResult]:
    """Evaluate all 5 Correct card validity checks with zero-tolerance thresholds."""
    metrics: list[MetricResult] = []

    # 1. Schema conformance
    schema_violations = 0
    total_fields = 0

    for table in dataset.tables:
        rows = generated_data.get(table.name, [])
        col_map = {col.name: col for col in table.columns}

        for row in rows:
            for col_name, col_def in col_map.items():
                total_fields += 1
                val = row.get(col_name)

                # Nullability check
                if val is None:
                    if not col_def.nullable:
                        schema_violations += 1
                    continue

                # Type check
                dtype = getattr(col_def, "dtype", "str")
                if dtype in ("int", "integer"):
                    is_int = isinstance(val, int) or (isinstance(val, float) and val.is_integer())
                    if not is_int:
                        schema_violations += 1
                elif dtype in ("float", "decimal", "numeric") and not isinstance(val, (int, float)):
                    schema_violations += 1

                # Generator bounds / categories
                gen = getattr(col_def, "generator", None)
                if gen:
                    kind = getattr(gen, "kind", None)
                    if kind == "categorical":
                        allowed = getattr(gen, "values", [])
                        if allowed and str(val) not in allowed:
                            schema_violations += 1
                    elif kind == "numeric":
                        min_v = getattr(gen, "min_val", None)
                        max_v = getattr(gen, "max_val", None)
                        if isinstance(val, (int, float)):
                            if min_v is not None and float(val) < min_v:
                                schema_violations += 1
                            if max_v is not None and float(val) > max_v:
                                schema_violations += 1

    schema_verdict: Verdict = "pass" if schema_violations == 0 else "fail"
    metrics.append(
        MetricResult(
            name="Schema conformance",
            value=0.0 if schema_violations == 0 else float(schema_violations),
            threshold="0 violations",
            verdict=schema_verdict,
            detail=f"{schema_violations} violations across {total_fields} field checks",
        )
    )

    # 2. PK uniqueness
    pk_duplicates = 0
    total_pk_checked = 0

    for table in dataset.tables:
        pk_col = getattr(table, "primary_key", None)
        if not pk_col:
            for c in table.columns:
                if getattr(c, "pk", False):
                    pk_col = c.name
                    break
        if not pk_col:
            continue

        rows = generated_data.get(table.name, [])
        total_pk_checked += len(rows)
        seen_pks = set()
        for row in rows:
            pk_val = row.get(pk_col)
            if pk_val in seen_pks:
                pk_duplicates += 1
            else:
                seen_pks.add(pk_val)

    pk_verdict: Verdict = "pass" if pk_duplicates == 0 else "fail"
    metrics.append(
        MetricResult(
            name="Primary key uniqueness",
            value=0.0 if pk_duplicates == 0 else float(pk_duplicates),
            threshold="0 duplicates",
            verdict=pk_verdict,
            detail=f"{pk_duplicates} duplicates in {total_pk_checked} primary keys",
        )
    )

    # 3. FK orphans
    fk_orphans = 0
    total_fk_checked = 0

    for rel in dataset.relationships:
        parent_rows = generated_data.get(rel.parent, [])
        child_rows = generated_data.get(rel.child, [])
        parent_pks = {
            r.get(rel.parent_key) for r in parent_rows if r.get(rel.parent_key) is not None
        }

        for c_row in child_rows:
            c_fk = c_row.get(rel.child_key)
            total_fk_checked += 1
            if c_fk not in parent_pks:
                fk_orphans += 1

    fk_verdict: Verdict = "pass" if fk_orphans == 0 else "fail"
    metrics.append(
        MetricResult(
            name="Foreign key integrity",
            value=0.0 if fk_orphans == 0 else float(fk_orphans),
            threshold="0 orphans",
            verdict=fk_verdict,
            detail=f"{fk_orphans} orphaned child records in {total_fk_checked} foreign keys",
        )
    )

    # 4. Cardinality bounds
    card_violations = 0
    total_parents_checked = 0

    for rel in dataset.relationships:
        if not rel.cardinality:
            continue
        parent_rows = generated_data.get(rel.parent, [])
        child_rows = generated_data.get(rel.child, [])
        total_parents_checked += len(parent_rows)

        child_counts: dict[Any, int] = {r.get(rel.parent_key): 0 for r in parent_rows}
        for c_row in child_rows:
            fk = c_row.get(rel.child_key)
            if fk in child_counts:
                child_counts[fk] += 1

        c_min = getattr(rel.cardinality, "min_val", None)
        c_max = getattr(rel.cardinality, "max_val", None)
        for count in child_counts.values():
            if c_min is not None and count < c_min or c_max is not None and count > c_max:
                card_violations += 1

    card_verdict: Verdict = "pass" if card_violations == 0 else "fail"
    metrics.append(
        MetricResult(
            name="Cardinality bounds",
            value=0.0 if card_violations == 0 else float(card_violations),
            threshold="0 violations",
            verdict=card_verdict,
            detail=f"{card_violations} violations across {total_parents_checked} parent records",
        )
    )

    # 5. Cross-table invariants
    inv_violations = 0
    total_inv_checked = 0

    for rel in dataset.relationships:
        parent_map: dict[Any, dict[str, Any]] = {
            r.get(rel.parent_key): r for r in generated_data.get(rel.parent, [])
        }
        child_rows = generated_data.get(rel.child, [])
        for c_row in child_rows:
            p_row = parent_map.get(c_row.get(rel.child_key))
            if not p_row:
                continue
            p_date = p_row.get("created_at") or p_row.get("date") or p_row.get("order_date")
            c_date = c_row.get("created_at") or c_row.get("date") or c_row.get("transaction_date")
            if p_date and c_date:
                total_inv_checked += 1
                if str(c_date) < str(p_date):
                    inv_violations += 1

    inv_verdict: Verdict = "pass" if inv_violations == 0 else "fail"
    metrics.append(
        MetricResult(
            name="Cross-table invariants",
            value=0.0 if inv_violations == 0 else float(inv_violations),
            threshold="0 violations",
            verdict=inv_verdict,
            detail=f"{inv_violations} violations across {total_inv_checked} invariant checks",
        )
    )

    return metrics
