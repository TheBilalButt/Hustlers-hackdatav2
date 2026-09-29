"""Tests for formula-safe CSV export."""
from synth.export.csv_safe import encode_csv


def test_fr13_csv_formula_prefix():
    """Cells starting with formula chars must be prefixed with a quote."""
    rows = [
        {"name": "=cmd()", "value": "normal"},
        {"name": "+1234", "value": "-5678"},
        {"name": "@evil", "value": "safe"},
    ]
    result = encode_csv(rows, ["name", "value"])
    lines = result.strip().split("\n")
    assert "'=cmd()" in lines[1]
    assert "'+1234" in lines[2]
    assert "'-5678" in lines[2]
    assert "'@evil" in lines[3]
