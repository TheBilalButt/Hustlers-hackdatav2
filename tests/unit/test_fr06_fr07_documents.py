"""Tests for FR-06 (Invoices), FR-07 (Bank statements), and FR-17 (Watermark & Provenance).

Covers T-06a to T-06d, T-07a to T-07c, T-17a to T-17d, RT-28, RT-29.
"""

from __future__ import annotations

import io
import zipfile
from decimal import Decimal

import httpx
import pytest

from api.index import app
from synth.documents.invoice import INVOICE_TEMPLATES, generate_invoice
from synth.documents.models import InvoiceDoc, StatementDoc
from synth.documents.render_pdf import render_invoice_pdf, render_statement_pdf
from synth.documents.statement import STATEMENT_TEMPLATES, generate_statement
from synth.locales.pack import get_locale_pack


def test_t06a_invoice_exact_decimal_arithmetic():
    """T-06a: Invoice line totals, tax lines, and grand total reconcile exactly in Decimal."""
    for loc in ["en_US", "en_IN", "de_DE"]:
        inv = generate_invoice(index=5, locale=loc, item_count=4)
        assert isinstance(inv, InvoiceDoc)
        # 1. Subtotal equals sum of line amounts
        assert inv.subtotal == sum(item.amount for item in inv.lines)
        # 2. Tax total equals sum of tax lines
        assert inv.tax_total == sum(t.amount for t in inv.tax_lines)
        # 3. Grand total equals subtotal - discount + tax_total
        assert inv.total == inv.subtotal - inv.discount + inv.tax_total
        assert inv.number.startswith("SYN-INV-")


def test_t06b_tax_per_locale():
    """T-06b: Tax calculations strictly match locale rules (US Sales Tax, IN CGST/SGST, DE MwSt)."""
    subtotal = Decimal("1000.00")

    # en_US: 8% sales tax -> $80.00
    us_pack = get_locale_pack("en_US")
    us_lines, us_tax = us_pack.compute_tax_lines(subtotal)
    assert len(us_lines) == 1
    assert us_tax == Decimal("80.00")

    # en_IN: 9% CGST + 9% SGST = 18% GST -> 2 tax lines, Rs. 180.00
    in_pack = get_locale_pack("en_IN")
    in_lines, in_tax = in_pack.compute_tax_lines(subtotal)
    assert len(in_lines) == 2
    assert in_lines[0].rate == Decimal("0.09")
    assert in_lines[1].rate == Decimal("0.09")
    assert in_tax == Decimal("180.00")

    # de_DE: 19% MwSt -> 190.00 EUR
    de_pack = get_locale_pack("de_DE")
    de_lines, de_tax = de_pack.compute_tax_lines(subtotal)
    assert len(de_lines) == 1
    assert de_tax == Decimal("190.00")


def test_t06c_locale_formatting():
    """T-06c: Formatting follows regional currency, lakh grouping, and date conventions."""
    amount = Decimal("123456.78")

    us_pack = get_locale_pack("en_US")
    assert us_pack.format_currency(amount) == "$123,456.78"
    assert us_pack.format_date("2024-10-15") == "Oct 15, 2024"

    in_pack = get_locale_pack("en_IN")
    # Lakh grouping: 1,23,456.78
    assert in_pack.format_currency(amount) == "Rs. 1,23,456.78"
    assert in_pack.format_date("2024-10-15") == "15 Oct 2024"

    de_pack = get_locale_pack("de_DE")
    # German format: 123.456,78 EUR
    assert de_pack.format_currency(amount) == "123.456,78 EUR"
    assert de_pack.format_date("2024-10-15") == "15.10.2024"


def test_t06d_invoice_template_count():
    """T-06d: At least 3 distinct invoice templates are supported."""
    assert len(INVOICE_TEMPLATES) >= 3
    for t_id in INVOICE_TEMPLATES:
        inv = generate_invoice(index=1, template_id=t_id)
        pdf_bytes, gt = render_invoice_pdf(inv)
        assert len(pdf_bytes) > 500
        assert "bounding_boxes" in gt


