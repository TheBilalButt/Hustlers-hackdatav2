"""Metric parity tests comparing custom implementations against SDMetrics (dev-only).

Reference: TRD ?7.4, AGENTS.md.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sdmetrics.column_pairs import ContingencySimilarity, CorrelationSimilarity
from sdmetrics.single_column import KSComplement, TVComplement

from synth.trust import (
    compute_contingency_similarity,
    compute_correlation_similarity,
    compute_ks_complement,
    compute_tv_complement,
)


def test_parity_single_column_numeric():
    """Verify KSComplement matches SDMetrics exactly within 1e-4."""
    np.random.seed(999)
    r = pd.Series(np.random.exponential(scale=5.0, size=500))
    s = pd.Series(np.random.exponential(scale=5.2, size=500))

    sd_val = KSComplement.compute(r, s)
    our_val = compute_ks_complement(r.tolist(), s.tolist())
    assert abs(sd_val - our_val) < 1e-4


def test_parity_single_column_categorical():
    """Verify TVComplement matches SDMetrics exactly within 1e-4."""
    np.random.seed(888)
    cats = ["apple", "banana", "cherry", "date"]
    r = pd.Series(np.random.choice(cats, size=400, p=[0.4, 0.3, 0.2, 0.1]))
    s = pd.Series(np.random.choice(cats, size=400, p=[0.38, 0.31, 0.22, 0.09]))

    sd_val = TVComplement.compute(r, s)
    our_val = compute_tv_complement(r.tolist(), s.tolist())
    assert abs(sd_val - our_val) < 1e-4


def test_parity_column_pairs():
    """Verify Correlation and Contingency similarity match SDMetrics within 1e-4."""
    np.random.seed(777)
    df_r = pd.DataFrame({
        "num1": np.random.uniform(0, 100, 200),
        "num2": np.random.uniform(50, 150, 200),
        "cat1": np.random.choice(["X", "Y"], 200),
        "cat2": np.random.choice(["M", "N"], 200),
    })
    df_s = pd.DataFrame({
        "num1": np.random.uniform(5, 105, 200),
        "num2": np.random.uniform(45, 145, 200),
        "cat1": np.random.choice(["X", "Y"], 200),
        "cat2": np.random.choice(["M", "N"], 200),
    })

    # Correlation
    sd_corr = CorrelationSimilarity.compute(df_r[["num1", "num2"]], df_s[["num1", "num2"]])
    our_corr = compute_correlation_similarity(
        df_r.to_dict(orient="records"),
        df_s.to_dict(orient="records"),
        ["num1", "num2"],
    )
    assert abs(sd_corr - our_corr) < 1e-4

    # Contingency
    sd_cont = ContingencySimilarity.compute(df_r[["cat1", "cat2"]], df_s[["cat1", "cat2"]])
    our_cont = compute_contingency_similarity(
        df_r.to_dict(orient="records"),
        df_s.to_dict(orient="records"),
        ["cat1", "cat2"],
    )
    assert abs(sd_cont - our_cont) < 1e-4
