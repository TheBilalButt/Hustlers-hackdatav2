"""Column profiling: types, ranges, patterns, FK candidates, PII flags.

Runs deterministically on uploaded CSV/JSON samples.
"""

from __future__ import annotations

from typing import Any


def profile_columns(rows: list[dict[str, Any]], column_names: list[str]) -> dict[str, Any]:
    """Profile each column and return stats, inferred types, and PII flags.

    Args:
        rows: Parsed rows from the uploaded sample.
        column_names: Column header names.

    Returns:
        Per-column profiling results.
    """
    # TODO: implement profiling logic (FR-09)
    raise NotImplementedError
