"""Locale formatting and tax computation for document generation.

Supports en_US, en_IN, and de_DE locale packs.
All calculations use exact Decimal arithmetic with ROUND_HALF_UP.
Reference: PRD §9, TRD §6.1, §6.2, §8.3.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from typing import Literal

from synth.documents.models import TaxLine

ROUND_2 = Decimal("0.01")


def _round_money(val: Decimal) -> Decimal:
    return val.quantize(ROUND_2, rounding=ROUND_HALF_UP)


def format_lakh_grouping(number_str: str) -> str:
    """Format an integer string using Indian lakh grouping (e.g. 12,34,567)."""
    if len(number_str) <= 3:
        return number_str
    last_three = number_str[-3:]
    remaining = number_str[:-3]
    parts: list[str] = []
    while len(remaining) > 2:
        parts.insert(0, remaining[-2:])
        remaining = remaining[:-2]
    if remaining:
        parts.insert(0, remaining)
    return ",".join(parts) + "," + last_three


@dataclass(frozen=True)
class LocalePack:
    locale: Literal["en_US", "en_IN", "de_DE"]
    currency: str
    currency_symbol: str
    tax_label: str

    def format_currency(self, amount: Decimal) -> str:
        rounded = _round_money(amount)
        sign = "-" if rounded < 0 else ""
        abs_val = abs(rounded)
        parts = f"{abs_val:.2f}".split(".")
        int_part, dec_part = parts[0], parts[1]

        if self.locale == "en_US":
            int_formatted = f"{int(int_part):,}"
            return f"{sign}{self.currency_symbol}{int_formatted}.{dec_part}"
        elif self.locale == "en_IN":
            int_formatted = format_lakh_grouping(int_part)
            return f"{sign}{self.currency_symbol} {int_formatted}.{dec_part}"
        elif self.locale == "de_DE":
            int_formatted = f"{int(int_part):,}".replace(",", ".")
            return f"{sign}{int_formatted},{dec_part} {self.currency_symbol}"
        return f"{self.currency} {rounded}"

    def format_date(self, iso_date: str) -> str:
        """Format YYYY-MM-DD date string according to locale convention."""
        parts = iso_date.split("-")
        if len(parts) != 3:
            return iso_date
        y, m, d = parts[0], parts[1], parts[2]
        months = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ]
        m_idx = int(m) - 1
        m_name = months[m_idx] if 0 <= m_idx < 12 else m

        if self.locale == "en_US":
            return f"{m_name} {int(d)}, {y}"
        elif self.locale == "en_IN":
            return f"{int(d)} {m_name} {y}"
        elif self.locale == "de_DE":
            return f"{d}.{m}.{y}"
        return iso_date

    def compute_tax_lines(self, subtotal: Decimal) -> tuple[list[TaxLine], Decimal]:
        """Compute exact Decimal tax lines and tax total for a given subtotal."""
        sub = _round_money(subtotal)
        if self.locale == "en_US":
            rate = Decimal("0.08")
            amount = _round_money(sub * rate)
            tax_line = TaxLine(
                label="State sales tax (demo default)",
                rate=rate,
                base=sub,
                amount=amount,
            )
            return [tax_line], amount

        elif self.locale == "en_IN":
            cgst_rate = Decimal("0.09")
            sgst_rate = Decimal("0.09")
            cgst_amt = _round_money(sub * cgst_rate)
            sgst_amt = _round_money(sub * sgst_rate)
            line1 = TaxLine(
                label="CGST 9% (demo default)",
                rate=cgst_rate,
                base=sub,
                amount=cgst_amt,
            )
            line2 = TaxLine(
                label="SGST 9% (demo default)",
                rate=sgst_rate,
                base=sub,
                amount=sgst_amt,
            )
            total_tax = _round_money(cgst_amt + sgst_amt)
            return [line1, line2], total_tax

        elif self.locale == "de_DE":
            rate = Decimal("0.19")
            amount = _round_money(sub * rate)
            tax_line = TaxLine(
                label="19% MwSt (demo default)",
                rate=rate,
                base=sub,
                amount=amount,
            )
            return [tax_line], amount

        return [], Decimal("0.00")


PACK_US = LocalePack(
    locale="en_US",
    currency="USD",
    currency_symbol="$",
    tax_label="State sales tax (demo default)",
)

PACK_IN = LocalePack(
    locale="en_IN",
    currency="INR",
    currency_symbol="Rs.",
    tax_label="GST (demo default)",
)

PACK_DE = LocalePack(
    locale="de_DE",
    currency="EUR",
    currency_symbol="EUR",
    tax_label="19% VAT (demo default)",
)

_PACKS: dict[str, LocalePack] = {
    "en_US": PACK_US,
    "en_IN": PACK_IN,
    "de_DE": PACK_DE,
}


def get_locale_pack(locale: str = "en_US") -> LocalePack:
    """Retrieve the LocalePack for a locale, defaulting to en_US."""
    return _PACKS.get(locale, PACK_US)