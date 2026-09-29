"""Programmatic PDF rendering with fpdf2, mandatory watermarks, and metadata.

Reference: PRD FR-06, FR-07, FR-17, TRD §6.5, RT-28, RT-29.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from fpdf import FPDF

from synth.locales.pack import get_locale_pack

if TYPE_CHECKING:
    from synth.documents.models import InvoiceDoc, StatementDoc


class SyntheticDocPDF(FPDF):
    """FPDF subclass enforcing mandatory diagonal watermarks and synthetic metadata."""

    def __init__(self, recipe_hash: str = "000000000000", **kwargs: Any) -> None:
        super().__init__(**kwargs)
        self.recipe_hash = recipe_hash[:12]
        self.field_boxes: dict[str, list[float]] = {}

    def header(self) -> None:
        """Stamp mandatory diagonal watermark across every page (TRD §6.5, FR-17)."""
        self.set_font("Helvetica", "B", 22)
        self.set_text_color(225, 225, 225)
        with self.rotation(45, x=105, y=148):
            self.text(x=15, y=148, text="SYNTHETIC -- NOT A REAL DOCUMENT")
        # Reset color
        self.set_text_color(0, 0, 0)

    def footer(self) -> None:
        """Mandatory provenance footer on every page (TRD §6.5, FR-17)."""
        self.set_y(-14)
        self.set_font("Helvetica", size=7.5)
        self.set_text_color(130, 130, 130)
        footer_text = (
            f"Synthetic document * recipe {self.recipe_hash} * "
            "not valid for any financial or legal purpose"
        )
        self.cell(0, 10, footer_text, align="C")

    def track_box(self, name: str, x: float, y: float, w: float, h: float) -> None:
        """Track field bounding boxes for ground truth export."""
        self.field_boxes[name] = [
            float(self.page_no()),
            round(x, 2),
            round(y, 2),
            round(w, 2),
            round(h, 2),
        ]


def render_invoice_pdf(
    invoice: InvoiceDoc,
    disable_watermark: bool = False,  # Ignored by design (RT-28, RT-29)
) -> tuple[bytes, dict[str, Any]]:
    """Render InvoiceDoc to PDF bytes using fpdf2 and return (bytes, ground_truth)."""
    pdf = SyntheticDocPDF(recipe_hash=invoice.recipe_hash)
    pdf.set_title(f"Invoice {invoice.number}")
    pdf.set_author("HackDataV2 Synthetic Data Platform")
    pdf.set_subject("Synthetic Document (Synthetic=true)")
    pdf.set_keywords(f"Synthetic=true, RecipeHash={invoice.recipe_hash}, Generator=HackDataV2")

    pdf.add_page()
    locale_pack = get_locale_pack(invoice.locale)
    fmt_currency = locale_pack.format_currency
    fmt_date = locale_pack.format_date

    valid_templates = ("classic", "modern", "minimal")
    template = invoice.template_id if invoice.template_id in valid_templates else "classic" 

    if template == "modern":
        # Modern: colored header banner
        pdf.set_fill_color(30, 41, 59)
        pdf.rect(x=10, y=10, w=190, h=25, style="F")
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("Helvetica", "B", 18)
        pdf.set_xy(16, 17)
        pdf.cell(100, 10, "INVOICE", align="L")
        pdf.set_font("Helvetica", size=10)
        pdf.set_xy(110, 17)
        pdf.cell(84, 10, f"No: {invoice.number}", align="R")
        pdf.track_box("number", 110, 17, 84, 10)
        pdf.set_text_color(0, 0, 0)
        pdf.set_y(40)
    elif template == "minimal":
        # Minimal: monochrome clean title
        pdf.set_font("Helvetica", "B", 20)
        pdf.set_xy(14, 16)
        pdf.cell(100, 10, "INVOICE")
        pdf.set_font("Helvetica", size=9)
        pdf.set_xy(110, 16)
        pdf.cell(86, 10, invoice.number, align="R")
        pdf.track_box("number", 110, 16, 86, 10)
        pdf.line(14, 28, 196, 28)
        pdf.set_y(34)
    else:
        # Classic: Traditional top layout
        pdf.set_font("Helvetica", "B", 22)
        pdf.set_xy(14, 16)
        pdf.cell(100, 10, "INVOICE")
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_xy(110, 16)
        pdf.cell(86, 6, f"Invoice #: {invoice.number}", align="R")
        pdf.track_box("number", 110, 16, 86, 6)
        pdf.set_font("Helvetica", size=9)
        pdf.set_xy(110, 22)
        pdf.cell(86, 6, f"Issue Date: {fmt_date(invoice.issue_date)}", align="R")
        pdf.set_xy(110, 28)
        pdf.cell(86, 6, f"Due Date: {fmt_date(invoice.due_date)}", align="R")
        pdf.set_y(40)

    # Seller & Buyer block
    curr_y = pdf.get_y()
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_xy(14, curr_y)
    pdf.cell(85, 5, "From / Seller:")
    pdf.set_xy(110, curr_y)
    pdf.cell(86, 5, "Bill To / Buyer:")

    pdf.set_font("Helvetica", size=9)
    pdf.set_xy(14, curr_y + 5)
    pdf.cell(85, 5, invoice.seller_name)
    pdf.set_xy(110, curr_y + 5)
    pdf.cell(86, 5, invoice.buyer_name)

    pdf.set_xy(14, curr_y + 10)
    pdf.cell(85, 5, invoice.seller_address)
    pdf.set_xy(110, curr_y + 10)
    pdf.cell(86, 5, invoice.buyer_address)

    # Line Items Table
    table_y = curr_y + 24
    pdf.set_xy(14, table_y)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(241, 245, 249)
    pdf.cell(24, 7, "SKU", border=1, fill=True)
    pdf.cell(86, 7, "Description", border=1, fill=True)
    pdf.cell(18, 7, "Qty", border=1, align="C", fill=True)
    pdf.cell(26, 7, "Unit Price", border=1, align="R", fill=True)
    pdf.cell(28, 7, "Amount", border=1, align="R", fill=True)
    pdf.ln()

    pdf.set_font("Helvetica", size=8.5)
    for idx, line in enumerate(invoice.lines):
        row_fill = (idx % 2 == 1)
        if row_fill:
            pdf.set_fill_color(248, 250, 252)
        pdf.set_x(14)
        pdf.cell(24, 6, line.sku, border="B", fill=row_fill)
        pdf.cell(86, 6, line.description, border="B", fill=row_fill)
        pdf.cell(18, 6, str(line.qty), border="B", align="C", fill=row_fill)
        pdf.cell(26, 6, fmt_currency(line.unit_price), border="B", align="R", fill=row_fill)
        pdf.cell(28, 6, fmt_currency(line.amount), border="B", align="R", fill=row_fill)
        pdf.ln()

    # Totals block
    pdf.ln(4)
    totals_y = pdf.get_y()
    left_x = 110

    pdf.set_font("Helvetica", size=9)
    pdf.set_xy(left_x, totals_y)
    pdf.cell(58, 6, "Subtotal:", align="R")
    pdf.cell(28, 6, fmt_currency(invoice.subtotal), align="R")

    line_offset = 6
    for tax_line in invoice.tax_lines:
        pdf.set_xy(left_x, totals_y + line_offset)
        pdf.cell(58, 6, f"{tax_line.label}:", align="R")
        pdf.cell(28, 6, fmt_currency(tax_line.amount), align="R")
        line_offset += 6

    # Grand Total
    pdf.set_xy(left_x, totals_y + line_offset)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_fill_color(241, 245, 249)
    pdf.cell(58, 8, f"Total ({invoice.currency}):", border="T", fill=True, align="R")
    pdf.cell(28, 8, fmt_currency(invoice.total), border="T", fill=True, align="R")
    pdf.track_box("total", left_x, totals_y + line_offset, 86, 8)

    pdf_bytes = bytes(pdf.output())
    ground_truth = {
        "document_number": invoice.number,
        "issue_date": invoice.issue_date,
        "total": str(invoice.total),
        "currency": invoice.currency,
        "bounding_boxes": pdf.field_boxes,
    }
    return pdf_bytes, ground_truth


def render_statement_pdf(
    statement: StatementDoc,
    disable_watermark: bool = False,  # Ignored by design (RT-28, RT-29)
) -> tuple[bytes, dict[str, Any]]:
    """Render StatementDoc to PDF bytes using fpdf2 and return (bytes, ground_truth)."""
    pdf = SyntheticDocPDF(recipe_hash=statement.recipe_hash)
    pdf.set_title(f"Statement {statement.number}")
    pdf.set_author("HackDataV2 Synthetic Data Platform")
    pdf.set_subject("Synthetic Document (Synthetic=true)")
    pdf.set_keywords(f"Synthetic=true, RecipeHash={statement.recipe_hash}, Generator=HackDataV2")

    pdf.add_page()
    locale_pack = get_locale_pack("en_US")
    fmt_currency = locale_pack.format_currency

    valid_stmt_templates = ("bank", "summary", "tabular")
    stmt_template = (
        statement.template_id if statement.template_id in valid_stmt_templates else "bank"
    )
    header_fill = (240, 244, 250) if stmt_template == "bank" else (245, 245, 245)

    # Header
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_xy(14, 16)
    pdf.cell(110, 8, statement.bank_name)
    pdf.set_font("Helvetica", size=9)
    pdf.set_xy(110, 16)
    pdf.cell(86, 6, f"Statement: {statement.number}", align="R")
    pdf.track_box("number", 110, 16, 86, 6)

    pdf.set_xy(110, 22)
    pdf.cell(86, 6, f"Period: {statement.period_from} to {statement.period_to}", align="R")

    # Account holder
    pdf.set_xy(14, 28)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(100, 5, "Account Holder:")
    pdf.set_xy(14, 33)
    pdf.set_font("Helvetica", size=9)
    pdf.cell(100, 5, statement.holder_name)

    # Balance summary cards
    pdf.set_fill_color(*header_fill)
    card_y = 44
    pdf.set_xy(14, card_y)
    pdf.set_fill_color(248, 250, 252)
    pdf.set_font("Helvetica", size=8.5)

    open_txt = f"Opening Balance: {fmt_currency(statement.opening_balance)}"
    pdf.cell(88, 7, open_txt, border=1, fill=True)
    pdf.set_xy(108, card_y)
    close_txt = f"Closing Balance: {fmt_currency(statement.closing_balance)}"
    pdf.cell(88, 7, close_txt, border=1, fill=True)
    pdf.track_box("closing_balance", 108, card_y, 88, 7)

    # Ledger Table
    table_y = card_y + 12
    pdf.set_xy(14, table_y)
    pdf.set_font("Helvetica", "B", 8.5)
    pdf.set_fill_color(241, 245, 249)
    pdf.cell(22, 6, "Date", border=1, fill=True)
    pdf.cell(78, 6, "Description", border=1, fill=True)
    pdf.cell(16, 6, "MCC", border=1, align="C", fill=True)
    pdf.cell(22, 6, "Debit", border=1, align="R", fill=True)
    pdf.cell(22, 6, "Credit", border=1, align="R", fill=True)
    pdf.cell(22, 6, "Balance", border=1, align="R", fill=True)
    pdf.ln()

    pdf.set_font("Helvetica", size=8)
    for idx, tx in enumerate(statement.transactions):
        row_fill = (idx % 2 == 1)
        if row_fill:
            pdf.set_fill_color(250, 250, 250)
        pdf.set_x(14)
        pdf.cell(22, 5.5, tx.date, border="B", fill=row_fill)
        pdf.cell(78, 5.5, tx.description[:45], border="B", fill=row_fill)
        pdf.cell(16, 5.5, tx.mcc, border="B", align="C", fill=row_fill)
        deb_str = fmt_currency(tx.debit) if tx.debit > 0 else "-"
        cred_str = fmt_currency(tx.credit) if tx.credit > 0 else "-"
        pdf.cell(22, 5.5, deb_str, border="B", align="R", fill=row_fill)
        pdf.cell(22, 5.5, cred_str, border="B", align="R", fill=row_fill)
        pdf.cell(22, 5.5, fmt_currency(tx.balance), border="B", align="R", fill=row_fill)
        pdf.ln()

    pdf_bytes = bytes(pdf.output())
    ground_truth = {
        "statement_number": statement.number,
        "opening_balance": str(statement.opening_balance),
        "closing_balance": str(statement.closing_balance),
        "transaction_count": len(statement.transactions),
        "bounding_boxes": pdf.field_boxes,
    }
    return pdf_bytes, ground_truth