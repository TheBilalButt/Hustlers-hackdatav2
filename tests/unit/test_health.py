"""Tests for API endpoints (/api/health, /api/preview, /api/plan, /api/query/parse)."""
import pytest
from httpx import ASGITransport, AsyncClient

from api.index import app
from synth.ir.models import Column, Dataset, SequenceGenerator, Table


@pytest.mark.asyncio
async def test_health_returns_ok():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "engine_version" in data
    assert "providers" in data


@pytest.mark.asyncio
async def test_preview_endpoint():
    ds = Dataset(
        ir_version="1.0",
        name="Preview API Test",
        mode="schema_only",
        seed=42,
        locale="en_US",
        tables=[
            Table(
                name="users",
                row_count=100,
                columns=[
                    Column(
                        name="id",
                        semantic_type="id",
                        dtype="int",
                        generator=SequenceGenerator(kind="sequence", start=1),
                        pk=True,
                    )
                ],
            )
        ],
        relationships=[],
        invariants=[],
        privacy=[],
        chaos=None,
        documents=[],
        world=None,
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/preview", json={"dataset": ds.model_dump(), "limit": 10})

    assert resp.status_code == 200
    data = resp.json()
    assert "rows" in data
    assert "users" in data["rows"]
    assert len(data["rows"]["users"]) == 10
    assert "hash" in data
    assert data["seed"] == 42


@pytest.mark.asyncio
async def test_plan_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/plan", json={"prompt": "Indian D2C store with GST"})
    assert resp.status_code == 200
    data = resp.json()
    assert "ir" in data
    assert data["degraded"] is True
    assert "tables" in data["ir"]


@pytest.mark.asyncio
async def test_query_parse_endpoint():
    transport = ASGITransport(app=app)
    payload = {"text": "last 30 days, balance over $200"}
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/query/parse", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["period"] == {"days": 30}
    assert len(data["constraints"]) == 1
