"""Trust Report assembly.

Combines Correct, Realistic, and Safe cards with verdicts.
Verdicts: Pass / Warn / Fail / N-A.
A card's verdict is the worst of its metrics, ignoring N-A.
Reference: TRD §7, FR-12.
"""

from __future__ import annotations

from typing import Any, Literal

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


def build_report(
    dataset: Any,
    generated_data: dict[str, Any],
    sample_data: dict[str, Any] | None = None,
) -> TrustReport:
    """Compute the full Trust Report for a generated dataset."""
    # TODO: implement report builder
    raise NotImplementedError
