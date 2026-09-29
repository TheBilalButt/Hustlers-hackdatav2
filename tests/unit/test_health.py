"""Tests for the /api/health and /api/preview endpoints."""
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
