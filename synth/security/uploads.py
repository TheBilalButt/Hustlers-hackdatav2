"""Upload validation: size, type, encoding, depth.

CSV and JSON only. Max 4 MB. UTF-8 NFC normalized.
Strips BOM, zero-width chars, bidi overrides.
Reference: TRD §11, RT-18 to RT-21.
"""

from __future__ import annotations


def validate_upload(content: bytes, filename: str) -> tuple[bool, str]:
    """Validate an uploaded file. Returns (ok, error_message)."""
    # TODO: implement upload validation
    raise NotImplementedError
