"""Tabular data generation engine.

Generates rows block-by-block using seeded streams.
Reference: FR-01, TRD §5.3.
"""
from __future__ import annotations

from typing import Any


def generate_block(
    recipe: dict[str, Any],
    table_name: str,
    block_idx: int,
) -> list[dict[str, Any]]:
    """Generate a single block of rows for a table."""
    # TODO: implement tabular generation
    raise NotImplementedError
