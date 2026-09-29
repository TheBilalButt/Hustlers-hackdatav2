"""Bank statement generation with exact running balance invariants and MCC codes.

Reference: PRD FR-07, TRD §6.2, T-07a to T-07c, RT-12.
"""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal
from typing import TYPE_CHECKING

from synth.documents.models import StatementDoc, Transaction

if TYPE_CHECKING:
    from synth.ir.models import Dataset

ROUND_2 = Decimal("0.01")
STATEMENT_TEMPLATES = ["bank", "summary", "tabular"]

# Sample transaction templates with ISO 18245 MCC codes
SAMPLE_TRANSACTIONS = [
    ("Direct Deposit - Payroll Acme Corp", "7361", Decimal("0.00"), Decimal("3200.00")),
    ("Synthetic Electric & Utility AutoPay", "4900", Decimal("124.50"), Decimal("0.00")),
    ("FreshGroceries Supermarket #412", "5411", Decimal("86.20"), Decimal("0.00")),
    ("Metro Transit Monthly Pass", "4111", Decimal("75.00"), Decimal("0.00")),
    ("CloudSync Software Subscription", "7372", Decimal("29.00"), Decimal("0.00")),
    ("BeanCraft Artisan Coffee", "5814", Decimal("6.75"), Decimal("0.00")),
    ("Corner Pharmacy Prescriptions", "5912", Decimal("34.10"), Decimal("0.00")),
    ("Online Marketplace Order #SYN", "5311", Decimal("112.40"), Decimal("0.00")),
    ("Interest Credit - Savings Account", "6012", Decimal("0.00"), Decimal("8.45")),
]


def _round_money(val: Decimal) -> Decimal:
    return val.quantize(ROUND_2, rounding=ROUND_HALF_UP)


def generate_statement(
    index: int = 1,
    locale: str = "en_US",
    template_id: str = "bank",
    holder_name: str = "Morgan Stanley Reed",
    bank_name: str = "First Synthetic Reserve Bank",
    opening_balance: Decimal = Decimal("2450.00"),
    recipe_hash: str = "000000000000",
    period_from: str = "2024-09-01",
    period_to: str = "2024-09-30",
    tx_count: int = 8,
) -> StatementDoc:
    """Generate a single StatementDoc satisfying running balance invariants."""
    if template_id not in STATEMENT_TEMPLATES:
        template_id = "bank"

    doc_number = f"SYN-STM-{2000 + index:04d}"
    running_balance = _round_money(opening_balance)
    transactions: list[Transaction] = []

    count = max(2, min(tx_count, 15))
    day_step = max(1, 28 // count)

    for step in range(count):
        tx_template = SAMPLE_TRANSACTIONS[(index + step) % len(SAMPLE_TRANSACTIONS)]
        desc, mcc, debit, credit = tx_template
        debit = _round_money(debit)
        credit = _round_money(credit)

        running_balance = _round_money(running_balance + credit - debit)
        day = min(1 + step * day_step, 28)
        tx_date = f"2024-09-{day:02d}"

        transactions.append(
            Transaction(
                date=tx_date,
                description=desc,
                mcc=mcc,
                debit=debit,
                credit=credit,
                balance=running_balance,
            )
        )

    closing_balance = running_balance

    # Invariant verification (Conv.)
    total_debits = sum(t.debit for t in transactions)
    total_credits = sum(t.credit for t in transactions)
    expected_closing = _round_money(opening_balance + total_credits - total_debits)
    assert closing_balance == expected_closing, "Statement closing balance invariant broken"

    return StatementDoc(
        number=doc_number,
        bank_name=bank_name,
        holder_name=holder_name,
        period_from=period_from,
        period_to=period_to,
        opening_balance=_round_money(opening_balance),
        transactions=transactions,
        closing_balance=closing_balance,
        template_id=template_id,
        recipe_hash=recipe_hash[:12],
    )


def generate_statements_from_dataset(
    dataset: Dataset,
    count: int = 10,
    recipe_hash: str = "000000000000",
) -> list[StatementDoc]:
    """Generate bank statements aligned with the dataset recipe configuration."""
    locale = dataset.locale
    bank_name = "First Synthetic Reserve Bank"
    if dataset.world:
        bank_name = dataset.world.bank_name

    template_id = "bank"
    for doc_spec in dataset.documents:
        if doc_spec.kind == "statement":
            template_id = doc_spec.template_id
            break

    statements = []
    for i in range(1, count + 1):
        stmt = generate_statement(
            index=i,
            locale=locale,
            template_id=template_id,
            holder_name=f"Account Holder {i}",
            bank_name=bank_name,
            opening_balance=Decimal("1500.00") + Decimal(i * 125),
            recipe_hash=recipe_hash,
            period_from="2024-09-01",
            period_to="2024-09-30",
            tx_count=8,
        )
        statements.append(stmt)
    return statements