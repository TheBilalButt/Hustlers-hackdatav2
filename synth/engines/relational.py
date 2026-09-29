"""Relational generation with topological ordering and FK integrity.

Generates tables in dependency order with zero orphaned foreign keys.
Reference: FR-03, TRD §5.3.
"""
from __future__ import annotations

from typing import Any


def generate_relational(recipe: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
    """Generate all tables in topological order."""
    # TODO: implement relational generation
    raise NotImplementedError
