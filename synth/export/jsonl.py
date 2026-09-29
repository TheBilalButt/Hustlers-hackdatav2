"""JSONL export encoder."""
from __future__ import annotations

import json
from typing import Any


def encode_jsonl(rows: list[dict[str, Any]]) -> str:
    """Encode rows as newline-delimited JSON."""
    lines = []
    for row in rows:
        lines.append(json.dumps(row, default=str, ensure_ascii=False))
    return "\n".join(lines) + "\n"
