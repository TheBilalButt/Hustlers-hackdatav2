"""Tests for FR-01 Tabular Generation and TRD Section 5.

Test traceability:
- T-01a: Null rate observed within tolerance
- T-01b: Rerun hash identical
- T-01d: Row cap rejection (LIMIT_ROWS)
- Row addressability: Pure function of (recipe, table, block_index)
"""
import pytest

from synth.engines.tabular import (
    compute_dataset_hash,
    generate_block,
    generate_dataset,
    generate_table,
)
from synth.ir.models import (
    CategoricalGenerator,
    Column,
    Dataset,
    DateRangeGenerator,
    FakerGenerator,
    NumericGenerator,
    SequenceGenerator,
    Table,
)
from synth.security.limits import check_row_limit


def make_test_dataset(row_count: int = 1000, seed: int = 42, null_rate: float = 0.0) -> Dataset:
    """Helper to build a valid Dataset IR for tests."""
    columns = [
        Column(
            name="id",
            semantic_type="id",
            dtype="int",
            generator=SequenceGenerator(kind="sequence", start=1, step=1),
            pk=True,
        ),
        Column(
            name="user_id",
            semantic_type="integer",
            dtype="int",
            generator=NumericGenerator(
                kind="numeric", dist="uniform", params={"min": 100, "max": 999}
            ),
            nullable=null_rate > 0,
            null_rate=null_rate,
        ),
        Column(
            name="amount",
            semantic_type="money",
            dtype="decimal",
            generator=NumericGenerator(
                kind="numeric", dist="normal", params={"mean": 50.0, "std": 10.0}, min_val=0.0
            ),
            nullable=null_rate > 0,
            null_rate=null_rate,
        ),
        Column(
            name="status",
            semantic_type="category",
            dtype="str",
            generator=CategoricalGenerator(
                kind="categorical",
                values=["pending", "completed", "failed"],
                weights=[0.2, 0.7, 0.1],
            ),
            nullable=null_rate > 0,
            null_rate=null_rate,
        ),
        Column(
            name="created_date",
            semantic_type="date",
            dtype="date",
            generator=DateRangeGenerator(kind="date_range", start="2026-01-01", end="2026-12-31"),
            nullable=null_rate > 0,
            null_rate=null_rate,
        ),
        Column(
            name="customer_name",
            semantic_type="person_name",
            dtype="str",
            generator=FakerGenerator(kind="faker", provider="person_name"),
            nullable=null_rate > 0,
            null_rate=null_rate,
        ),
    ]

    return Dataset(
        ir_version="1.0",
        name="Test Tabular Dataset",
        mode="schema_only",
        seed=seed,
        locale="en_US",
        tables=[Table(name="orders", row_count=row_count, columns=columns)],
        relationships=[],
        invariants=[],
        privacy=[],
        chaos=None,
        documents=[],
        world=None,
    )


def test_t01a_null_rate():
    """T-01a: Observed null rate is within expected tolerance."""
    target_null_rate = 0.05
    n_rows = 20_000

    cols = [
        Column(
            name="id",
            semantic_type="id",
            dtype="int",
            generator=SequenceGenerator(kind="sequence", start=1),
            pk=True,
        )
    ]
    for i in range(1, 11):
        cols.append(
            Column(
                name=f"col_{i}",
                semantic_type="integer",
                dtype="int",
                generator=NumericGenerator(
                    kind="numeric", dist="uniform", params={"min": 1, "max": 100}
                ),
                nullable=True,
                null_rate=target_null_rate,
            )
        )

    ds = Dataset(
        ir_version="1.0",
        name="Null Rate Test",
        mode="schema_only",
        seed=12345,
        locale="en_US",
        tables=[Table(name="test_nulls", row_count=n_rows, columns=cols)],
        relationships=[],
        invariants=[],
        privacy=[],
        chaos=None,
        documents=[],
        world=None,
    )

    rows = generate_table(ds, "test_nulls")
    assert len(rows) == n_rows

    for i in range(1, 11):
        col_name = f"col_{i}"
        null_count = sum(1 for r in rows if r[col_name] is None)
        observed_rate = null_count / n_rows
        # FR-01: observed null rate is within +-1 percentage point (0.04 to 0.06)
        assert abs(observed_rate - target_null_rate) <= 0.01, (
            f"{col_name} null rate {observed_rate:.4f} not within 1pp of {target_null_rate}"
        )


def test_t01b_rerun_hash_identical():
    """T-01b: Same recipe generated twice produces identical dataset hash."""
    ds1 = make_test_dataset(row_count=500, seed=42)
    ds2 = make_test_dataset(row_count=500, seed=42)

    data1 = generate_dataset(ds1)
    data2 = generate_dataset(ds2)

    hash1 = compute_dataset_hash(ds1, data1)
    hash2 = compute_dataset_hash(ds2, data2)

    assert hash1 == hash2
    assert len(hash1) == 64  # SHA-256
    assert data1 == data2

    # Change seed -> hash must differ
    ds3 = make_test_dataset(row_count=500, seed=999)
    data3 = generate_dataset(ds3)
    hash3 = compute_dataset_hash(ds3, data3)
    assert hash3 != hash1

    # Change seed back -> hash must match original
    ds4 = make_test_dataset(row_count=500, seed=42)
    data4 = generate_dataset(ds4)
    hash4 = compute_dataset_hash(ds4, data4)
    assert hash4 == hash1


def test_t01d_row_cap():
    """T-01d: Rejects row counts exceeding max_rows_per_dataset with LIMIT_ROWS."""
    assert check_row_limit(200_000) is None
    assert check_row_limit(200_001) == "LIMIT_ROWS"

    ds_over_cap = make_test_dataset(row_count=200_001, seed=42)
    with pytest.raises(ValueError, match="LIMIT_ROWS"):
        generate_table(ds_over_cap, "orders")


def test_row_addressable_block():
    """ADR-0010: Generating block b directly matches generating all blocks."""
    ds = make_test_dataset(row_count=25_000, seed=42)
    # Block size is 10,000. Block 1 has rows 10,000 to 19,999
    block_1_direct = generate_block(ds, "orders", block_idx=1)
    assert len(block_1_direct) == 10_000

    all_rows = generate_table(ds, "orders")
    assert len(all_rows) == 25_000

    block_1_sliced = all_rows[10_000:20_000]
    assert block_1_direct == block_1_sliced
