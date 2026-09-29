"""Safe identifier validation and sanitization.

Pattern: ^[A-Za-z_][A-Za-z0-9_]{0,62}$
Also rejects SQL reserved words (case-insensitive).
"""

from __future__ import annotations

import re

IDENTIFIER_PATTERN = re.compile(r"^[A-Za-z_][A-Za-z0-9_]{0,62}$")

# Common SQL reserved words to reject
SQL_RESERVED = frozenset(
    {
        "select",
        "insert",
        "update",
        "delete",
        "drop",
        "create",
        "alter",
        "table",
        "from",
        "where",
        "and",
        "or",
        "not",
        "null",
        "true",
        "false",
        "index",
        "primary",
        "key",
        "foreign",
        "references",
        "constraint",
        "union",
        "join",
        "on",
        "as",
        "in",
        "is",
        "like",
        "between",
        "exists",
        "group",
        "order",
        "by",
        "having",
        "limit",
        "offset",
        "into",
        "values",
        "set",
        "begin",
        "commit",
        "rollback",
        "grant",
        "revoke",
    }
)


def is_safe_identifier(name: str) -> bool:
    """Check if a name is a safe SQL identifier."""
    if not IDENTIFIER_PATTERN.match(name):
        return False
    return name.lower() not in SQL_RESERVED


def sanitize_identifier(name: str, fallback: str = "col") -> str:
    """Convert an arbitrary string into a safe, valid SQL and IR identifier."""
    cleaned = re.sub(r"[^A-Za-z0-9_]", "_", name.strip())
    cleaned = re.sub(r"_+", "_", cleaned).strip("_")
    if not cleaned:
        cleaned = fallback
    if cleaned[0].isdigit():
        cleaned = f"col_{cleaned}"
    if cleaned.lower() in SQL_RESERVED:
        cleaned = f"{cleaned}_col"
    return cleaned[:63]