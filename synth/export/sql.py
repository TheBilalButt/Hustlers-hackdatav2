"""PostgreSQL and SQLite compatible SQL export.

Identifiers are validated against the safe pattern and reserved word list.
This is the only path for generating SQL. Reference: FR-13, TRD §7.
"""
from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING, Any

from synth.engines.relational import topological_sort
from synth.security.identifiers import is_safe_identifier

if TYPE_CHECKING:
    from synth.ir.models import Dataset, Table

_DTYPE_MAP = {
    "int": "INTEGER",
    "decimal": "NUMERIC(12, 2)",
    "float": "REAL",
    "str": "TEXT",
    "bool": "BOOLEAN",
    "date": "DATE",
    "datetime": "TIMESTAMP",
}


def _escape_sql_val(val: Any) -> str:
    """Safely format a python value into SQL literal."""
    if val is None:
        return "NULL"
    elif isinstance(val, bool):
        return "TRUE" if val else "FALSE"
    elif isinstance(val, (int, float, Decimal)):
        return str(val)
    else:
        clean = str(val).replace("'", "''")
        return f"'{clean}'"


def encode_sql(
    table: Table,
    rows: list[dict[str, Any]],
    relationships: list[Any] | None = None,
) -> str:
    """Generate DDL and chunked INSERT statements for a table."""
    table_name = table.name
    if not is_safe_identifier(table_name):
        raise ValueError(f"Unsafe SQL identifier for table: {table_name}")

    col_defs: list[str] = []
    pks: list[str] = []

    for col in table.columns:
        if not is_safe_identifier(col.name):
            raise ValueError(f"Unsafe SQL identifier for column: {col.name}")

        sql_type = _DTYPE_MAP.get(col.dtype, "TEXT")
        null_clause = " NOT NULL" if not col.nullable else ""
        col_defs.append(f"  {col.name} {sql_type}{null_clause}")
        if col.pk:
            pks.append(col.name)

    if pks:
        col_defs.append(f"  PRIMARY KEY ({', '.join(pks)})")

    ddl = f"CREATE TABLE IF NOT EXISTS {table_name} (\n" + ",\n".join(col_defs) + "\n);\n"

    if not rows:
        return ddl

    col_names = [col.name for col in table.columns]
    col_list_str = ", ".join(col_names)

    insert_lines: list[str] = [ddl]

    batch_size = 500
    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        val_rows: list[str] = []
        for r in batch:
            escaped_vals = [_escape_sql_val(r.get(c)) for c in col_names]
            val_rows.append(f"  ({', '.join(escaped_vals)})")

        batch_sql = (
            f"INSERT INTO {table_name} ({col_list_str}) VALUES\n"
            + ",\n".join(val_rows)
            + ";\n"
        )
        insert_lines.append(batch_sql)

    return "\n".join(insert_lines)


def generate_dataset_sql(
    dataset: Dataset,
    data: dict[str, list[dict[str, Any]]],
) -> str:
    """Generate complete SQL DDL and INSERTs in topological dependency order."""
    sorted_tables = topological_sort(dataset)
    chunks: list[str] = [
        f"-- Synthetic Dataset: {dataset.name}",
        f"-- IR Version: {dataset.ir_version} · Seed: {dataset.seed}",
        f"-- Locale: {dataset.locale}\n",
    ]

    for table in sorted_tables:
        rows = data.get(table.name, [])
        table_sql = encode_sql(table, rows, dataset.relationships)
        chunks.append(table_sql)

    return "\n".join(chunks)