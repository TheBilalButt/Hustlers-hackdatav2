"""PII detection heuristics for uploaded columns."""

from __future__ import annotations


def detect_pii(column_name: str, sample_values: list[str]) -> str | None:
    """Return PII category if detected, else None."""
    # TODO: implement PII detection
    raise NotImplementedError
