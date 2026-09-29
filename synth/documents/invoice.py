"""Invoice generation with exact Decimal arithmetic and locale tax calculation.

Reference: PRD FR-06, TRD §6.1, T-06a to T-06d, RT-11, RT-16, RT-17.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal
from typing import TYPE_CHECKING

from synth.documents.models import InvoiceDoc, InvoiceLine
from synth.locales.pack import get_locale_pack

if TYPE_CHECKING:
    from synth.ir.models import Dataset

ROUND_2 = Decimal("0.01")
INVOICE_TEMPLATES = ["classic", "modern", "minimal"]

# Default product catalog for line items
SAMPLE_CATALOG = [
    ("SKU-101", "Cloud Computing Unit (Tier A)", Decimal("49.99")),
    ("SKU-102", "Developer API Seat License", Decimal("29.50")),
    ("SKU-103", "Data Storage Block 100GB", Decimal("15.00")),
    ("SKU-104", "Enterprise Support Retainer", Decimal("199.00")),
    ("SKU-105", "Automated Security Audit Report", Decimal("85.00")),
    ("SKU-106", "Data Transfer Bandwidth (1TB)", Decimal("40.00")),
]


def _round_money(val: Decimal) -> Decimal:
    return val.quantize(ROUND_2, rounding=ROUND_HALF_UP)


def generate_invoice(
    index: int = 1,
    locale: str = "en_US",
    template_id: str = "classic",
    buyer_name: str = "Acme Technologies LLC",
    buyer_address: str = "100 Innovation Way, Suite 400",
    seller_name: str = "Apex Synthetics Corp.",
    seller_address: str = "42 Silicon Blvd, Suite 100",
    recipe_hash: str = "000000000000",
    item_count: int = 3,
    issue_date: str = "2024-10-15",
    payment_terms_days: int = 30,
) -> InvoiceDoc:
    """Generate a single mathematically-coherent InvoiceDoc."""
    if template_id not in INVOICE_TEMPLATES:
        template_id = "classic"

    locale_pack = get_locale_pack(locale)
    doc_number = f"SYN-INV-{1000 + index:04d}"

    # Calculate due date from issue date
    try:
        dt = datetime.strptime(issue_date, "%Y-%m-%d")
        due_dt = dt + timedelta(days=payment_terms_days)
        due_date = due_dt.strftime("%Y-%m-%d")
    except ValueError:
        due_date = "2024-11-15"

    lines: list[InvoiceLine] = []
    subtotal = Decimal("0.00")

    count = max(1, min(item_count, len(SAMPLE_CATALOG)))
    for j in range(count):
        cat_item = SAMPLE_CATALOG[(index + j) % len(SAMPLE_CATALOG)]
        sku = cat_item[0]
        desc = cat_item[1]
        unit_price = _round_money(cat_item[2])
        qty = ((index + j) % 4) + 1
        line_amount = _round_money(Decimal(qty) * unit_price)
        subtotal += line_amount

        lines.append(
            InvoiceLine(
                sku=sku,
                description=desc,
                qty=qty,
                unit_price=unit_price,
                tax_code="STANDARD",
                amount=line_amount,
            )
        )

    subtotal = _round_money(subtotal)
    discount = Decimal("0.00")
    taxable_base = _round_money(subtotal - discount)
    tax_lines, tax_total = locale_pack.compute_tax_lines(taxable_base)
    grand_total = _round_money(taxable_base + tax_total)

    # Invariant verification (Conv.)
    assert subtotal == sum(line.amount for line in lines), "Invoice subtotal invariant broken"
    assert grand_total == taxable_base + tax_total, "Invoice grand total invariant broken"

    return InvoiceDoc(
        number=doc_number,
        issue_date=issue_date,
        due_date=due_date,
        seller_name=seller_name,
        seller_address=seller_address,
        buyer_name=buyer_name,
        buyer_address=buyer_address,
        lines=lines,
        tax_lines=tax_lines,
        subtotal=subtotal,
        discount=discount,
        tax_total=tax_total,
        total=grand_total,
        currency=locale_pack.currency,
        locale=locale,
        template_id=template_id,
        recipe_hash=recipe_hash[:12],
    )


def generate_invoices_from_dataset(
    dataset: Dataset,
    count: int = 10,
    recipe_hash: str = "000000000000",
) -> list[InvoiceDoc]:
    """Generate invoice documents aligned with the dataset recipe configuration."""
    locale = dataset.locale
    seller_name = "Apex Global Corp."
    seller_address = "100 Synthetics Way"
    terms = 30
    if dataset.world:
        seller_name = dataset.world.seller_name
        seller_address = dataset.world.seller_address
        terms = dataset.world.payment_terms_days

    # Look for DocumentSpec template_id
    template_id = "classic"
    for doc_spec in dataset.documents:
        if doc_spec.kind == "invoice":
            template_id = doc_spec.template_id
            break

    invoices = []
    for i in range(1, count + 1):
        inv = generate_invoice(
            index=i,
            locale=locale,
            template_id=template_id,
            buyer_name=f"Customer Enterprise {i}",
            buyer_address=f"{100 + i} Commercial Way, Suite {i}",
            seller_name=seller_name,
            seller_address=seller_address,
            recipe_hash=recipe_hash,
            item_count=(i % 3) + 2,
            issue_date="2024-10-01",
            payment_terms_days=terms,
        )
        invoices.append(inv)
    return invoices