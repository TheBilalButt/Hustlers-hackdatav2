"""Tests for FR-03: Relational generation with zero orphans.

T-03a: zero orphans
T-03b: cardinality bounds
T-03c: N:N dedupe
T-03d: self-FK
T-03e: fan-out rejection
"""

import pytest

from synth.engines.relational import generate_relational, topological_sort
from synth.ir.models import (
    Cardinality,
    Column,
    Dataset,
    ForeignKeyGenerator,
    NumericGenerator,
    Relationship,
    SequenceGenerator,
    Table,
)


def make_parent_child_dataset(cardinality_dist="poisson", min_val=1, max_val=5) -> Dataset:
    return Dataset(
        ir_version="1.0",
        name="Customer Orders Relational",
        mode="schema_only",
        seed=42,
        locale="en_US",
        tables=[
            Table(
                name="customers",
                row_count=50,
                columns=[
                    Column(
                        name="customer_id",
                        semantic_type="id",
                        dtype="int",
                        generator=SequenceGenerator(kind="sequence", start=1),
                        pk=True,
                    ),
                    Column(
                        name="credit_limit",
                        semantic_type="money",
                        dtype="decimal",
                        generator=NumericGenerator(
                            kind="numeric", dist="uniform", min_val=500.0, max_val=5000.0
                        ),
                    ),
                ],
            ),
            Table(
                name="orders",
                row_count=150,
                columns=[
                    Column(
                        name="order_id",
                        semantic_type="id",
                        dtype="int",
                        generator=SequenceGenerator(kind="sequence", start=1001),
                        pk=True,
                    ),
                    Column(
                        name="customer_id",
                        semantic_type="id",
                        dtype="int",
                        generator=ForeignKeyGenerator(
                            kind="foreign_key",
                            reference_table="customers",
                            reference_column="customer_id",
                        ),
                    ),
                ],
            ),
        ],
        relationships=[
            Relationship(
                parent="customers",
                parent_key="customer_id",
                child="orders",
                child_key="customer_id",
                kind="one_to_many",
                cardinality=Cardinality(
                    dist=cardinality_dist,
                    params={"lam": 3.0} if cardinality_dist == "poisson" else {},
                    min_val=min_val,
                    max_val=max_val,
                ),
            )
        ],
        invariants=[],
        privacy=[],
        chaos=None,
        documents=[],
        world=None,
    )


def test_topological_sort():
    """Verify tables are sorted parent before child."""
    ds = make_parent_child_dataset()
    sorted_tables = topological_sort(ds)
    names = [t.name for t in sorted_tables]
    assert names.index("customers") < names.index("orders")


def test_fr03_t03a_zero_orphans():
    """T-03a: Every foreign key points to a valid parent primary key (0 orphans)."""
    ds = make_parent_child_dataset()
    data = generate_relational(ds)

    assert "customers" in data
    assert "orders" in data

    parent_ids = {row["customer_id"] for row in data["customers"]}
    for order in data["orders"]:
        fk = order["customer_id"]
        assert fk in parent_ids, f"Orphaned order found with customer_id {fk}"


def test_fr03_t03b_cardinality_bounds():
    """T-03b: Child counts per parent respect declared [min_val, max_val]."""
    min_bound, max_bound = 2, 6
    ds = make_parent_child_dataset(cardinality_dist="uniform", min_val=min_bound, max_val=max_bound)
    data = generate_relational(ds)

    from collections import Counter

    child_counts = Counter(order["customer_id"] for order in data["orders"])

    for cust in data["customers"]:
        c_id = cust["customer_id"]
        count = child_counts[c_id]
        assert min_bound <= count <= max_bound, (
            f"Customer {c_id} had {count} orders; expected [{min_bound}, {max_bound}]"
        )


def test_fr03_t03c_nn_dedupe():
    """T-03c: Many-to-many junction tables contain no duplicate (parent_pk, child_pk) pairs."""
    ds = Dataset(
        ir_version="1.0",
        name="Student Courses Junction",
        mode="schema_only",
        seed=123,
        locale="en_US",
        tables=[
            Table(
                name="students",
                row_count=20,
                columns=[
                    Column(
                        name="student_id",
                        semantic_type="id",
                        dtype="int",
                        generator=SequenceGenerator(start=1),
                        pk=True,
                    )
                ],
            ),
            Table(
                name="courses",
                row_count=10,
                columns=[
                    Column(
                        name="course_id",
                        semantic_type="id",
                        dtype="int",
                        generator=SequenceGenerator(start=101),
                        pk=True,
                    )
                ],
            ),
            Table(
                name="enrollments",
                row_count=50,
                columns=[
                    Column(
                        name="student_id",
                        semantic_type="id",
                        dtype="int",
                        generator=SequenceGenerator(start=1),
                    ),
                    Column(
                        name="course_id",
                        semantic_type="id",
                        dtype="int",
                        generator=SequenceGenerator(start=1),
                    ),
                ],
            ),
        ],
        relationships=[
            Relationship(
                parent="students",
                parent_key="student_id",
                child="courses",
                child_key="course_id",
                kind="many_to_many",
                junction="enrollments",
                cardinality=Cardinality(dist="uniform", min_val=1, max_val=5),
            )
        ],
    )

    data = generate_relational(ds)
    assert "enrollments" in data

    pairs = [(row["student_id"], row["course_id"]) for row in data["enrollments"]]
    assert len(pairs) == len(set(pairs)), "Duplicate pairs found in junction table"


def test_fr03_t03d_self_fk():
    """T-03d: Self-referencing FK points only to earlier rows; roots are None/NULL."""
    ds = Dataset(
        ir_version="1.0",
        name="Employees Org Tree",
        mode="schema_only",
        seed=42,
        locale="en_US",
        tables=[
            Table(
                name="employees",
                row_count=30,
                columns=[
                    Column(
                        name="emp_id",
                        semantic_type="id",
                        dtype="int",
                        generator=SequenceGenerator(start=1),
                        pk=True,
                    ),
                    Column(
                        name="manager_id",
                        semantic_type="id",
                        dtype="int",
                        nullable=True,
                        generator=ForeignKeyGenerator(
                            kind="foreign_key",
                            reference_table="employees",
                            reference_column="emp_id",
                        ),
                    ),
                ],
            )
        ],
        relationships=[],
    )

    data = generate_relational(ds)
    emps = data["employees"]

    # First row (root) must have None manager_id
    assert emps[0]["manager_id"] is None

    # Every subsequent row points strictly to an earlier row
    seen_ids = {emps[0]["emp_id"]}
    for emp in emps[1:]:
        mgr = emp["manager_id"]
        if mgr is not None:
            assert mgr in seen_ids, f"Self-FK {mgr} referenced forward or unseen employee"
        seen_ids.add(emp["emp_id"])


def test_fr03_t03e_fanout_rejection():
    """T-03e: Exceeding LIMIT_FANOUT rejects plan with LIMIT_FANOUT error."""
    ds = make_parent_child_dataset(min_val=150, max_val=200)
    with pytest.raises(ValueError, match="LIMIT_FANOUT"):
        generate_relational(ds)
