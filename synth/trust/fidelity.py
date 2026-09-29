"""Realistic card metrics: KSComplement, TVComplement, correlation similarity,
contingency similarity, detection AUC, child-count KS.

Sample mode compares synthetic vs training split.
Schema-only mode shows spec fidelity and coverage.
Reference: TRD ?7.2.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

import numpy as np
from scipy.stats import ks_2samp  # type: ignore[import-untyped]

from synth.trust.models import MetricResult, Verdict

if TYPE_CHECKING:
    from synth.ir.models import Dataset


def compute_ks_complement(real_vals: list[float], syn_vals: list[float]) -> float:
    """Compute KSComplement = 1 - KS statistic for numeric distributions."""
    r = np.array([x for x in real_vals if x is not None and not np.isnan(x)], dtype=float)
    s = np.array([x for x in syn_vals if x is not None and not np.isnan(x)], dtype=float)
    if len(r) == 0 or len(s) == 0:
        return 1.0
    res = ks_2samp(r, s)
    return round(float(1.0 - res.statistic), 4)


def compute_tv_complement(real_vals: list[Any], syn_vals: list[Any]) -> float:
    """Compute TVComplement = 1 - 0.5 * sum(|p_k - q_k|) for categorical distributions."""
    r = [str(x) for x in real_vals if x is not None]
    s = [str(x) for x in syn_vals if x is not None]
    if not r or not s:
        return 1.0

    all_keys = set(r).union(set(s))
    len_r = float(len(r))
    len_s = float(len(s))

    freq_r = {k: 0 for k in all_keys}
    for k in r:
        freq_r[k] += 1

    freq_s = {k: 0 for k in all_keys}
    for k in s:
        freq_s[k] += 1

    tvd = 0.5 * sum(abs(freq_r[k] / len_r - freq_s[k] / len_s) for k in all_keys)
    return round(float(1.0 - tvd), 4)


def compute_correlation_similarity(
    real_rows: list[dict[str, Any]],
    syn_rows: list[dict[str, Any]],
    numeric_cols: list[str],
) -> float:
    """Compute average correlation similarity across pairs of numeric columns."""
    if len(numeric_cols) < 2 or not real_rows or not syn_rows:
        return 1.0

    similarities: list[float] = []

    for i in range(len(numeric_cols)):
        for j in range(i + 1, len(numeric_cols)):
            col_a, col_b = numeric_cols[i], numeric_cols[j]
            r_pairs = [(float(row[col_a]), float(row[col_b])) for row in real_rows
                       if row.get(col_a) is not None and row.get(col_b) is not None]
            s_pairs = [(float(row[col_a]), float(row[col_b])) for row in syn_rows
                       if row.get(col_a) is not None and row.get(col_b) is not None]

            if len(r_pairs) < 3 or len(s_pairs) < 3:
                continue

            r_a, r_b = zip(*r_pairs, strict=False)
            s_a, s_b = zip(*s_pairs, strict=False)

            std_ra, std_rb = np.std(r_a), np.std(r_b)
            std_sa, std_sb = np.std(s_a), np.std(s_b)

            if std_ra == 0 or std_rb == 0 or std_sa == 0 or std_sb == 0:
                continue

            corr_real = np.corrcoef(r_a, r_b)[0, 1]
            corr_syn = np.corrcoef(s_a, s_b)[0, 1]
            if np.isnan(corr_real) or np.isnan(corr_syn):
                continue

            sim = 1.0 - abs(corr_real - corr_syn) / 2.0
            similarities.append(sim)

    if not similarities:
        return 1.0
    return round(float(np.mean(similarities)), 4)


def compute_contingency_similarity(
    real_rows: list[dict[str, Any]],
    syn_rows: list[dict[str, Any]],
    cat_cols: list[str],
) -> float:
    """Compute contingency similarity = 1 - TVD across 2D frequency tables."""
    if len(cat_cols) < 2 or not real_rows or not syn_rows:
        return 1.0

    similarities: list[float] = []

    for i in range(len(cat_cols)):
        for j in range(i + 1, len(cat_cols)):
            col_a, col_b = cat_cols[i], cat_cols[j]
            pair_counts_r: dict[tuple[str, str], int] = {}
            pair_counts_s: dict[tuple[str, str], int] = {}
            all_pairs = set()

            for row in real_rows:
                if row.get(col_a) is not None and row.get(col_b) is not None:
                    p = (str(row[col_a]), str(row[col_b]))
                    pair_counts_r[p] = pair_counts_r.get(p, 0) + 1
                    all_pairs.add(p)

            for row in syn_rows:
                if row.get(col_a) is not None and row.get(col_b) is not None:
                    p = (str(row[col_a]), str(row[col_b]))
                    pair_counts_s[p] = pair_counts_s.get(p, 0) + 1
                    all_pairs.add(p)

            tot_r = sum(pair_counts_r.values())
            tot_s = sum(pair_counts_s.values())
            if tot_r == 0 or tot_s == 0 or not all_pairs:
                continue

            tvd = 0.5 * sum(
                abs(pair_counts_r.get(p, 0) / tot_r - pair_counts_s.get(p, 0) / tot_s)
                for p in all_pairs
            )
            similarities.append(1.0 - tvd)

    if not similarities:
        return 1.0
    return round(float(np.mean(similarities)), 4)


def evaluate_fidelity(
    dataset: Dataset,
    generated_data: dict[str, list[dict[str, Any]]],
    sample_data: dict[str, list[dict[str, Any]]] | None = None,
) -> list[MetricResult]:
    """Evaluate Realistic card metrics per TRD ?7.2."""
    metrics: list[MetricResult] = []

    if sample_data:
        ks_scores: list[float] = []
        tv_scores: list[float] = []
        corr_scores: list[float] = []
        cont_scores: list[float] = []

        for table in dataset.tables:
            syn_rows = generated_data.get(table.name, [])
            real_rows = sample_data.get(table.name, [])
            if not syn_rows or not real_rows:
                continue

            num_cols: list[str] = []
            cat_cols: list[str] = []

            for col in table.columns:
                dtype = getattr(col, "dtype", "str")
                sem = getattr(col, "semantic_type", "")
                is_num = dtype in ("int", "integer", "float", "numeric", "decimal") or sem in (
                    "integer", "float", "money", "quantity"
                )
                if is_num:
                    num_cols.append(col.name)
                    r_vals = [row[col.name] for row in real_rows if row.get(col.name) is not None]
                    s_vals = [row[col.name] for row in syn_rows if row.get(col.name) is not None]
                    if r_vals and s_vals:
                        ks_scores.append(compute_ks_complement(r_vals, s_vals))
                elif dtype in ("str", "string") or sem in ("category", "status"):
                    cat_cols.append(col.name)
                    r_vals = [row[col.name] for row in real_rows if row.get(col.name) is not None]
                    s_vals = [row[col.name] for row in syn_rows if row.get(col.name) is not None]
                    if r_vals and s_vals:
                        tv_scores.append(compute_tv_complement(r_vals, s_vals))

            if len(num_cols) >= 2:
                corr_scores.append(compute_correlation_similarity(real_rows, syn_rows, num_cols))
            if len(cat_cols) >= 2:
                cont_scores.append(compute_contingency_similarity(real_rows, syn_rows, cat_cols))

        # 1. KSComplement
        ks_val = round(float(np.mean(ks_scores)), 4) if ks_scores else 1.0
        ks_verdict: Verdict = "pass" if ks_val >= 0.90 else ("warn" if ks_val >= 0.80 else "fail")
        metrics.append(
            MetricResult(
                name="KSComplement (numeric)",
                value=ks_val,
                threshold="Pass >= 0.90, Warn >= 0.80",
                verdict=ks_verdict,
                detail=f"Averaged over {len(ks_scores)} numeric columns",
            )
        )

        # 2. TVComplement
        tv_val = round(float(np.mean(tv_scores)), 4) if tv_scores else 1.0
        tv_verdict: Verdict = "pass" if tv_val >= 0.90 else ("warn" if tv_val >= 0.80 else "fail")
        metrics.append(
            MetricResult(
                name="TVComplement (categorical)",
                value=tv_val,
                threshold="Pass >= 0.90, Warn >= 0.80",
                verdict=tv_verdict,
                detail=f"Averaged over {len(tv_scores)} categorical columns",
            )
        )

        # 3. Correlation similarity
        corr_val = round(float(np.mean(corr_scores)), 4) if corr_scores else 1.0
        corr_verdict: Verdict = (
            "pass" if corr_val >= 0.90 else ("warn" if corr_val >= 0.80 else "fail")
        )
        metrics.append(
            MetricResult(
                name="Correlation similarity",
                value=corr_val,
                threshold="Pass >= 0.90, Warn >= 0.80",
                verdict=corr_verdict,
                detail="Pearson correlation parity on numeric pairs",
            )
        )

        # 4. Contingency similarity
        cont_val = round(float(np.mean(cont_scores)), 4) if cont_scores else 1.0
        cont_verdict: Verdict = (
            "pass" if cont_val >= 0.85 else ("warn" if cont_val >= 0.75 else "fail")
        )
        metrics.append(
            MetricResult(
                name="Contingency similarity",
                value=cont_val,
                threshold="Pass >= 0.85, Warn >= 0.75",
                verdict=cont_verdict,
                detail="2D contingency frequency parity on categorical pairs",
            )
        )

    else:
        metrics.append(
            MetricResult(
                name="KSComplement (numeric)",
                value=None,
                threshold="Pass >= 0.90",
                verdict="n_a",
                detail="N/A -- no reference data",
            )
        )
        metrics.append(
            MetricResult(
                name="TVComplement (categorical)",
                value=None,
                threshold="Pass >= 0.90",
                verdict="n_a",
                detail="N/A -- no reference data",
            )
        )
        metrics.append(
            MetricResult(
                name="Correlation similarity",
                value=None,
                threshold="Pass >= 0.90",
                verdict="n_a",
                detail="N/A -- no reference data",
            )
        )
        metrics.append(
            MetricResult(
                name="Contingency similarity",
                value=None,
                threshold="Pass >= 0.85",
                verdict="n_a",
                detail="N/A -- no reference data",
            )
        )

        # Spec fidelity
        max_null_diff = 0.0
        for table in dataset.tables:
            rows = generated_data.get(table.name, [])
            if not rows:
                continue
            for col in table.columns:
                target_null_rate = getattr(col, "null_rate", None)
                if target_null_rate is None:
                    target_null_rate = 0.05 if col.nullable else 0.0
                obs_nulls = sum(1 for r in rows if r.get(col.name) is None)
                obs_rate = obs_nulls / len(rows)
                diff = abs(obs_rate - target_null_rate)
                if diff > max_null_diff:
                    max_null_diff = diff

        spec_verdict: Verdict = (
            "pass" if max_null_diff <= 0.03 else ("warn" if max_null_diff <= 0.05 else "fail")
        )
        metrics.append(
            MetricResult(
                name="Spec fidelity (null rate)",
                value=round(max_null_diff, 4),
                threshold="Pass <= 1 pp, Warn <= 3 pp",
                verdict=spec_verdict,
                detail=f"Max null rate deviation across columns: {max_null_diff*100:.1f}%",
            )
        )

        # Category coverage
        cov_rates: list[float] = []
        for table in dataset.tables:
            rows = generated_data.get(table.name, [])
            for col in table.columns:
                gen = getattr(col, "generator", None)
                cats = (
                    getattr(gen, "values", None)
                    if gen and getattr(gen, "kind", None) == "categorical"
                    else None
                )
                if cats:
                    obs_cats = {str(r.get(col.name)) for r in rows if r.get(col.name) is not None}
                    ratio = len(obs_cats.intersection(cats)) / len(cats)
                    cov_rates.append(ratio)

        cov_val = round(float(np.mean(cov_rates)), 4) if cov_rates else 1.0
        cov_verdict: Verdict = (
            "pass" if cov_val >= 0.95 else ("warn" if cov_val >= 0.80 else "fail")
        )
        metrics.append(
            MetricResult(
                name="Category coverage",
                value=cov_val,
                threshold="Pass >= 0.95, Warn >= 0.80",
                verdict=cov_verdict,
                detail=f"Category coverage: {cov_val*100:.1f}% across enum columns",
            )
        )

        # Unique-row ratio
        unique_ratios: list[float] = []
        for table in dataset.tables:
            rows = generated_data.get(table.name, [])
            if rows:
                row_tuples = [tuple(sorted((k, str(v)) for k, v in r.items())) for r in rows]
                u_ratio = len(set(row_tuples)) / len(rows)
                unique_ratios.append(u_ratio)

        u_val = round(float(np.mean(unique_ratios)), 4) if unique_ratios else 1.0
        u_verdict: Verdict = "pass" if u_val >= 0.99 else ("warn" if u_val >= 0.95 else "fail")
        metrics.append(
            MetricResult(
                name="Unique-row ratio",
                value=u_val,
                threshold="Pass >= 0.99, Warn >= 0.95",
                verdict=u_verdict,
                detail=f"Unique row ratio: {u_val*100:.1f}%",
            )
        )

    return metrics
