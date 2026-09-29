"""FastAPI application - Vercel serverless entry point.

All routes under /api. Errors use RFC 9457 problem+json.
Reference: TRD §10.
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
from synth.export.csv_safe import export_csv
from synth.export.jsonl import export_jsonl
from synth.export.sql import generate_dataset_sql
from synth.export.sqlite import export_sqlite_bytes
from synth.ir.models import Dataset
from synth.llm.router import LLMRouter
from synth.profiler.profile import profile_columns, profile_to_ir
from synth.security.uploads import MAX_UPLOAD_BYTES, parse_upload_rows, validate_upload

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
        return _problem(400, "Invalid JSON body", "VALIDATION_FAILED")

    # Handle {"recipe": ...}, {"dataset": ...}, or top-level Dataset dict
    raw_recipe = None
    limit_val = 50
    if isinstance(body, dict):
        raw_recipe = body.get("recipe") or body.get("dataset") or body
        if "limit" in body:
            try:
                limit_val = int(body["limit"])
            except (ValueError, TypeError):
                limit_val = 50
    else:
        raw_recipe = body

    try:
        dataset = Dataset.model_validate(raw_recipe)
    except Exception as err:
        return _problem(422, f"Invalid recipe IR: {err}", "VALIDATION_FAILED")

    try:
        all_tables_rows = _get_dataset_rows(dataset)
        tables_preview = {name: rows[:limit_val] for name, rows in all_tables_rows.items()}
        row_plan = {name: len(rows) for name, rows in all_tables_rows.items()}
        dataset_hash = compute_dataset_hash(dataset, all_tables_rows)

        total_est_bytes = sum(len(r) * 64 for r in all_tables_rows.values())

        return {
            "tables": tables_preview,
            "rows": tables_preview,
            "row_plan": row_plan,
            "est_bytes": total_est_bytes,
            "correct": True,
            "hash": dataset_hash,
            "seed": dataset.seed,
        }
    except Exception as e:
        return _problem(500, f"Preview generation failed: {e}", "GENERATION_FAILED")


@app.post("/api/generate")
async def generate(request: Request) -> Any:
    """Generate a data chunk for a table in requested format (FR-01, FR-03, FR-13)."""
    try:
        body = await request.json()
    except Exception:
        return _problem(400, "Invalid JSON body", "VALIDATION_FAILED")

    raw_recipe = body.get("recipe") or body.get("dataset")
    table_name = body.get("table")
    fmt = body.get("format", "csv").lower()

    if not raw_recipe or not table_name:
        return _problem(400, "Missing 'recipe' or 'table' in request", "VALIDATION_FAILED")

    try:
        dataset = Dataset.model_validate(raw_recipe)
    except Exception as err:
        return _problem(422, f"Invalid recipe IR: {err}", "VALIDATION_FAILED")

    try:
        all_rows = _get_dataset_rows(dataset)
        rows = all_rows.get(table_name, [])
        table_obj = next((t for t in dataset.tables if t.name == table_name), None)
        if table_obj:
            columns = [c.name for c in table_obj.columns]
        else:
            columns = list(rows[0].keys()) if rows else []

        if fmt == "csv":
            content = export_csv(rows, columns)
            media_type = "text/csv; charset=utf-8"
        elif fmt == "jsonl":
            content = export_jsonl(rows)
            media_type = "application/x-ndjson; charset=utf-8"
        elif fmt == "sql":
            content = generate_dataset_sql(dataset, all_rows)
            media_type = "application/sql; charset=utf-8"
        else:
            return _problem(400, f"Unsupported format: {fmt}", "VALIDATION_FAILED")

        return Response(
            content=content,
            media_type=media_type,
            headers={
                "X-Block-Range": f"0-{len(rows)}",
                "Content-Disposition": f'attachment; filename="{table_name}.{fmt}"',
            },
        )
    except Exception as e:
        return _problem(500, f"Generation failed: {e}", "GENERATION_FAILED")


@app.post("/api/export/sql")
async def export_sql(request: Request) -> Any:
    """Export dataset as full SQL DDL and INSERT statements (FR-13)."""
    try:
        body = await request.json()
        raw_recipe = body.get("recipe") or body.get("dataset") or body
        dataset = Dataset.model_validate(raw_recipe)
        all_rows = _get_dataset_rows(dataset)
        sql_content = generate_dataset_sql(dataset, all_rows)
        return Response(
            content=sql_content,
            media_type="application/sql; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{dataset.name}.sql"'},
        )
    except Exception as err:
        return _problem(422, f"SQL export failed: {err}", "VALIDATION_FAILED")


@app.post("/api/export/sqlite")
async def export_sqlite(request: Request) -> Any:
    """Export dataset as a binary .sqlite database (FR-13)."""
    try:
        body = await request.json()
        raw_recipe = body.get("recipe") or body.get("dataset") or body
        dataset = Dataset.model_validate(raw_recipe)
        all_rows = _get_dataset_rows(dataset)
        sqlite_bytes = export_sqlite_bytes(dataset, all_rows)
        if len(sqlite_bytes) > 4 * 1024 * 1024:
            msg = "SQLite database exceeds 4 MB limit; use .sql export instead"
            return _problem(413, msg, "LIMIT_ROWS")
        return Response(
            content=sqlite_bytes,
            media_type="application/x-sqlite3",
            headers={"Content-Disposition": f'attachment; filename="{dataset.name}.sqlite"'},
        )
    except Exception as err:
        return _problem(422, f"SQLite export failed: {err}", "VALIDATION_FAILED")


@app.post("/api/export/bundle")
async def export_bundle(request: Request) -> Any:
    """Export dataset as a comprehensive ZIP bundle (FR-13)."""
    try:
        body = await request.json()
        raw_recipe = body.get("recipe") or body.get("dataset") or body
        dataset = Dataset.model_validate(raw_recipe)
        all_rows = _get_dataset_rows(dataset)
        zip_bytes = create_export_bundle(dataset, all_rows)
        return Response(
            content=zip_bytes,
            media_type="application/zip",
            headers={"Content-Disposition": f'attachment; filename="{dataset.name}_bundle.zip"'},
        )
    except Exception as err:
        return _problem(422, f"Bundle export failed: {err}", "VALIDATION_FAILED")


@app.post("/api/plan")
async def plan(request: Request) -> Any:
    """Invoke the LLM router for dataset planning or prompt-to-IR (FR-10, FR-16)."""
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
async def profile(request: Request) -> Any:
    """Profile an uploaded CSV or JSON sample (FR-09, TRD §2, §10, RT-18..RT-21, RT-26)."""
    content_type = request.headers.get("content-type", "").lower()
    filename = request.headers.get("x-filename", "sample.csv")
    file_bytes = b""

    if "multipart/form-data" in content_type:
        form = await request.form()
        uploaded_file = form.get("file")
        if not uploaded_file:
            return _problem(400, "No file provided in multipart upload", "UPLOAD_REJECTED")
        if hasattr(uploaded_file, "filename") and uploaded_file.filename:
            filename = uploaded_file.filename
        if hasattr(uploaded_file, "read"):
            file_bytes = await uploaded_file.read()
    elif "json" in content_type:
        raw_body = await request.body()
        try:
            body = await request.json()
            if isinstance(body, dict) and "content" in body:
                filename = body.get("filename", filename)
                raw_text = body["content"]
                file_bytes = raw_text.encode("utf-8") if isinstance(raw_text, str) else b""
            else:
                # Raw JSON array or object
                file_bytes = raw_body
                if not filename.endswith(".json"):
                    filename = "sample.json"
        except Exception:
            file_bytes = raw_body
    else:
        # text/csv, application/octet-stream, etc.
        file_bytes = await request.body()
        if not (filename.endswith(".csv") or filename.endswith(".json")):
            filename = "sample.csv"

    if len(file_bytes) > MAX_UPLOAD_BYTES:
        return _problem(413, "Upload exceeds 4 MB limit (UPLOAD_TOO_LARGE)", "UPLOAD_TOO_LARGE")

    ok, err_msg = validate_upload(file_bytes, filename)
    if not ok:
        status_code = 413 if "UPLOAD_TOO_LARGE" in err_msg else 400
        code = "UPLOAD_TOO_LARGE" if "UPLOAD_TOO_LARGE" in err_msg else "UPLOAD_REJECTED"
        return _problem(status_code, err_msg, code)

    try:
        rows, columns, warnings = parse_upload_rows(file_bytes, filename)
        if not columns:
            return _problem(400, "No valid columns found in sample file", "UPLOAD_REJECTED")

        table_name = filename.rsplit(".", 1)[0].lower()
        profile_res = profile_columns(rows, columns, table_name=table_name)
        ir = profile_to_ir(profile_res, table_name=table_name, dataset_name=f"Sample: {table_name}")

        return {
            "profile": profile_res,
            "ir": ir.model_dump(mode="json"),
            "warnings": warnings,
        }
    except Exception as err:
        return _problem(400, f"Profiling failed: {err}", "UPLOAD_REJECTED")


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