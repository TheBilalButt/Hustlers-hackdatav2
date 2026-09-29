"""Trust Report computation: validity, fidelity, privacy, relational metrics."""

from synth.trust.fidelity import (
    compute_contingency_similarity,
    compute_correlation_similarity,
    compute_ks_complement,
    compute_tv_complement,
    evaluate_fidelity,
)
from synth.trust.models import MetricResult, TrustCard, TrustReport, Verdict
from synth.trust.privacy import evaluate_privacy
from synth.trust.report import build_report
from synth.trust.validity import evaluate_validity

__all__ = [
    "MetricResult",
    "TrustCard",
    "TrustReport",
    "Verdict",
    "build_report",
    "compute_contingency_similarity",
    "compute_correlation_similarity",
    "compute_ks_complement",
    "compute_tv_complement",
    "evaluate_fidelity",
    "evaluate_privacy",
    "evaluate_validity",
]
