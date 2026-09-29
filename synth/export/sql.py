"""PostgreSQL-compatible SQL export.

Identifiers are validated against the safe pattern and reserved word list.
This is the only path for generating SQL. Reference: FR-13.
"""

from __future__ import annotations

from typing import Any


def encode_sql(
    table_name: str,
    columns: list[dict[str, str]],
    rows: list[dict[str, Any]],
) -> str:
    """Generate DDL + INSERT statements."""
    # TODO: implement SQL encoding with proper escaping
    raise NotImplementedError
