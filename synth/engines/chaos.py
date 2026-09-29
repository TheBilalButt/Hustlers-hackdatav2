"""Chaos data injection engine.

Applies configured bad data to a copy of clean data using stream 4.
The clean variant is never modified. Reference: FR-11, ADR-0014.
"""

from __future__ import annotations

from typing import Any


def inject_chaos(
    clean_rows: list[dict[str, Any]],
    config: dict[str, Any],
    seed: int,
    table_idx: int,
    block_idx: int,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Return (dirty_rows, manifest_entries)."""
    # TODO: implement chaos injection
    raise NotImplementedError
