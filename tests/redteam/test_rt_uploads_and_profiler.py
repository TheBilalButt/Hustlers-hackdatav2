"""Red-team tests for Uploads, Profiler, and Sanitization.

Covers RT-01, RT-02, RT-06, RT-07, RT-18, RT-19, RT-20, RT-21, RT-26.
Reference: TRD §11, §12.
"""

from __future__ import annotations

from synth.profiler.profile import profile_columns
from synth.profiler.redact import mask_examples
from synth.security.identifiers import is_safe_identifier, sanitize_identifier
from synth.security.uploads import (
    MAX_CSV_FIELD_BYTES,
    MAX_UPLOAD_BYTES,
    parse_upload_rows,
    validate_upload,
)


def test_rt01_rt02_adversarial_column_names():
    """Adversarial column names with SQL/script injection are safely sanitized."""
    adversarial_names = [
        "id; DROP TABLE users;--",
        "select",
        "order by",
        "123_invalid_start",
        "col<script>alert(1)</script>",
        "name with spaces",
    ]
    for name in adversarial_names:
        sanitized = sanitize_identifier(name)
        assert is_safe_identifier(sanitized), f"Failed to sanitize: {name} -> {sanitized}"
        assert ";" not in sanitized
        assert " " not in sanitized
        assert "<" not in sanitized


def test_rt06_rt07_data_poisoning_winsorizing():
    """Extreme outliers (e.g. 10^12) do not poison the generator min/max bounds."""
    # Normal distribution of numbers ~ 50, with an extreme poison value 1_000_000_000
    rows = [{"val": str(i)} for i in range(1, 100)]
    rows.append({"val": "1000000000"})  # poison outlier

    res = profile_columns(rows, ["val"], table_name="test_poison")
    val_stats = res["columns"]["val"]["stats"]

    # Raw max is poisoned
    assert val_stats["max"] == 1000000000
    # Winsorized max protects generator bounds
    w_max = val_stats["winsorized_max"]
    assert w_max < 500, f"Winsorized max {w_max} was poisoned"


def test_rt18_upload_size_limit():
    """Uploads over 4 MB are strictly rejected with UPLOAD_TOO_LARGE."""
    oversized = b"a" * (MAX_UPLOAD_BYTES + 1024)
    ok, err = validate_upload(oversized, "data.csv")
    assert not ok
    assert "UPLOAD_TOO_LARGE" in err


def test_rt19_upload_file_type():
    """Only CSV and JSON uploads are accepted; executables/scripts are rejected."""
    bad_files = ["payload.exe", "script.py", "exploit.sh", "archive.zip", "test.html"]
    for bf in bad_files:
        ok, err = validate_upload(b"content", bf)
        assert not ok
        assert "UPLOAD_REJECTED" in err


def test_rt20_upload_utf8_and_suspicious_characters():
    """Zero-width characters, BOM, and bidi overrides are stripped, non-UTF-8 rejected."""
    # Invalid UTF-8
    bad_utf8 = b"\xff\xfe\x00\x00"
    ok, err = validate_upload(bad_utf8, "bad.csv")
    assert not ok
    assert "UPLOAD_REJECTED" in err

    # BOM + zero-width space (\u200b) + bidi override (\u202e)
    raw_content = "\ufeffid,na\u200bme\u202e\n1,Alice\n".encode()
    ok, err = validate_upload(raw_content, "clean.csv")
    assert ok

    rows, cols, _ = parse_upload_rows(raw_content, "clean.csv")
    assert "name" in cols  # zero-width & bidi characters stripped


def test_rt21_upload_limits():
    """CSV field size > 64 KB and JSON depth > 32 are rejected."""
    # CSV field exceeding 64 KB
    huge_field = "a" * (MAX_CSV_FIELD_BYTES + 10)
    huge_csv = f"id,desc\n1,{huge_field}\n".encode()
    ok, err = validate_upload(huge_csv, "huge.csv")
    assert not ok
    assert "UPLOAD_REJECTED" in err

    # Deep JSON nesting > 32
    deep_obj: dict = {}
    curr = deep_obj
    for _ in range(35):
        curr["nested"] = {}
        curr = curr["nested"]
    import json

    deep_json = json.dumps(deep_obj).encode()
    ok, err = validate_upload(deep_json, "deep.json")
    assert not ok
    assert "UPLOAD_REJECTED" in err


def test_rt26_no_raw_rows_in_llm_prompts():
    """Masked examples never leak raw sensitive email, phone, or name tokens."""
    sensitive_values = [
        "secret.ceo@enterprise.com",
        "+1-800-555-0199",
        "TopSecretPassword123",
        "4111-2222-3333-4444",
    ]
    masked = mask_examples(sensitive_values, max_examples=5)

    assert len(masked) <= 5
    for idx, val in enumerate(sensitive_values):
        m = masked[idx]
        assert val != m, f"Raw value {val} leaked without masking"
        assert "***" in m or "*" in m