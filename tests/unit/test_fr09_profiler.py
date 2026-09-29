"""Tests for FR-09: Schema inference from a sample.

Covers T-09a (profiler accuracy, types, ranges, patterns, FK candidates, PII flags)
and T-09b (no raw rows in prompt data).
"""

from __future__ import annotations

import httpx
import pytest

from api.index import app
from synth.ir.models import Dataset
from synth.profiler.profile import profile_columns, profile_to_ir
from synth.profiler.redact import mask_examples


@pytest.fixture
def sample_rows():
    return [
        {
            "id": "1",
            "full_name": "Alice Smith",
            "email": "alice@company.com",
            "phone": "+1-555-0142",
            "salary": "75000",
            "signup_date": "2023-01-15",
            "is_active": "true",
            "dept": "Engineering",
            "customer_id": "101",
        },
        {
            "id": "2",
            "full_name": "Bob Jones",
            "email": "bob@domain.org",
            "phone": "+1-555-0199",
            "salary": "82000",
            "signup_date": "2023-03-22",
            "is_active": "true",
            "dept": "Marketing",
            "customer_id": "102",
        },
        {
            "id": "3",
            "full_name": "Charlie Brown",
            "email": "charlie@sample.net",
            "phone": "+1-555-0188",
            "salary": "91000",
            "signup_date": "2023-06-01",
            "is_active": "false",
            "dept": "Engineering",
            "customer_id": "103",
        },
        {
            "id": "4",
            "full_name": "Diana Prince",
            "email": "diana@test.invalid",
            "phone": "+1-555-0177",
            "salary": "65000",
            "signup_date": "2023-09-10",
            "is_active": "true",
            "dept": "Design",
            "customer_id": "104",
        },
    ]


def test_t09a_profiler_types_and_stats(sample_rows):
    cols = list(sample_rows[0].keys())
    res = profile_columns(sample_rows, cols, table_name="employees")

    assert res["table_name"] == "employees"
    assert res["row_count"] == 4
    assert res["column_count"] == len(cols)

    # 1. ID column
    assert res["columns"]["id"]["semantic_type"] == "id"
    assert res["columns"]["id"]["stats"]["distinct_count"] == 4

    # 2. PII Email
    assert res["columns"]["email"]["pii"] == "email"
    assert res["columns"]["email"]["semantic_type"] == "email"
    assert res["columns"]["email"]["recommended_control"] == "mask"

    # 3. PII Phone
    assert res["columns"]["phone"]["pii"] == "phone"
    assert res["columns"]["phone"]["semantic_type"] == "phone"
    assert res["columns"]["phone"]["recommended_control"] == "mask"

    # 4. PII Name
    assert res["columns"]["full_name"]["pii"] == "name"
    assert res["columns"]["full_name"]["semantic_type"] == "person_name"

    # 5. Numeric Salary (money)
    salary_stats = res["columns"]["salary"]["stats"]
    assert res["columns"]["salary"]["semantic_type"] == "money"
    assert salary_stats["min"] == 65000
    assert salary_stats["max"] == 91000
    assert salary_stats["mean"] == 78250

    # 6. Date
    assert res["columns"]["signup_date"]["semantic_type"] == "date"

    # 7. Boolean
    assert res["columns"]["is_active"]["semantic_type"] == "boolean"

    # 8. Categorical Dept
    assert res["columns"]["dept"]["semantic_type"] == "category"
    assert "top_categories" in res["columns"]["dept"]["stats"]

    # 9. FK candidate customer_id -> customer.id
    candidates = res["fk_candidates"]
    fk_cand = next((fk for fk in candidates if fk["source_column"] == "customer_id"), None)
    assert fk_cand is not None
    assert fk_cand["target_table"] == "customer"
    assert fk_cand["target_column"] == "id"


def test_t09b_no_raw_rows_in_masked_examples(sample_rows):
    emails = [r["email"] for r in sample_rows]
    masked = mask_examples(emails, max_examples=5)

    assert len(masked) <= 5
    for m in masked:
        # Guaranteed masked format: u***@d***.tld
        assert "@" in m
        assert "***" in m
        # Ensure no original raw email exists unchanged
        assert m not in emails

    phones = [r["phone"] for r in sample_rows]
    masked_phones = mask_examples(phones, max_examples=5)
    for p in masked_phones:
        assert "***" in p
        assert p not in phones


def test_t09a_profile_to_ir_validation(sample_rows):
    cols = list(sample_rows[0].keys())
    res = profile_columns(sample_rows, cols, table_name="test_employees")
    ir = profile_to_ir(res, table_name="test_employees", dataset_name="Test Employees Dataset")

    # Must be valid Pydantic Dataset IR v1.0
    assert isinstance(ir, Dataset)
    assert ir.ir_version == "1.0"
    assert ir.mode == "sample"
    assert len(ir.tables) == 1
    assert ir.tables[0].name == "test_employees"
    assert len(ir.tables[0].columns) == len(cols)

    # Privacy rules inferred for PII
    privacy_cols = [p.column for p in ir.privacy]
    assert "email" in privacy_cols
    assert "phone" in privacy_cols


@pytest.mark.asyncio
async def test_t09a_api_profile_csv():
    csv_lines = [
        "id,name,email,amount",
        "1,Alice,alice@example.com,45.50",
        "2,Bob,bob@example.com,75.20",
    ]
    csv_data = "\n".join(csv_lines) + "\n"
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/profile",
            content=csv_data.encode(),
            headers={"content-type": "text/csv", "x-filename": "transactions.csv"},
        )
    assert resp.status_code == 200, f"Error: {resp.text}"
    data = resp.json()
    assert "profile" in data
    assert "ir" in data
    assert data["profile"]["table_name"] == "transactions"
    assert "email" in data["profile"]["columns"]
    assert data["profile"]["columns"]["email"]["pii"] == "email"


@pytest.mark.asyncio
async def test_t09a_api_profile_json():
    json_data = '{"rows": [{"id": 1, "score": 98.5}, {"id": 2, "score": 87.0}]}'
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/profile",
            content=json_data.encode(),
            headers={"content-type": "application/json", "x-filename": "scores.json"},
        )
    assert resp.status_code == 200, f"Error: {resp.text}"
    data = resp.json()
    assert data["profile"]["table_name"] == "scores"
    assert data["profile"]["row_count"] == 2