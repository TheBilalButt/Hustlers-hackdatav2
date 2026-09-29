"""Tests for IR model validation."""

import pytest
from pydantic import ValidationError

from synth.ir.models import Column, Dataset, SequenceGenerator, Table


def test_valid_dataset_creates_successfully(sample_recipe):
    """A well-formed IR should parse without errors."""
    ds = Dataset(**sample_recipe["ir"])
    assert ds.ir_version == "1.0"
    assert len(ds.tables) == 1


def test_extra_fields_rejected():
    """Extra fields must be rejected (extra=forbid)."""
    with pytest.raises(ValidationError):
        Column(
            name="test",
            semantic_type="id",
            dtype="int",
            generator=SequenceGenerator(),
            sneaky_field="should_fail",
        )


def test_identifier_rejects_sql_injection():
    """Table names with SQL injection patterns must fail validation."""
    with pytest.raises(ValidationError):
        Table(
            name="orders; DROP",
            row_count=10,
            columns=[
                Column(
                    name="id",
                    semantic_type="id",
                    dtype="int",
                    generator=SequenceGenerator(),
                )
            ],
        )
