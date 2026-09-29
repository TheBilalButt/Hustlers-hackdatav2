"""Faker-based value pools.

Pools are built once per (locale, provider) with 5000 values.
Rows index into pools with NumPy integers for determinism.
"""
from __future__ import annotations

from typing import Any


def build_pool(locale: str, provider: str, seed: int, size: int = 5000) -> list[Any]:
    """Build a deterministic pool of fake values."""
    # TODO: implement with Faker.seed_instance(seed)
    raise NotImplementedError
