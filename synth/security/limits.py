"""Server-side hard limit checks.

All limits from TRD §2 are checked before any work starts.
"""

from __future__ import annotations

from synth.config import settings


def check_row_limit(total_rows: int) -> str | None:
    """Return error code if over limit, else None."""
    if total_rows > settings.max_rows_per_dataset:
        return "LIMIT_ROWS"
    return None


def check_schema_limits(num_tables: int, max_columns: int) -> str | None:
    """Return error code if schema exceeds limits."""
    if num_tables > settings.max_tables:
        return "LIMIT_SCHEMA"
    if max_columns > settings.max_columns_per_table:
        return "LIMIT_SCHEMA"
    return None


def check_doc_limit(num_docs: int) -> str | None:
    """Return error code if document count exceeds limit."""
    if num_docs > settings.max_pdfs_per_request:
        return "LIMIT_DOCS"
    return None
