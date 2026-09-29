"""Upload validation: size, type, encoding, depth.

CSV and JSON only. Max 4 MB. UTF-8 NFC normalized.
Strips BOM, zero-width chars, bidi overrides.
Reference: TRD §2, §11, RT-18 to RT-21.
"""

from __future__ import annotations

import csv
import io
import json
import re
import unicodedata
from typing import Any

MAX_UPLOAD_BYTES = 4 * 1024 * 1024  # 4 MB
MAX_CSV_FIELD_BYTES = 64 * 1024     # 64 KB
MAX_JSON_DEPTH = 32
MAX_PROFILED_ROWS = 50_000

# Zero-width and bidi override characters (RT-20)
SUSPICIOUS_CHARS_RE = re.compile(r"[\u200b\u200c\u200d\u2060\ufeff\u202a-\u202e\u2066-\u2069]")


def validate_upload(content: bytes, filename: str) -> tuple[bool, str]:
    """Validate an uploaded file. Returns (ok, error_message).

    Checks:
    - Size <= 4 MB (RT-18)
    - Extension must be .csv or .json (RT-19)
    - UTF-8 decodable and NFC normalized (RT-20)
    - CSV fields <= 64 KB (RT-21)
    - JSON nesting depth <= 32 (RT-21)
    """
    if len(content) > MAX_UPLOAD_BYTES:
        return False, "Upload exceeds 4 MB limit (UPLOAD_TOO_LARGE)"

    lower_name = filename.lower()
    if not (lower_name.endswith(".csv") or lower_name.endswith(".json")):
        return False, "Only CSV and JSON uploads are supported (UPLOAD_REJECTED)"

    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        return False, "Upload must be valid UTF-8 (UPLOAD_REJECTED)"

    # Strip BOM if present
    if text.startswith("\ufeff"):
        text = text[1:]

    # Remove zero-width characters and bidi overrides
    text = SUSPICIOUS_CHARS_RE.sub("", text)
    text = unicodedata.normalize("NFC", text)

    if lower_name.endswith(".csv"):
        # Validate CSV field size
        csv.field_size_limit(MAX_CSV_FIELD_BYTES + 1)
        try:
            reader = csv.reader(io.StringIO(text))
            for row in reader:
                for field in row:
                    if len(field.encode("utf-8")) > MAX_CSV_FIELD_BYTES:
                        return False, "CSV field size exceeds 64 KB limit (UPLOAD_REJECTED)"
        except csv.Error as err:
            return False, f"CSV parsing error: {err} (UPLOAD_REJECTED)"

    elif lower_name.endswith(".json"):
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError as err:
            return False, f"JSON parsing error: {err} (UPLOAD_REJECTED)"

        # Check depth
        depth = _measure_json_depth(parsed)
        if depth > MAX_JSON_DEPTH:
            msg = f"JSON nesting depth {depth} exceeds {MAX_JSON_DEPTH} limit (UPLOAD_REJECTED)"
            return False, msg

    return True, ""


def _measure_json_depth(obj: Any, current_depth: int = 1) -> int:
    """Recursively measure maximum nesting depth of JSON-like structure."""
    if isinstance(obj, dict):
        if not obj:
            return current_depth
        return max(_measure_json_depth(v, current_depth + 1) for v in obj.values())
    if isinstance(obj, list):
        if not obj:
            return current_depth
        return max(_measure_json_depth(item, current_depth + 1) for item in obj)
    return current_depth


def parse_upload_rows(
    content: bytes, filename: str
) -> tuple[list[dict[str, Any]], list[str], list[str]]:
    """Parse rows and columns from uploaded content after validation.

    Returns:
        (rows, column_names, warnings)
    """
    ok, err = validate_upload(content, filename)
    if not ok:
        raise ValueError(err)

    text = content.decode("utf-8", errors="replace")
    if text.startswith("\ufeff"):
        text = text[1:]
    text = SUSPICIOUS_CHARS_RE.sub("", text)
    text = unicodedata.normalize("NFC", text)

    warnings: list[str] = []
    rows: list[dict[str, Any]] = []
    columns: list[str] = []

    lower_name = filename.lower()
    if lower_name.endswith(".csv"):
        reader = csv.DictReader(io.StringIO(text))
        columns = [c.strip() for c in (reader.fieldnames or []) if c and c.strip()]
        for idx, row in enumerate(reader):
            if idx >= MAX_PROFILED_ROWS:
                warnings.append(f"Upload truncated to {MAX_PROFILED_ROWS} rows limit.")
                break
            rows.append({k.strip(): v for k, v in row.items() if k and k.strip() in columns})

    elif lower_name.endswith(".json"):
        parsed = json.loads(text)
        if isinstance(parsed, dict) and "rows" in parsed and isinstance(parsed["rows"], list):
            data_list = parsed["rows"]
        elif isinstance(parsed, list):
            data_list = parsed
        else:
            data_list = [parsed]

        # Extract column names from union of dict keys
        col_set: dict[str, None] = {}
        for item in data_list[:MAX_PROFILED_ROWS]:
            if isinstance(item, dict):
                for k in item:
                    col_set[str(k).strip()] = None
        columns = list(col_set.keys())

        for idx, item in enumerate(data_list):
            if idx >= MAX_PROFILED_ROWS:
                warnings.append(f"Upload truncated to {MAX_PROFILED_ROWS} rows limit.")
                break
            if isinstance(item, dict):
                rows.append({str(k).strip(): v for k, v in item.items()})

    return rows, columns, warnings