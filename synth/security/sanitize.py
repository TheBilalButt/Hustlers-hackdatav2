"""Input sanitization and spotlighting for LLM prompts.

Untrusted text is truncated, datamarked (whitespace replaced with ^),
and wrapped in <<UNTRUSTED>> delimiters.
Reference: TRD §9.3.
"""
from __future__ import annotations


def spotlight(text: str, max_chars: int = 4000) -> str:
    """Sanitize and wrap untrusted text for LLM prompts."""
    truncated = text[:max_chars]
    # Replace whitespace with ^ for datamarking
    datamarked = ""
    for ch in truncated:
        if ch in (" ", "\t"):
            datamarked += "^"
        else:
            datamarked += ch
    return f"<<UNTRUSTED>>{datamarked}<</UNTRUSTED>>"
