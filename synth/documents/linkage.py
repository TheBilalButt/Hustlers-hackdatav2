"""One-world linkage engine connecting relational tables with documents (FR-05).

Ensures that the same customer, order, and payment appear consistently
across relational tables, invoices, and bank account statements.
Reference: TRD §6.3, PRD FR-05, T-05a, T-05b.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal
from typing import TYPE_CHECKING, Any

from synth.documents.models import InvoiceDoc, InvoiceLine, StatementDoc, Transaction
from synth.engines.seeds import STREAM_DOCUMENTS, make_generator
from synth.locales.pack import get_locale_pack

if TYPE_CHECKING:
    from synth.ir.models import Dataset

ROUND_2 = Decimal("0.01")


def generate_linked_world(
    dataset: Dataset,
    tabular_data: dict[str, list[dict[str, Any]]],
    seed: int = 42,
) -> tuple[list[InvoiceDoc], list[StatementDoc]]:
    """Generate linked invoices and statements strictly reconciled with relational data (FR-05)."""
    rng = make_generator(seed, 0, STREAM_DOCUMENTS, 0)

    # 1. World configuration
    world = dataset.world
    seller_name = getattr(world, "seller_name", "Acme Trading Co.") if world else "Acme Trading Co."
    seller_address = (
        getattr(world, "seller_address", "42 Innovation Drive, Techville")
        if world
        else "42 Innovation Drive, Techville"
    )
    bank_name = (
        getattr(world, "bank_name", "First Synthetic Bank")
        if world
        else "First Synthetic Bank"
    )
    payment_terms_days = getattr(world, "payment_terms_days", 30) if world else 30

    # 2. Identify tables
    cust_table = next(
        (t for t in dataset.tables if "customer" in t.name or "user" in t.name),
        dataset.tables[0],
    )
    order_table = next(
        (t for t in dataset.tables if "order" in t.name or "invoice" in t.name),
        dataset.tables[-1],
    )

    cust_rows = tabular_data.get(cust_table.name, [])
    order_rows = tabular_data.get(order_table.name, [])

    cust_pk_name = cust_table.primary_key if hasattr(cust_table, "primary_key") else "id"
    cust_map = {str(r.get(cust_pk_name, "")): r for r in cust_rows}

    # Find FK in order table that refers to customer
    order_col_names = [c.name for c in order_table.columns]
    order_fk_col = "customer_id" if "customer_id" in order_col_names else "user_id"
    if order_fk_col not in order_col_names:
        order_fk_col = next((c for c in order_col_names if "id" in c and c != "id"), "id")

    locale_pack = get_locale_pack(dataset.locale)
    invoices: list[InvoiceDoc] = []
    customer_payments: dict[str, list[dict[str, Any]]] = {cid: [] for cid in cust_map}

    # 3. Build invoices from orders
    for idx, order in enumerate(order_rows, start=1):
        cust_id = str(order.get(order_fk_col, ""))
        customer = cust_map.get(cust_id, cust_rows[0] if cust_rows else {})

        raw_amt = order.get("total_amount") or order.get("amount") or order.get("total") or 150.00
        order_total = Decimal(str(raw_amt)).quantize(ROUND_2, rounding=ROUND_HALF_UP)

        order_dt_str = str(
            order.get("created_at")
            or order.get("order_date")
            or order.get("date")
            or "2026-10-01"
        )
        try:
            issue_dt = datetime.fromisoformat(order_dt_str.split("T")[0])
        except Exception:
            issue_dt = datetime(2026, 10, 1)

        due_dt = issue_dt + timedelta(days=payment_terms_days)
        inv_number = f"SYN-INV-{seed}-{idx:04d}"

        # Line items and tax decomposition reconciling to order_total
        tax_rate = (
            Decimal("0.08")
            if dataset.locale == "en_US"
            else (Decimal("0.18") if dataset.locale == "en_IN" else Decimal("0.19"))
        )
        subtotal = (order_total / (Decimal("1.0") + tax_rate)).quantize(
            ROUND_2, rounding=ROUND_HALF_UP
        )
        tax_lines, tax_total = locale_pack.compute_tax_lines(subtotal)
        subtotal = order_total - tax_total

        line = InvoiceLine(
            sku=f"SKU-{idx:03d}",
            description=f"Synthetic Order Item #{idx}",
            qty=1,
            unit_price=subtotal,
            tax_code="STANDARD",
            amount=subtotal,
        )

        buyer_name = customer.get("name") or customer.get("full_name") or f"Customer {cust_id}"
        buyer_address = customer.get("address") or customer.get("city") or "100 Innovation Park"

        inv = InvoiceDoc(
            number=inv_number,
            issue_date=issue_dt.strftime("%Y-%m-%d"),
            due_date=due_dt.strftime("%Y-%m-%d"),
            seller_name=seller_name,
            seller_address=seller_address,
            buyer_name=buyer_name,
            buyer_address=str(buyer_address),
            lines=[line],
            tax_lines=tax_lines,
            subtotal=subtotal,
            discount=Decimal("0.00"),
            tax_total=tax_total,
            total=order_total,
            currency=locale_pack.currency,
            locale=dataset.locale,
            template_id="classic",
            recipe_hash=f"{seed:012x}"[:12],
        )
        invoices.append(inv)

        # 4. Schedule linked payment on customer statement
        pay_offset = rng.integers(0, payment_terms_days)
        payment_dt = issue_dt + timedelta(days=int(pay_offset))

        if cust_id in customer_payments:
            customer_payments[cust_id].append({
                "date": payment_dt.strftime("%Y-%m-%d"),
                "description": f"{seller_name} INV {inv.number}",
                "mcc": "5311",
                "debit": order_total,
                "credit": Decimal("0.00"),
            })

    # 5. Build Statements for customers with linked debits
    statements: list[StatementDoc] = []

    for c_idx, (cust_id, payments) in enumerate(customer_payments.items(), start=1):
        if not payments:
            continue
        customer = cust_map.get(cust_id, {})
        holder_name = customer.get("name") or customer.get("full_name") or f"Customer {cust_id}"

        payments.sort(key=lambda p: p["date"])
        start_date = payments[0]["date"]
        end_date = payments[-1]["date"]

        deposit_amt = (sum(p["debit"] for p in payments) + Decimal("1500.00")).quantize(
            ROUND_2, rounding=ROUND_HALF_UP
        )
        all_txns: list[dict[str, Any]] = list(payments)
        deposit_date = start_date
        all_txns.append({
            "date": deposit_date,
            "description": "Direct Deposit - Payroll",
            "mcc": "6012",
            "debit": Decimal("0.00"),
            "credit": deposit_amt,
        })
        all_txns.sort(key=lambda t: t["date"])

        opening_balance = Decimal("2500.00")
        running_bal = opening_balance
        tx_models: list[Transaction] = []

        for t in all_txns:
            running_bal = (running_bal + t["credit"] - t["debit"]).quantize(
                ROUND_2, rounding=ROUND_HALF_UP
            )
            tx_models.append(
                Transaction(
                    date=t["date"],
                    description=t["description"],
                    mcc=t["mcc"],
                    debit=t["debit"],
                    credit=t["credit"],
                    balance=running_bal,
                )
            )

        closing_balance = running_bal

        stmt = StatementDoc(
            number=f"SYN-STM-{seed}-{c_idx:04d}",
            bank_name=bank_name,
            holder_name=holder_name,
            period_from=start_date,
            period_to=end_date,
            opening_balance=opening_balance,
            transactions=tx_models,
            closing_balance=closing_balance,
            template_id="bank",
            recipe_hash=f"{seed:012x}"[:12],
        )
        statements.append(stmt)

    return invoices, statements
