"""Relational generation with topological ordering and FK integrity.

Generates tables in dependency order with zero orphaned foreign keys.
Reference: FR-03, TRD §5.3.
"""

from __future__ import annotations

from collections import defaultdict, deque
from typing import Any

import numpy as np

from synth.config import settings
from synth.engines.seeds import STREAM_CHILD_COUNTS, make_generator
from synth.engines.tabular import generate_table
from synth.ir.models import (
    Cardinality,
    Dataset,
    ForeignKeyGenerator,
    Relationship,
    Table,
)


def topological_sort(dataset: Dataset) -> list[Table]:
    """Sort tables in dependency order (parents before children).

    Detects cycles and raises ValueError if the schema is not a DAG.
    """
    table_map = {t.name: t for t in dataset.tables}
    in_degree: dict[str, int] = {t.name: 0 for t in dataset.tables}
    adj: dict[str, list[str]] = defaultdict(list)

    # Add edges from relationships
    for rel in dataset.relationships:
        parent = rel.parent
        child = rel.junction if rel.kind == "many_to_many" and rel.junction else rel.child
        if parent in table_map and child in table_map and parent != child:
            adj[parent].append(child)
            in_degree[child] += 1

    # Add edges from ForeignKeyGenerator columns
    for table in dataset.tables:
        for col in table.columns:
            if isinstance(col.generator, ForeignKeyGenerator):
                ref_tbl = col.generator.reference_table
                if (
                    ref_tbl in table_map
                    and ref_tbl != table.name
                    and table.name not in adj[ref_tbl]
                ):
                    adj[ref_tbl].append(table.name)
                    in_degree[table.name] += 1

    queue = deque([name for name, deg in in_degree.items() if deg == 0])
    ordered: list[Table] = []

    while queue:
        curr = queue.popleft()
        ordered.append(table_map[curr])
        for neighbor in adj[curr]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    if len(ordered) != len(dataset.tables):
        raise ValueError("Cycle detected in foreign keys")

    return ordered


def _sample_child_counts(
    cardinality: Cardinality,
    n_parents: int,
    gen: np.random.Generator,
) -> np.ndarray:
    """Sample number of children for each parent row."""
    dist = cardinality.dist
    params = cardinality.params
    min_val = cardinality.min_val
    max_val = cardinality.max_val

    if max_val > 100 or float(params.get("lam", 0.0)) > 100:
        raise ValueError("LIMIT_FANOUT")

    if dist == "fixed":
        cnt = int(params.get("count", min_val))
        return np.full(n_parents, cnt, dtype=int)
    elif dist == "uniform":
        return gen.integers(min_val, max_val + 1, size=n_parents)
    elif dist == "poisson":
        lam = float(params.get("lam", 3.0))
        raw = gen.poisson(lam, size=n_parents)
        return np.clip(raw, min_val, max_val)
    elif dist == "negbin":
        n = float(params.get("n", 5))
        p = float(params.get("p", 0.5))
        raw = gen.negative_binomial(n, p, size=n_parents)
        return np.clip(raw, min_val, max_val)
    else:
        return np.full(n_parents, min_val, dtype=int)


def generate_relational(
    dataset: Dataset,
    max_rows: int | None = None,
) -> dict[str, list[dict[str, Any]]]:
    """Generate all tables in topological order with zero orphaned foreign keys (FR-03)."""
    sorted_tables = topological_sort(dataset)
    results: dict[str, list[dict[str, Any]]] = {}

    table_indices = {t.name: i for i, t in enumerate(dataset.tables)}

    rel_by_child: dict[str, Relationship] = {}
    rel_by_junction: dict[str, Relationship] = {}
    for rel in dataset.relationships:
        if rel.kind == "many_to_many" and rel.junction:
            rel_by_junction[rel.junction] = rel
        else:
            rel_by_child[rel.child] = rel

    for table in sorted_tables:
        t_idx = table_indices[table.name]

        # Check if table is a Many-to-Many junction table
        if table.name in rel_by_junction:
            rel = rel_by_junction[table.name]
            parent_rows = results.get(rel.parent, [])
            child_rows = results.get(rel.child, [])
            gen_counts = make_generator(dataset.seed, t_idx, STREAM_CHILD_COUNTS, 0)

            pairs: list[tuple[Any, Any]] = []
            child_pks = [r[rel.child_key] for r in child_rows]
            n_children = len(child_pks)

            for p_row in parent_rows:
                p_pk = p_row[rel.parent_key]
                draw_max = rel.cardinality.max_val + 1
                draw_val = int(gen_counts.integers(rel.cardinality.min_val, draw_max))
                k = min(n_children, draw_val)
                chosen_child_pks = gen_counts.choice(child_pks, size=k, replace=False)
                for c_pk in chosen_child_pks:
                    pairs.append((p_pk, c_pk))

            junction_rows: list[dict[str, Any]] = []
            for p_pk, c_pk in pairs:
                row = {rel.parent_key: p_pk, rel.child_key: c_pk}
                junction_rows.append(row)

            if max_rows is not None:
                junction_rows = junction_rows[:max_rows]
            results[table.name] = junction_rows
            continue

        # Check if table has a parent 1:N relationship
        if table.name in rel_by_child:
            rel = rel_by_child[table.name]
            parent_rows = results.get(rel.parent, [])
            n_parents = len(parent_rows)

            gen_counts = make_generator(dataset.seed, t_idx, STREAM_CHILD_COUNTS, 0)
            counts = _sample_child_counts(rel.cardinality, n_parents, gen_counts)

            total_children = int(np.sum(counts))
            if total_children > settings.max_rows_per_dataset:
                raise ValueError("LIMIT_FANOUT")

            temp_tables = [
                t.model_copy(update={"row_count": total_children}) if t.name == table.name else t
                for t in dataset.tables
            ]
            child_dataset = dataset.model_copy(update={"tables": temp_tables})
            child_rows = generate_table(child_dataset, table.name, max_rows=total_children)

            # Assign foreign keys with zero orphans
            child_idx = 0
            for p_idx, p_row in enumerate(parent_rows):
                p_pk = p_row[rel.parent_key]
                cnt = counts[p_idx]
                for _ in range(cnt):
                    if child_idx < len(child_rows):
                        child_rows[child_idx][rel.child_key] = p_pk
                        child_idx += 1

            child_rows = child_rows[:child_idx]
            if max_rows is not None:
                child_rows = child_rows[:max_rows]
            results[table.name] = child_rows
            continue

        # Standalone or Root table
        base_rows = generate_table(dataset, table.name, max_rows=max_rows)

        # Handle self-referencing foreign keys (T-03d)
        for col in table.columns:
            if (
                isinstance(col.generator, ForeignKeyGenerator)
                and col.generator.reference_table == table.name
            ):
                ref_col = col.generator.reference_column
                gen_self = make_generator(dataset.seed, t_idx, STREAM_CHILD_COUNTS, 1)

                for i, row in enumerate(base_rows):
                    if i == 0:
                        row[col.name] = None  # Root is NULL
                    else:
                        parent_row_idx = int(gen_self.integers(0, i))
                        row[col.name] = base_rows[parent_row_idx][ref_col]

        results[table.name] = base_rows

    # Enforce cross-table invariants if configured (FR-04)
    if dataset.invariants:
        from synth.engines.invariants import enforce_invariants

        results = enforce_invariants(dataset, results)

    return results
