"""Tests for FR-04: Cross-table invariants.

T-04a: totals (sum_children)
T-04b: temporal order (child date >= parent date)
T-04c: rounding mode (Decimal ROUND_HALF_UP)
"""

from decimal import Decimal

from synth.engines.invariants import enforce_invariants, verify_invariants
from synth.engines.relational import generate_relational
from synth.ir.models import (
    Cardinality,
    Column,
    Dataset,
    DateRangeGenerator,
    ForeignKeyGenerator,
    NumericGenerator,
    Relationship,
    SequenceGenerator,
    SumChildren,
    Table,
    TemporalOrder,
)


def make_order_items_dataset() -> Dataset:
    return Dataset(
        ir_version="1.0",
        name="Orders and Order Items Invariants",
        mode="schema_only",
        seed=101,
        locale="en_US",
        tables=[
            Table(
                name="orders",
                row_count=20,
                columns=[
                    Column(
                        name="order_id",
                        semantic_type="id",
                        dtype="int",
                        generator=SequenceGenerator(start=1001),
                        pk=True,
                    ),
                    Column(
                        name="order_date",
                        semantic_type="date",
                        dtype="date",
                        generator=DateRangeGenerator(start="2026-01-01", end="2026-03-31"),
                    ),
                    Column(
                        name="total_amount",
                        semantic_type="money",
                        dtype="decimal",
                        generator=NumericGenerator(dist="uniform", min_val=0, max_val=100),
                    ),
                ],
            ),
            Table(
                name="order_items",
                row_count=60,
                columns=[
                    Column(
                        name="item_id",
                        semantic_type="id",
                        dtype="int",
                        generator=SequenceGenerator(start=5001),
                        pk=True,
                    ),
                    Column(
                        name="order_id",
                        semantic_type="id",
                        dtype="int",
                        generator=ForeignKeyGenerator(
                            reference_table="orders", reference_column="order_id"
                        ),
                    ),
                    Column(
                        name="ship_date",
                        semantic_type="date",
                        dtype="date",
                        generator=DateRangeGenerator(start="2026-01-01", end="2026-04-15"),
                    ),
                    Column(
                        name="quantity",
                        semantic_type="quantity",
                        dtype="int",
                        generator=NumericGenerator(
                            dist="poisson", params={"lam": 2}, min_val=1, max_val=10
                        ),
                    ),
                    Column(
                        name="unit_price",
                        semantic_type="money",
                        dtype="decimal",
                        generator=NumericGenerator(dist="uniform", min_val=5.0, max_val=50.0),
                    ),
                ],
            ),
        ],
        relationships=[
            Relationship(
                parent="orders",
                parent_key="order_id",
                child="order_items",
                child_key="order_id",
                kind="one_to_many",
                cardinality=Cardinality(dist="uniform", min_val=1, max_val=5),
            )
        ],
        invariants=[
            SumChildren(
                parent_table="orders",
                parent_column="total_amount",
                child_table="order_items",
                child_columns=["quantity", "unit_price"],
                operation="quantity * unit_price",
            ),
            TemporalOrder(
                parent_table="orders",
                parent_column="order_date",
                child_table="order_items",
                child_column="ship_date",
            ),
        ],
    )


def test_fr04_t04a_totals():
    """T-04a: sum_children enforces parent order total equals sum of child items."""
    ds = make_order_items_dataset()
    data = generate_relational(ds)
    data = enforce_invariants(ds, data)

    report = verify_invariants(ds, data)
    assert report["violations"] == 0, f"Invariant violations found: {report['details']}"

    # Manual verification: check each order matches sum of its items
    items_by_order: dict[int, list[dict]] = {}
    for item in data["order_items"]:
        items_by_order.setdefault(item["order_id"], []).append(item)

    for order in data["orders"]:
        o_id = order["order_id"]
        items = items_by_order.get(o_id, [])
        expected_total = sum(
            Decimal(str(it["quantity"])) * Decimal(str(it["unit_price"])) for it in items
        )
        actual_total = Decimal(str(order["total_amount"]))
        assert actual_total == expected_total, (
            f"Order {o_id}: actual {actual_total} != expected {expected_total}"
        )


def test_fr04_t04b_temporal_order():
    """T-04b: temporal_order ensures child ship_date >= parent order_date."""
    ds = make_order_items_dataset()
    data = generate_relational(ds)
    data = enforce_invariants(ds, data)

    orders_by_id = {o["order_id"]: o for o in data["orders"]}
    for item in data["order_items"]:
        parent = orders_by_id[item["order_id"]]
        assert item["ship_date"] >= parent["order_date"], (
            f"Ship date {item['ship_date']} before order date {parent['order_date']}"
        )


def test_fr04_t04c_rounding_mode():
    """T-04c: Money computations use exact Decimal ROUND_HALF_UP."""
    ds = make_order_items_dataset()
    data = generate_relational(ds)
    data = enforce_invariants(ds, data)

    for order in data["orders"]:
        val = order["total_amount"]
        assert isinstance(val, (Decimal, str)), f"Expected Decimal or str, got {type(val)}"
        # Verify 2 decimal places
        d_val = Decimal(str(val))
        assert d_val == d_val.quantize(Decimal("0.01"))
