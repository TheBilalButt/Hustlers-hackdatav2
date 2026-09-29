"""Safe identifier validation.

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
