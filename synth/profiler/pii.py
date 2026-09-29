"""PII detection heuristics for uploaded columns.

Identifies personally identifiable information based on column names
and observed sample value patterns.
Reference: TRD §8, §11, RT-06, RT-07.
"""

from __future__ import annotations

import re

# Regex patterns for common PII
EMAIL_RE = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
PHONE_RE = re.compile(r"^\+?(\d{1,3})?[-. ]?\(?\d{2,4}\)?[-. ]?\d{3,4}[-. ]?\d{3,4}$")
SSN_RE = re.compile(r"^\d{3}-\d{2}-\d{4}$")
CREDIT_CARD_RE = re.compile(r"^\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{1,4}$")
IBAN_RE = re.compile(r"^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$")
IPV4_RE = re.compile(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$")

COLUMN_NAME_PII_MAP: dict[str, str] = {
    "email": "email",
    "e_mail": "email",
    "mail": "email",
    "phone": "phone",
    "mobile": "phone",
    "cell": "phone",
    "telephone": "phone",
    "ssn": "ssn",
    "social_security": "ssn",
    "national_id": "ssn",
    "credit_card": "credit_card",
    "card_number": "credit_card",
    "cc_number": "credit_card",
    "card_num": "credit_card",
    "pan": "credit_card",
    "iban": "iban",
    "ip_address": "ip_address",
    "ip": "ip_address",
    "first_name": "name",
    "last_name": "name",
    "full_name": "name",
    "customer_name": "name",
    "client_name": "name",
    "user_name": "name",
    "username": "name",
    "name": "name",
    "street": "address",
    "address": "address",
    "street_address": "address",
    "dob": "date_of_birth",
    "date_of_birth": "date_of_birth",
    "birth_date": "date_of_birth",
    "birthday": "date_of_birth",
    "zipcode": "postal_code",
    "zip_code": "postal_code",
    "postal_code": "postal_code",
    "account_number": "financial_account",
    "bank_account": "financial_account",
}


def detect_pii(column_name: str, sample_values: list[str]) -> str | None:
    """Return PII category if detected, else None.

    Evaluates both normalized column name conventions and pattern matching
    on non-empty sample strings.
    """
    col_norm = column_name.lower().strip().replace("-", "_").replace(" ", "_")

    # Exact or substring match in column name dictionary
    if col_norm in COLUMN_NAME_PII_MAP:
        return COLUMN_NAME_PII_MAP[col_norm]

    for key, pii_type in COLUMN_NAME_PII_MAP.items():
        if key in col_norm.split("_"):
            return pii_type

    # Sample pattern checks (if at least 30% of non-empty samples match)
    non_empty = [str(s).strip() for s in sample_values if s is not None and str(s).strip()]
    if not non_empty:
        return None

    check_count = min(len(non_empty), 20)
    samples_to_check = non_empty[:check_count]

    email_matches = sum(1 for s in samples_to_check if EMAIL_RE.match(s))
    if email_matches / check_count >= 0.3:
        return "email"

    phone_matches = sum(1 for s in samples_to_check if PHONE_RE.match(s))
    if phone_matches / check_count >= 0.3:
        return "phone"

    ssn_matches = sum(1 for s in samples_to_check if SSN_RE.match(s))
    if ssn_matches / check_count >= 0.3:
        return "ssn"

    card_matches = sum(1 for s in samples_to_check if CREDIT_CARD_RE.match(s))
    if card_matches / check_count >= 0.3:
        return "credit_card"

    iban_matches = sum(1 for s in samples_to_check if IBAN_RE.match(s.replace(" ", "")))
    if iban_matches / check_count >= 0.3:
        return "iban"

    ipv4_matches = sum(1 for s in samples_to_check if IPV4_RE.match(s))
    if ipv4_matches / check_count >= 0.3:
        return "ip_address"

    return None