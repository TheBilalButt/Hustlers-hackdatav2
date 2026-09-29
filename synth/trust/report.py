"""Trust Report assembly.

Combines Correct, Realistic, and Safe cards with verdicts.
Verdicts: Pass / Warn / Fail / N-A.
A card's verdict is the worst of its metrics, ignoring N-A.
Reference: TRD ?7, FR-12.
"""

from __future__ import annotations

import hashlib
import json
from typing import TYPE_CHECKING, Any

from synth.trust.fidelity import evaluate_fidelity
from synth.trust.models import MetricResult, TrustCard, TrustReport, Verdict
from synth.trust.privacy import evaluate_privacy
from synth.trust.validity import evaluate_validity

if TYPE_CHECKING:
    from synth.ir.models import Dataset


def aggregate_verdict(metrics: list[MetricResult]) -> tuple[Verdict, str]:
    """Determine card verdict: worst of its non-N/A metrics."""
    active = [m for m in metrics if m.verdict != "n_a"]
    if not active:
        return "n_a", "All metrics are N/A"

    if any(m.verdict == "fail" for m in active):
        fails = [m.name for m in active if m.verdict == "fail"]
        return "fail", f"Violations detected in: {', '.join(fails)}"

    if any(m.verdict == "warn" for m in active):
        warns = [m.name for m in active if m.verdict == "warn"]
        return "warn", f"Advisory thresholds reached in: {', '.join(warns)}"

    return "pass", "All evaluated checks passed within tolerance"


def build_report(
    dataset: Dataset,
    generated_data: dict[str, list[dict[str, Any]]],
    sample_data: dict[str, list[dict[str, Any]]] | None = None,
    holdout_data: dict[str, list[dict[str, Any]]] | None = None,
    generated_docs: list[Any] | None = None,
    engine_version: str = "0.1.0",
) -> TrustReport:
    """Compute the full Trust Report for a generated dataset (FR-12)."""
    # 1. Correct Card
    validity_metrics = evaluate_validity(dataset, generated_data)
    v_verdict, v_reason = aggregate_verdict(validity_metrics)
    correct_card = TrustCard(
        name="correct",
        verdict=v_verdict,
        reason=v_reason,
        metrics=validity_metrics,
    )

    # 2. Realistic Card
    fidelity_metrics = evaluate_fidelity(dataset, generated_data, sample_data)
    f_verdict, f_reason = aggregate_verdict(fidelity_metrics)
    realistic_card = TrustCard(
        name="realistic",
        verdict=f_verdict,
        reason=f_reason,
        metrics=fidelity_metrics,
    )

    # 3. Safe Card
    privacy_metrics = evaluate_privacy(
        dataset, generated_data, sample_data, holdout_data, generated_docs
    )
    p_verdict, p_reason = aggregate_verdict(privacy_metrics)
    safe_card = TrustCard(
        name="safe",
        verdict=p_verdict,
        reason=p_reason,
        metrics=privacy_metrics,
    )

    # Deterministic hash of dataset
    data_str = json.dumps(generated_data, sort_keys=True, default=str)
    ds_hash = hashlib.sha256(data_str.encode("utf-8")).hexdigest()[:16]

    return TrustReport(
        cards=[correct_card, realistic_card, safe_card],
        engine_version=engine_version,
        dataset_hash=ds_hash,
    )
