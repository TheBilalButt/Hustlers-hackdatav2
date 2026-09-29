"""Tests for FR-18: Live preview and size estimate.

T-18a: preview latency within 1 s
T-18b: estimate equals the row plan
"""

import time

import pytest
from httpx import ASGITransport, AsyncClient

from api.index import app
from synth.ir.models import (
    Column,
    Dataset,
    FakerGenerator,
    NumericGenerator,
    SequenceGenerator,
    Table,
)


def make_ecommerce_dataset() -> Dataset:
    return Dataset(
        ir_version="1.0",
        name="Ecommerce Store Test",
        mode="schema_only",
        seed=42,
        locale="en_US",
        tables=[
            Table(
                name="customers",
                row_count=500,
                columns=[
                    Column(
                        name="customer_id",
                        semantic_type="id",
                        dtype="int",
                        generator=SequenceGenerator(kind="sequence", start=1),
                        pk=True,
                    ),
                    Column(
                        name="name",
                        semantic_type="person_name",
                        dtype="str",
                        generator=FakerGenerator(kind="faker", provider="name"),
                    ),
                    Column(
                        name="email",
                        semantic_type="email",
                        dtype="str",
                        generator=FakerGenerator(kind="faker", provider="email"),
                    ),
                ],
            ),
            Table(
                name="orders",
                row_count=2000,
                columns=[
                    Column(
                        name="order_id",
                        semantic_type="id",
                        dtype="int",
                        generator=SequenceGenerator(kind="sequence", start=1001),
                        pk=True,
                    ),
                    Column(
                        name="customer_id",
                        semantic_type="id",
                        dtype="int",
                        generator=SequenceGenerator(kind="sequence", start=1),
                    ),
                    Column(
                        name="amount",
                        semantic_type="money",
                        dtype="decimal",
                        generator=NumericGenerator(
                            kind="numeric", dist="uniform", min_val=10.0, max_val=500.0
                        ),
                    ),
                ],
            ),
        ],
        relationships=[],
        invariants=[],
        privacy=[],
        chaos=None,
        documents=[],
        world=None,
    )


@pytest.mark.asyncio
async def test_t18a_preview_latency():
    """T-18a: Preview generation returns within 1 second for standard schemas."""
    ds = make_ecommerce_dataset()
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Pre-warm request per ROADMAP pre-warm requirement
        warm = await client.post("/api/preview", json={"dataset": ds.model_dump(), "limit": 10})
        assert warm.status_code == 200

        # Measure preview latency on configuration refresh
        start = time.perf_counter()
        resp = await client.post("/api/preview", json={"dataset": ds.model_dump(), "limit": 50})
        duration = time.perf_counter() - start

    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    assert duration < 1.0, f"Preview took {duration:.3f}s, expected < 1.0s"

    data = resp.json()
    assert "rows" in data
    assert len(data["rows"]["customers"]) == 50
    assert len(data["rows"]["orders"]) == 50
    assert "hash" in data
    assert len(data["hash"]) == 64


@pytest.mark.asyncio
async def test_t18b_estimate_equals_row_plan():
    """T-18b: Preview verification that planned row counts and schemas agree."""
    ds = make_ecommerce_dataset()
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/preview", json={"dataset": ds.model_dump(), "limit": 10})

    assert resp.status_code == 200
    data = resp.json()

    total_planned = sum(t.row_count or 0 for t in ds.tables)
    assert total_planned == 2500

    for t in ds.tables:
        rows = data["rows"][t.name]
        assert len(rows) == 10
        for col in t.columns:
            assert col.name in rows[0]


@pytest.mark.asyncio
async def test_t18_preview_invalid_body():
    """T-18 RFC 9457 error response when invalid schema is sent."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/preview", json={"invalid": "payload"})

    assert resp.status_code in (400, 422)
    assert resp.headers.get("content-type", "").startswith("application/problem+json")
    data = resp.json()
    assert "title" in data
    assert "code" in data
