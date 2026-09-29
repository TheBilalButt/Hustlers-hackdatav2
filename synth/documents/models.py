"""Document models: InvoiceDoc and StatementDoc.

All money fields use Decimal with locale-specific rounding.
Reference: TRD §6.1.
"""
from __future__ import annotations

from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class InvoiceLine(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    sku: str
    description: str
    qty: int
    unit_price: Decimal
    tax_code: str
    amount: Decimal


class TaxLine(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    label: str
    rate: Decimal
    base: Decimal
    amount: Decimal


class InvoiceDoc(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    number: str = Field(pattern=r"^SYN-INV-.*")
    issue_date: str
    due_date: str
    seller_name: str
    seller_address: str
    buyer_name: str
    buyer_address: str
    lines: list[InvoiceLine]
    tax_lines: list[TaxLine]
    subtotal: Decimal
    discount: Decimal = Decimal("0")
    tax_total: Decimal
    total: Decimal
    currency: str
    locale: str
    template_id: str
    recipe_hash: str


class Transaction(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    date: str
    description: str
    mcc: str
    debit: Decimal = Decimal("0")
    credit: Decimal = Decimal("0")
    balance: Decimal


class StatementDoc(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    number: str = Field(pattern=r"^SYN-STM-.*")
    bank_name: str
    holder_name: str
    period_from: str
    period_to: str
    opening_balance: Decimal
    transactions: list[Transaction]
    closing_balance: Decimal
    template_id: str
    recipe_hash: str
