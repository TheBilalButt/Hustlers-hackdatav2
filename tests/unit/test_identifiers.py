"""Tests for safe identifier validation."""
from synth.security.identifiers import is_safe_identifier


def test_valid_identifiers():
    assert is_safe_identifier("users")
    assert is_safe_identifier("order_items")
    assert is_safe_identifier("_private")
    assert is_safe_identifier("Col123")


def test_sql_reserved_words_rejected():
    assert not is_safe_identifier("select")
    assert not is_safe_identifier("DROP")
    assert not is_safe_identifier("table")


def test_invalid_patterns_rejected():
    assert not is_safe_identifier("123start")
    assert not is_safe_identifier("has spaces")
    assert not is_safe_identifier("semi;colon")
    assert not is_safe_identifier("")
