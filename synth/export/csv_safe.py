"""Formula-safe CSV export.

Prefixes cells starting with =, +, -, @, \t, \r with a single quote.
This is on by default and cannot be disabled.
"""

from __future__ import annotations

import csv
import io
from typing import Any

FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def encode_csv(rows: list[dict[str, Any]], columns: list[str]) -> str:
    """Encode rows as formula-safe CSV."""
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=columns, lineterminator="\n")
    writer.writeheader()

    for row in rows:
        safe_row = {}
        for col in columns:
            val = str(row.get(col, ""))
            if val and val[0] in FORMULA_PREFIXES:
                val = "'" + val
            safe_row[col] = val
        writer.writerow(safe_row)

    return buf.getvalue()
