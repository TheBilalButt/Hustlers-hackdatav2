"""Redact and mask sample values before sending to LLMs.

At most 5 masked examples per column are included in prompts.
No raw uploaded rows or sensitive values ever leave this module unmasked.
Reference: ADR-0008, TRD §9.1, RT-26.
"""

from __future__ import annotations

import re


def mask_value(val: str) -> str:
    """Mask a single scalar string representation to protect privacy."""
    val = val.strip()
    if not val:
        return "<EMPTY>"

    # Email pattern: user@domain.tld -> u***@d***.tld
    if "@" in val:
        parts = val.split("@", 1)
        user_part = parts[0]
        domain_part = parts[1]
        masked_user = (user_part[0] + "***") if len(user_part) > 1 else "***"
        masked_domain = (
            (domain_part[0] + "***." + domain_part.split(".")[-1])
            if "." in domain_part
            else "***"
        )
        return f"{masked_user}@{masked_domain}"

    # Phone number or dashes with digits: e.g., +1-555-0142 -> +1-***-**42
    if re.search(r"^\+?[\d\s\-().]{7,}$", val):
        digits_only = re.sub(r"\D", "", val)
        if len(digits_only) >= 7:
            # Keep first digit and last 2 digits, mask middle
            return f"***-***-{digits_only[-4:]}"

    # ISO Date pattern: YYYY-MM-DD -> YYYY-**-**
    if re.match(r"^\d{4}-\d{2}-\d{2}", val):
        return val[:4] + "-**-**"

    # Numeric integer / float
    try:
        float(val)
        if "." in val:
            int_part, dec_part = val.split(".", 1)
            sign = "-" if int_part.startswith("-") else ""
            clean_int = int_part.lstrip("-")
            masked_int = (
                (clean_int[0] + "*" * (len(clean_int) - 1))
                if len(clean_int) > 1
                else "*"
            )
            return f"{sign}{masked_int}.{'*' * min(len(dec_part), 2)}"
        else:
            sign = "-" if val.startswith("-") else ""
            clean = val.lstrip("-")
            return f"{sign}{clean[0]}{'*' * (len(clean) - 1)}" if len(clean) > 1 else f"{sign}*"
    except ValueError:
        pass

    # UUID: 8-4-4-4-12 -> 8***-****
    if re.match(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}", val):
        return val[:4] + "****-****-****"

    # Multi-word string (e.g. Full Name, Address): mask each word
    words = val.split()
    if len(words) > 1:
        masked_words = []
        for w in words[:4]:
            if len(w) > 1:
                masked_words.append(w[0] + "*" * min(len(w) - 1, 4))
            else:
                masked_words.append("*")
        return " ".join(masked_words)

    # Single string token
    if len(val) <= 2:
        return "*" * len(val)
    return val[0] + "*" * min(len(val) - 1, 6)


def mask_examples(values: list[str], max_examples: int = 5) -> list[str]:
    """Return masked versions of sample values for LLM prompts.

    Args:
        values: Sample values from the uploaded data.
        max_examples: Maximum number of masked examples to return (default 5).

    Returns:
        List of masked strings (guaranteed <= max_examples, no raw data).
    """
    cleaned = [str(v) for v in values if v is not None and str(v).strip() != ""]
    # Take up to max_examples distinct values to provide diversity
    seen = set()
    distinct_vals: list[str] = []
    for val in cleaned:
        if val not in seen:
            seen.add(val)
            distinct_vals.append(val)
            if len(distinct_vals) >= max_examples:
                break

    return [mask_value(v) for v in distinct_vals]