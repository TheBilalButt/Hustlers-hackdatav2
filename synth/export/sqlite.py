"""SQLite export for small datasets (estimate <= 4 MB).

Reference: FR-13, TRD §7.
"""
from __future__ import annotations

import sqlite3
from typing import TYPE_CHECKING, Any

from synth.export.sql import generate_dataset_sql

if TYPE_CHECKING:
    from synth.ir.models import Dataset


def export_sqlite_bytes(
    dataset: Dataset,
    data: dict[str, list[dict[str, Any]]],
) -> bytes:
    """Generate in-memory SQLite database and return raw binary file bytes."""
    sql_script = generate_dataset_sql(dataset, data)

    conn = sqlite3.connect(":memory:")
    try:
        conn.executescript(sql_script)
        conn.commit()
        db_bytes = conn.serialize()
        return db_bytes
    finally:
        conn.close()