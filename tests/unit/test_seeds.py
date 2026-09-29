"""Tests for deterministic seed management."""

from synth.engines.seeds import make_generator


def test_same_params_same_output():
    """Identical parameters must produce identical random sequences."""
    gen1 = make_generator(seed=42, table_idx=0, stream_id=0, block_idx=0)
    gen2 = make_generator(seed=42, table_idx=0, stream_id=0, block_idx=0)
    vals1 = gen1.random(10).tolist()
    vals2 = gen2.random(10).tolist()
    assert vals1 == vals2


def test_different_blocks_different_output():
    """Different block indices should produce different sequences."""
    gen1 = make_generator(seed=42, table_idx=0, stream_id=0, block_idx=0)
    gen2 = make_generator(seed=42, table_idx=0, stream_id=0, block_idx=1)
    vals1 = gen1.random(10).tolist()
    vals2 = gen2.random(10).tolist()
    assert vals1 != vals2
