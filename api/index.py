"""FastAPI application — Vercel serverless entry point.

All routes under /api. Errors use RFC 9457 problem+json.
Reference: TRD §10.
"""
from __future__ import annotations

from typing import Any

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from synth.config import settings
from synth.engines.tabular import compute_dataset_hash, generate_table
from synth.ir.models import Dataset
from synth.llm.router import LLMRouter

app = FastAPI(
    title="HackDataV2 Synthetic Data Platform",
    version=settings.engine_version,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

router = LLMRouter()


@app.get("/api/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "engine_version": settings.engine_version,
        "offline": settings.offline_mode,
        "providers": {k: b.state for k, b in router.breakers.items()},
    }


@app.post("/api/preview")
async def preview(request: Request) -> Any:
    """Generate a preview (up to limit rows) for tables in the dataset."""
    try:
        body = await request.json()
    except Exception:
        return _problem(400, "Invalid JSON body", "BAD_REQUEST")

    try:
        raw_ds = body.get("dataset", body) if isinstance(body, dict) else body
        limit = body.get("limit", 50) if isinstance(body, dict) and "limit" in body else 50
        dataset = Dataset.model_validate(raw_ds)
    except Exception as e:
        return _problem(422, f"Validation error: {e}", "VALIDATION_FAILED")

    try:
        rows_per_table: dict[str, list[dict[str, Any]]] = {}
        for table in dataset.tables:
            rows_per_table[table.name] = generate_table(dataset, table.name, max_rows=limit)
        dataset_hash = compute_dataset_hash(dataset, rows_per_table)
        return {
            "rows": rows_per_table,
            "hash": dataset_hash,
            "seed": dataset.seed,
        }
    except ValueError as e:
        valid_codes = ("LIMIT_ROWS", "LIMIT_FANOUT", "LIMIT_SCHEMA")
        code = str(e) if str(e) in valid_codes else "GENERATION_FAILED"
        return _problem(400, f"Generation error: {e}", code)


@app.post("/api/plan")
async def plan(request: Request) -> Any:
    """Generate or refine an IR from a prompt or profile (FR-10, FR-16)."""
    try:
        body = await request.json()
    except Exception:
        return _problem(400, "Invalid JSON body", "BAD_REQUEST")

    task = body.get("task", "nl_to_ir") if isinstance(body, dict) else "nl_to_ir"
    try:
        res = await router.call(task, body if isinstance(body, dict) else {})
        return {
            "ir": res.get("output", {}),
            "degraded": res.get("degraded", False),
            "provider": res.get("provider", "deterministic_fallback"),
            "model": res.get("model", "template_library"),
        }
    except Exception as e:
        return _problem(500, f"Planning error: {e}", "PLAN_FAILED")


@app.post("/api/query/parse")
async def query_parse(request: Request) -> Any:
    """Parse a statement query into DSL (FR-08)."""
    try:
        body = await request.json()
    except Exception:
        return _problem(400, "Invalid JSON body", "BAD_REQUEST")

    text = body.get("text", "") if isinstance(body, dict) else ""
    try:
        res = await router.call("parse_query", {"text": text})
        return res.get("output", {})
    except Exception as e:
        return _problem(400, f"Query parse error: {e}", "DSL_UNSUPPORTED")


@app.post("/api/profile")
async def profile(request: Request) -> dict[str, Any]:
    """Profile an uploaded CSV or JSON sample."""
    return _problem(501, "Not implemented", "VALIDATION_FAILED")


@app.post("/api/generate")
async def generate(request: Request) -> dict[str, Any]:
    """Generate a block of rows for a table."""
    return _problem(501, "Not implemented", "VALIDATION_FAILED")


@app.post("/api/trust")
async def trust(request: Request) -> dict[str, Any]:
    """Compute the Trust Report."""
    return _problem(501, "Not implemented", "VALIDATION_FAILED")


@app.post("/api/documents")
async def documents(request: Request) -> dict[str, Any]:
    """Generate invoice or statement PDFs."""
    return _problem(501, "Not implemented", "VALIDATION_FAILED")


@app.post("/api/export/sqlite")
async def export_sqlite(request: Request) -> dict[str, Any]:
    """Export dataset as SQLite."""
    return _problem(501, "Not implemented", "VALIDATION_FAILED")


def _problem(status: int, detail: str, code: str) -> JSONResponse:
    """RFC 9457 problem+json error response."""
    return JSONResponse(
        status_code=status,
        content={
            "type": "about:blank",
            "title": detail,
            "status": status,
            "detail": detail,
            "code": code,
        },
        media_type="application/problem+json",
    )
