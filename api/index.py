"""FastAPI application — Vercel serverless entry point.

All routes under /api. Errors use RFC 9457 problem+json.
Reference: TRD § 10.
"""
from __future__ import annotations

from typing import Any

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from synth.config import settings
from synth.engines.relational import generate_relational
from synth.engines.tabular import compute_dataset_hash, generate_table
from synth.export.bundle import create_export_bundle
from synth.export.sql import generate_dataset_sql
from synth.export.sqlite import export_sqlite_bytes
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


def _get_dataset_rows(dataset: Dataset) -> dict[str, list[dict[str, Any]]]:
    if dataset.relationships or dataset.invariants:
        return generate_relational(dataset)
    return {t.name: generate_table(dataset, t.name) for t in dataset.tables}


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
    """Generate a preview (up to limit rows) for tables in the dataset (FR-18, FR-03)."""
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
        if dataset.relationships or dataset.invariants:
            rows_per_table = generate_relational(dataset, max_rows=limit)
        else:
            rows_per_table = {}
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


@app.post("/api/generate")
async def generate(request: Request) -> Any:
    """Generate full dataset rows for all tables (FR-01, FR-03)."""
    try:
        body = await request.json()
    except Exception:
        return _problem(400, "Invalid JSON body", "BAD_REQUEST")

    try:
        raw_ds = body.get("dataset", body) if isinstance(body, dict) else body
        dataset = Dataset.model_validate(raw_ds)
    except Exception as e:
        return _problem(422, f"Validation error: {e}", "VALIDATION_FAILED")

    try:
        rows = _get_dataset_rows(dataset)
        dataset_hash = compute_dataset_hash(dataset, rows)
        return {
            "rows": rows,
            "hash": dataset_hash,
            "seed": dataset.seed,
        }
    except ValueError as e:
        valid_codes = ("LIMIT_ROWS", "LIMIT_FANOUT", "LIMIT_SCHEMA")
        code = str(e) if str(e) in valid_codes else "GENERATION_FAILED"
        return _problem(400, f"Generation error: {e}", code)


@app.post("/api/export/sql")
async def export_sql(request: Request) -> Any:
    """Export complete SQL DDL and INSERT script (FR-13)."""
    try:
        body = await request.json()
        raw_ds = body.get("dataset", body)
        dataset = Dataset.model_validate(raw_ds)
    except Exception as e:
        return _problem(422, f"Validation error: {e}", "VALIDATION_FAILED")

    rows = _get_dataset_rows(dataset)
    sql_text = generate_dataset_sql(dataset, rows)
    clean_name = dataset.name.replace(" ", "_")
    return Response(
        content=sql_text,
        media_type="application/sql",
        headers={"Content-Disposition": f'attachment; filename="{clean_name}.sql"'},
    )


@app.post("/api/export/sqlite")
async def export_sqlite(request: Request) -> Any:
    """Export binary SQLite database file (FR-13)."""
    try:
        body = await request.json()
        raw_ds = body.get("dataset", body)
        dataset = Dataset.model_validate(raw_ds)
    except Exception as e:
        return _problem(422, f"Validation error: {e}", "VALIDATION_FAILED")

    rows = _get_dataset_rows(dataset)
    db_bytes = export_sqlite_bytes(dataset, rows)
    clean_name = dataset.name.replace(" ", "_")
    return Response(
        content=db_bytes,
        media_type="application/vnd.sqlite3",
        headers={"Content-Disposition": f'attachment; filename="{clean_name}.sqlite"'},
    )


@app.post("/api/export/bundle")
async def export_bundle(request: Request) -> Any:
    """Export complete ZIP archive bundle with all formats and manifests (FR-13)."""
    try:
        body = await request.json()
        raw_ds = body.get("dataset", body)
        dataset = Dataset.model_validate(raw_ds)
    except Exception as e:
        return _problem(422, f"Validation error: {e}", "VALIDATION_FAILED")

    rows = _get_dataset_rows(dataset)
    zip_bytes = create_export_bundle(dataset, rows)
    clean_name = dataset.name.replace(" ", "_")
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{clean_name}_bundle.zip"'},
    )


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


@app.post("/api/trust")
async def trust(request: Request) -> dict[str, Any]:
    """Compute the Trust Report."""
    return _problem(501, "Not implemented", "VALIDATION_FAILED")


@app.post("/api/documents")
async def documents(request: Request) -> dict[str, Any]:
    """Generate invoice or statement PDFs."""
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