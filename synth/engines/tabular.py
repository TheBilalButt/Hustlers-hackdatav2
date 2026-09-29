"""Tabular data generation engine.

Generates rows block-by-block using seeded streams.
Reference: FR-01, TRD §5.2, §5.3, §5.4.
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

import numpy as np

from synth.config import settings
from synth.engines.pools import build_pool
from synth.engines.seeds import (
    STREAM_NULLS,
    STREAM_OUTLIERS,
    STREAM_VALUES,
    make_generator,
)
from synth.ir.models import (
    CategoricalGenerator,
    Column,
    Dataset,
    DateRangeGenerator,
    FakerGenerator,
    NumericGenerator,
    SequenceGenerator,
)
from synth.security.limits import check_row_limit


def _generate_column_values(
    col: Column,
    n_rows: int,
    start_row_idx: int,
    gen_values: np.random.Generator,
    locale: str,
    seed: int,
) -> list[Any]:
    """Generate pure values for a single column block without nulls or outliers."""
    generator = col.generator

    if isinstance(generator, SequenceGenerator):
        start = generator.start + start_row_idx * generator.step
        end = start + n_rows * generator.step
        seq = np.arange(start, end, generator.step)
        if generator.prefix:
            return [f"{generator.prefix}{val}" for val in seq]
        return [int(val) for val in seq]

    elif isinstance(generator, NumericGenerator):
        dist = generator.dist
        params = generator.params
        if dist == "uniform":
            low = float(params.get("min", 0.0))
            high = float(params.get("max", 100.0))
            raw = gen_values.uniform(low, high, size=n_rows)
        elif dist == "normal":
            mean = float(params.get("mean", 0.0))
            std = float(params.get("std", 1.0))
            raw = gen_values.normal(mean, std, size=n_rows)
        elif dist == "lognormal":
            mean = float(params.get("mean", 0.0))
            sigma = float(params.get("sigma", 1.0))
            raw = gen_values.lognormal(mean, sigma, size=n_rows)
        elif dist == "poisson":
            lam = float(params.get("lam", 1.0))
            raw = gen_values.poisson(lam, size=n_rows).astype(float)
        else:
            raw = gen_values.uniform(0.0, 1.0, size=n_rows)

        if generator.min_val is not None or generator.max_val is not None:
            min_v = -np.inf if generator.min_val is None else generator.min_val
            max_v = np.inf if generator.max_val is None else generator.max_val
            raw = np.clip(raw, min_v, max_v)

        if col.dtype == "int":
            return [int(v) for v in np.round(raw)]
        elif col.dtype == "decimal":
            return [
                Decimal(str(round(float(v), 2))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                for v in raw
            ]
        else:
            return [float(v) for v in raw]

    elif isinstance(generator, CategoricalGenerator):
        values = generator.values
        weights = generator.weights
        if weights is not None:
            p = np.array(weights, dtype=float)
            p = p / p.sum()
        else:
            p = None
        indices = gen_values.choice(len(values), size=n_rows, p=p)
        res_cat: list[Any] = [values[int(idx)] for idx in indices]
        return res_cat

    elif isinstance(generator, DateRangeGenerator):
        d_start = datetime.strptime(generator.start, "%Y-%m-%d").date()
        d_end = datetime.strptime(generator.end, "%Y-%m-%d").date()
        span_days = max(1, (d_end - d_start).days)
        offsets = gen_values.integers(0, span_days + 1, size=n_rows)
        return [(d_start + timedelta(days=int(off))).isoformat() for off in offsets]

    elif isinstance(generator, FakerGenerator):
        provider = generator.provider
        col_locale = generator.locale or locale
        pool = build_pool(col_locale, provider, seed)
        indices = gen_values.integers(0, len(pool), size=n_rows)
        res_faker: list[Any] = [pool[int(idx)] for idx in indices]
        return res_faker

    else:
        return [f"val_{start_row_idx + i}" for i in range(n_rows)]


def generate_block(
    dataset: Dataset,
    table_name: str,
    block_idx: int,
    block_size: int = settings.block_size,
) -> list[dict[str, Any]]:
    """Generate a single block of rows for a table (TRD §5.3).

    Block b of table t holds rows [b * block_size, (b + 1) * block_size)
    and depends only on (dataset, table_name, block_idx).
    """
    table = next((t for t in dataset.tables if t.name == table_name), None)
    if table is None:
        raise ValueError(f"Table '{table_name}' not found in dataset")

    table_idx = dataset.tables.index(table)
    total_planned = table.row_count if table.row_count is not None else block_size
    start_row_idx = block_idx * block_size

    if start_row_idx >= total_planned:
        return []

    n_rows = min(block_size, total_planned - start_row_idx)
    if n_rows <= 0:
        return []

    col_values: dict[str, list[Any]] = {}

    for col in table.columns:
        # Stream 0: Values
        gen_vals = make_generator(dataset.seed, table_idx, STREAM_VALUES, block_idx)
        raw_vals = _generate_column_values(
            col=col,
            n_rows=n_rows,
            start_row_idx=start_row_idx,
            gen_values=gen_vals,
            locale=dataset.locale,
            seed=dataset.seed,
        )

        # Stream 1: Nulls
        if col.nullable and col.null_rate > 0:
            gen_nulls = make_generator(dataset.seed, table_idx, STREAM_NULLS, block_idx)
            null_mask = gen_nulls.random(n_rows) < col.null_rate
            for i in range(n_rows):
                if null_mask[i]:
                    raw_vals[i] = None

        # Stream 2: Outliers
        if col.outlier_rate > 0 and col.dtype in ("int", "float", "decimal"):
            gen_outliers = make_generator(dataset.seed, table_idx, STREAM_OUTLIERS, block_idx)
            outlier_mask = gen_outliers.random(n_rows) < col.outlier_rate
            for i in range(n_rows):
                if outlier_mask[i] and raw_vals[i] is not None:
                    if col.dtype == "decimal":
                        raw_vals[i] = raw_vals[i] * Decimal("10.0")
                    else:
                        raw_vals[i] = type(raw_vals[i])(raw_vals[i] * 10)

        col_values[col.name] = raw_vals

    rows: list[dict[str, Any]] = []
    col_names = [col.name for col in table.columns]
    for i in range(n_rows):
        row = {name: col_values[name][i] for name in col_names}
        rows.append(row)

    return rows


def generate_table(
    dataset: Dataset,
    table_name: str,
    max_rows: int | None = None,
) -> list[dict[str, Any]]:
    """Generate all rows for a table across blocks with limit checks."""
    table = next((t for t in dataset.tables if t.name == table_name), None)
    if table is None:
        raise ValueError(f"Table '{table_name}' not found in dataset")

    total_rows = table.row_count if table.row_count is not None else 1000
    if max_rows is not None:
        total_rows = min(total_rows, max_rows)

    limit_err = check_row_limit(total_rows)
    if limit_err:
        raise ValueError(limit_err)

    rows: list[dict[str, Any]] = []
    block_size = settings.block_size
    num_blocks = (total_rows + block_size - 1) // block_size

    for b in range(num_blocks):
        block_rows = generate_block(dataset, table_name, block_idx=b, block_size=block_size)
        rows.extend(block_rows)

    return rows[:total_rows]


def generate_dataset(
    dataset: Dataset,
    max_rows_per_table: int | None = None,
) -> dict[str, list[dict[str, Any]]]:
    """Generate full dataset dictionary of table_name -> list of rows."""
    total_planned = sum((t.row_count or 1000) for t in dataset.tables)
    limit_err = check_row_limit(total_planned)
    if limit_err:
        raise ValueError(limit_err)

    result: dict[str, list[dict[str, Any]]] = {}
    for table in dataset.tables:
        result[table.name] = generate_table(dataset, table.name, max_rows=max_rows_per_table)
    return result


def compute_dataset_hash(
    dataset: Dataset,
    data: dict[str, list[dict[str, Any]]],
) -> str:
    """Compute canonical SHA-256 hash over dataset tables (TRD §5.4).

    Tables in IR order, canonical CSV lines, sorted by PK, Decimal as plain strings.
    """
    hasher = hashlib.sha256()

    for table in dataset.tables:
        rows = data.get(table.name, [])
        pk = [c.name for c in table.columns if c.pk]
        if pk:
            sorted_rows = sorted(rows, key=lambda r: tuple(str(r.get(k, "")) for k in pk))
        else:
            sorted_rows = rows

        col_names = [c.name for c in table.columns]
        # Header line
        hasher.update((",".join(col_names) + "\n").encode("utf-8"))

        for r in sorted_rows:
            vals = []
            for col in col_names:
                v = r.get(col)
                if v is None:
                    vals.append("")
                elif isinstance(v, Decimal):
                    vals.append(str(v))
                else:
                    vals.append(str(v))
            line = ",".join(vals) + "\n"
            hasher.update(line.encode("utf-8"))

    return hasher.hexdigest()
