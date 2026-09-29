"""Data models for Trust Report cards and metrics (TRD ?7)."""

from __future__ import annotations

import json
from typing import Literal

from pydantic import BaseModel, ConfigDict

Verdict = Literal["pass", "warn", "fail", "n_a"]


class MetricResult(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str
    value: float | str | None
    threshold: str
    verdict: Verdict
    detail: str = ""


class TrustCard(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: Literal["correct", "realistic", "safe"]
    verdict: Verdict
    reason: str
    metrics: list[MetricResult]


class TrustReport(BaseModel):
    model_config = ConfigDict(extra="forbid")
    cards: list[TrustCard]
    engine_version: str
    dataset_hash: str

    def to_json(self, indent: int = 2) -> str:
        """Export report to validated JSON string."""
        return json.dumps(self.model_dump(), indent=indent)
