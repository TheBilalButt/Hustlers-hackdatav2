"""FastAPI application — Vercel serverless entry point.

All routes under /api. Errors use RFC 9457 problem+json.
Reference: TRD §10.
"""
from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from synth.config import settings

app = FastAPI(
    title="HackDataV2 Synthetic Data Platform",
    version=settings.engine_version,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten for production
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health() -> dict:
    return {
        "status": "ok",
        "engine_version": settings.engine_version,
        "offline": settings.offline_mode,
    }


@app.post("/api/profile")
async def profile(request: Request) -> dict:
    """Profile an uploaded CSV or JSON sample."""
    # TODO: implement (FR-09)
    return _problem(501, "Not implemented", "VALIDATION_FAILED")


@app.post("/api/plan")
async def plan(request: Request) -> dict:
    """Generate or refine an IR from a prompt or profile."""
    # TODO: implement (FR-10)
    return _problem(501, "Not implemented", "VALIDATION_FAILED")


@app.post("/api/preview")
async def preview(request: Request) -> dict:
    """Generate a 50-row preview."""
    # TODO: implement (FR-18)
    return _problem(501, "Not implemented", "VALIDATION_FAILED")


@app.post("/api/generate")
async def generate(request: Request) -> dict:
    """Generate a block of rows for a table."""
    # TODO: implement (FR-01, FR-03)
    return _problem(501, "Not implemented", "VALIDATION_FAILED")


@app.post("/api/trust")
async def trust(request: Request) -> dict:
    """Compute the Trust Report."""
    # TODO: implement (FR-12)
    return _problem(501, "Not implemented", "VALIDATION_FAILED")


@app.post("/api/documents")
async def documents(request: Request) -> dict:
    """Generate invoice or statement PDFs."""
    # TODO: implement (FR-06, FR-07)
    return _problem(501, "Not implemented", "VALIDATION_FAILED")


@app.post("/api/query/parse")
async def query_parse(request: Request) -> dict:
    """Parse a statement query into DSL."""
    # TODO: implement (FR-08)
    return _problem(501, "Not implemented", "VALIDATION_FAILED")


@app.post("/api/export/sqlite")
async def export_sqlite(request: Request) -> dict:
    """Export dataset as SQLite."""
    # TODO: implement (FR-13)
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
