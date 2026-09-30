"""Unit and integration tests for FR-05 (One-world linkage) and FR-08 (Query DSL).

Covers T-05a, T-05b, T-08a, T-08b, T-08c, RT-03.
"""

from __future__ import annotations

from decimal import Decimal

from synth.documents.linkage import generate_linked_world
from synth.documents.query_dsl import (
    DSLConstraint,
    DSLPeriod,
    DSLQuery,
    generate_statement_from_dsl,
    validate_query_dsl,
)
from synth.ir.models import (
    Column,
    Dataset,
    NumericGenerator,
    SequenceGenerator,
    Table,
    WorldConfig,
)


def _make_ecom_world_dataset() -> Dataset:
    return Dataset(
        ir_version="1.0",
        name="Linked Ecommerce",
        mode="schema_only",
        seed=101,
        locale="en_US",
        world=WorldConfig(
            seller_name="Nexus Supply Corp",
            seller_address="100 Tech Blvd, Austin TX",
            bank_name="Global Capital Trust",
            payment_terms_days=30,
        ),
        tables=[
            Table(
                name="customers",
                row_count=5,
                columns=[
                    Column(
                        name="id",
                        semantic_type="id",
                        dtype="int",
                        generator=SequenceGenerator(kind="sequence", start=1),
                        pk=True,
                    ),
                    Column(
                        name="name",
                        semantic_type="person_name",
                        dtype="str",
                        generator=SequenceGenerator(kind="sequence", prefix="Customer "),
                    ),
                ],
            ),
            Table(
                name="orders",
                row_count=8,
                columns=[
                    Column(
                        name="id",
                        semantic_type="id",
                        dtype="int",
                        generator=SequenceGenerator(kind="sequence", start=1),
                        pk=True,
                    ),
                    Column(
                        name="customer_id",
                        semantic_type="id",
                        dtype="int",
                        generator=SequenceGenerator(kind="sequence", start=1),
                    ),
                    Column(
                        name="total_amount",
                        semantic_type="money",
                        dtype="float",
                        generator=NumericGenerator(
                            kind="numeric", dist="uniform", min_val=50.0, max_val=400.0
                        ),
                    ),
                ],
            ),
        ],
    )


def test_t05a_invoice_order_linkage():
    """T-05a: Invoices derive directly from relational orders; totals and customer names agree."""
    ds = _make_ecom_world_dataset()
    tabular_data = {
        "customers": [
            {"id": 1, "name": "Alice Cooper"},
            {"id": 2, "name": "Bob Martin"},
        ],
        "orders": [
            {"id": 1, "customer_id": 1, "total_amount": 250.0, "order_date": "2026-10-01"},
            {"id": 2, "customer_id": 2, "total_amount": 175.50, "order_date": "2026-10-05"},
        ],
    }

    invoices, _ = generate_linked_world(ds, tabular_data, seed=ds.seed)
    assert len(invoices) == 2

    # Check Invoice 1
    inv1 = invoices[0]
    assert inv1.total == Decimal("250.00")
    assert inv1.buyer_name == "Alice Cooper"
    assert inv1.seller_name == "Nexus Supply Corp"
    assert inv1.issue_date == "2026-10-01"
    assert inv1.due_date == "2026-10-31"  # 30 days terms
    # Reconciling line items and taxes
    assert inv1.subtotal + inv1.tax_total == inv1.total


def test_t05b_payment_statement_linkage():
    """T-05b: Customer statement contains matching debit posted between issue and due date."""
    ds = _make_ecom_world_dataset()
    tabular_data = {
        "customers": [
            {"id": 1, "name": "Alice Cooper"},
        ],
        "orders": [
            {"id": 1, "customer_id": 1, "total_amount": 320.0, "order_date": "2026-10-01"},
        ],
    }

    invoices, statements = generate_linked_world(ds, tabular_data, seed=ds.seed)
    assert len(invoices) == 1
    assert len(statements) == 1

    inv = invoices[0]
    stmt = statements[0]
    assert stmt.holder_name == "Alice Cooper"
    assert stmt.bank_name == "Global Capital Trust"

    # Find the matching debit transaction on statement
    matched_debits = [
        tx for tx in stmt.transactions
        if inv.number in tx.description and tx.debit == inv.total
    ]
    assert len(matched_debits) == 1
    tx = matched_debits[0]

    # Date must be inside [issue_date, due_date]
    assert inv.issue_date <= tx.date <= inv.due_date
    assert tx.description == f"Nexus Supply Corp INV {inv.number}"
    assert tx.mcc == "5311"


def test_t08a_query_dsl_validation_and_contradiction():
    """T-08a: Query DSL rejects contradictory sets with DSL_UNSATISFIABLE (RT-03)."""
    # Valid query
    valid_q = DSLQuery(
        period=DSLPeriod(days=90),
        constraints=[
            DSLConstraint(field="running_balance", op=">=", value="500.00"),
            DSLConstraint(field="running_balance", op="<=", value="10000.00"),
        ],
    )
    is_valid, err = validate_query_dsl(valid_q)
    assert is_valid is True
    assert err is None

    # Contradictory query: balance > 500 AND balance < 100
    contradictory_q = DSLQuery(
        period=DSLPeriod(days=90),
        constraints=[
            DSLConstraint(field="running_balance", op=">", value="500.00"),
            DSLConstraint(field="running_balance", op="<", value="100.00"),
        ],
    )
    is_valid, err = validate_query_dsl(contradictory_q)
    assert is_valid is False
    assert err == "DSL_UNSATISFIABLE"


def test_t08b_t08c_satisfaction_by_construction_and_evidence():
    """T-08b & T-08c: Statements satisfy running_balance constraints by construction."""
    query = DSLQuery(
        period=DSLPeriod(days=60),
        constraints=[
            DSLConstraint(field="running_balance", op=">=", value="800.00"),
        ],
        min_transactions=15,
    )

    stmt, evidence = generate_statement_from_dsl(query, seed=42)
    assert evidence.satisfied is True
    assert evidence.min_balance >= Decimal("800.00")
    assert evidence.min_balance_date != ""

    # Verify every transaction's running balance >= 800.00
    for tx in stmt.transactions:
        assert tx.balance >= Decimal("800.00"), f"Balance {tx.balance} < 800.00"

    # Verify running balance arithmetic integrity
    curr = stmt.opening_balance
    for tx in stmt.transactions:
        curr = curr + tx.credit - tx.debit
        assert tx.balance == curr
    assert stmt.closing_balance == curr