def test_t07a_statement_running_balance_and_mcc():
    """T-07a & T-07b: Running balance is mathematically exact; MCC codes are present."""
    stmt = generate_statement(index=2, opening_balance=Decimal("2000.00"), tx_count=6)
    assert isinstance(stmt, StatementDoc)
    assert stmt.number.startswith("SYN-STM-")

    # Verify step-by-step running balance
    curr = stmt.opening_balance
    for tx in stmt.transactions:
        assert len(tx.mcc) == 4, f"Invalid MCC code: {tx.mcc}"
        curr = curr + tx.credit - tx.debit
        assert tx.balance == curr, "Running balance mismatch"

    # Verify closing balance
    total_credits = sum(t.credit for t in stmt.transactions)
    total_debits = sum(t.debit for t in stmt.transactions)
    assert stmt.closing_balance == stmt.opening_balance + total_credits - total_debits


def test_t07c_statement_template_count():
    """T-07c: At least 3 distinct bank statement templates are supported."""
    assert len(STATEMENT_TEMPLATES) >= 3
    for t_id in STATEMENT_TEMPLATES:
        stmt = generate_statement(index=1, template_id=t_id)
        pdf_bytes, gt = render_statement_pdf(stmt)
        assert len(pdf_bytes) > 500
        assert "bounding_boxes" in gt


def test_t17a_t17b_watermark_metadata_and_unconditional_enforcement():
    """T-17a, T-17b, RT-28, RT-29: Watermarks and metadata cannot be disabled."""
    inv = generate_invoice(index=1, recipe_hash="abcdef123456")

    # Attempt to disable watermark (must be ignored per TRD §8.3, RT-28)
    pdf_bytes, _ = render_invoice_pdf(inv, disable_watermark=True)

    # Extract all text including compressed streams
    import zlib
    decompressed = []
    start = 0
    while True:
        idx = pdf_bytes.find(b"stream", start)
        if idx == -1:
            break
        end_idx = pdf_bytes.find(b"endstream", idx)
        if end_idx == -1:
            break
        chunk = pdf_bytes[idx + 6 : end_idx].strip()
        try:
            decompressed.append(zlib.decompress(chunk).decode("latin-1", errors="ignore"))
        except Exception:
            decompressed.append(chunk.decode("latin-1", errors="ignore"))
        start = end_idx + 9
    pdf_str = " ".join(decompressed) + " " + pdf_bytes.decode("latin-1", errors="ignore")

    # 1. Watermark present
    assert "SYNTHETIC" in pdf_str
    # 2. Metadata present
    assert "Synthetic=true" in pdf_str
    assert "abcdef123456" in pdf_str
    # 3. Document number has SYN- prefix
    assert "SYN-INV-" in pdf_str


@pytest.mark.asyncio
async def test_api_documents_export():
    """Verify POST /api/documents returns valid ZIP archive with PDFs and ground truth."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Invoice document generation
        resp = await client.post("/api/documents", json={"kind": "invoice", "count": 2})
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/zip"

        zf = zipfile.ZipFile(io.BytesIO(resp.content))
        names = zf.namelist()
        assert "ground_truth.part.jsonl" in names
        assert any(n.startswith("documents/SYN-INV-") for n in names)

        # 2. Statement document generation
        resp_stmt = await client.post("/api/documents", json={"kind": "statement", "count": 2})
        assert resp_stmt.status_code == 200
        zf_stmt = zipfile.ZipFile(io.BytesIO(resp_stmt.content))
        names_stmt = zf_stmt.namelist()
        assert any(n.startswith("documents/SYN-STM-") for n in names_stmt)

        # 3. Exceeding max limit (50) returns LIMIT_DOCS
        resp_over = await client.post("/api/documents", json={"kind": "invoice", "count": 55})
        assert resp_over.status_code == 400
        data_over = resp_over.json()
        assert data_over.get("code") == "LIMIT_DOCS"