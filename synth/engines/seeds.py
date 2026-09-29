"""Deterministic seed management.

All randomness flows through SeedSequence with spawn keys.
Never use random, global np.random.*, datetime.now(), or uuid4.

Stream IDs (TRD §5.2):
  0 = values, 1 = nulls, 2 = outliers, 3 = child counts,
  4 = chaos, 5 = privacy redraws, 6 = documents, 7 = pool selection.
"""
from __future__ import annotations

import numpy as np

STREAM_VALUES = 0
STREAM_NULLS = 1
STREAM_OUTLIERS = 2
STREAM_CHILD_COUNTS = 3
STREAM_CHAOS = 4
STREAM_PRIVACY = 5
STREAM_DOCUMENTS = 6
STREAM_POOL = 7


def make_generator(
    seed: int,
    table_idx: int,
    stream_id: int,
    block_idx: int,
) -> np.random.Generator:
    """Create a reproducible NumPy generator for a specific block and stream."""
    seq = np.random.SeedSequence(seed, spawn_key=(table_idx, stream_id, block_idx))
    return np.random.Generator(np.random.PCG64(seq))
