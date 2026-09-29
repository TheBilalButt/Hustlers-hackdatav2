"""Redact and mask sample values before sending to LLMs.

At most 5 masked examples per column are included in prompts.
No raw uploaded rows ever leave this module unmasked.
"""

from __future__ import annotations


def mask_examples(values: list[str], max_examples: int = 5) -> list[str]:
    """Return masked versions of sample values for LLM prompts."""
    # TODO: implement masking (ADR-0008)
    raise NotImplementedError
