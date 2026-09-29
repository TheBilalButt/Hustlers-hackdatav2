"""Pydantic models for each LLM task output.

Every model uses extra="forbid" so unexpected fields are rejected.
Reference: TRD section 9.1.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class ColumnLabel(BaseModel):
    model_config = ConfigDict(extra="forbid")
    column_name: str
    semantic_type: str
    dtype: str
    generator_kind: str


class ColumnLabels(BaseModel):
    model_config = ConfigDict(extra="forbid")
    labels: list[ColumnLabel]


class QueryDSL(BaseModel):
    model_config = ConfigDict(extra="forbid")
    period: dict[str, int | str] | None = None
    constraints: list[dict[str, str | float]] = []
    include_mcc: list[str] = []
    exclude_mcc: list[str] = []
    min_transactions: int | None = None


class EdgeCase(BaseModel):
    model_config = ConfigDict(extra="forbid")
    catalog_type: str
    table: str
    column: str
    description: str
