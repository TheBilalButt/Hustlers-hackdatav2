"""Unit and integration tests for FR-12 (Trust Report).

Covers T-12a (parity & metrics), T-12b (schema-only N/A behavior),
T-12c (thresholds & aggregation), and RT-25 (tampered data detection).
"""

from __future__ import annotations

import io
import zipfile

import httpx
import numpy as np
import pandas as pd
import pytest
from sdmetrics.column_pairs import ContingencySimilarity, CorrelationSimilarity
from sdmetrics.single_column import KSComplement, TVComplement

from api.index import app
from synth.ir.models import (
    Cardinality,
    CategoricalGenerator,
    Column,
    Dataset,
    FakerGenerator,
    ForeignKeyGenerator,
    NumericGenerator,
    Relationship,
    SequenceGenerator,
    Table,
)
from synth.trust import (
    TrustReport,
    build_report,
    compute_contingency_similarity,
    compute_correlation_similarity,
    compute_ks_complement,
    compute_tv_complement,
)


def _make_dummy_dataset() -> Dataset:
    return Dataset(
        ir_version="1.0",
        name="test_shop",
        mode="schema_only",
        seed=42,
        locale="en_US",
        tables=[
            Table(
                name="users",
                row_count=50,
                columns=[
                    Column(
                        name="id",
                        semantic_type="id",
                        dtype="int",
                        generator=SequenceGenerator(kind="sequence", start=1),
                        pk=True,
                    ),
                    Column(
                        name="email",
                        semantic_type="email",
                        dtype="str",
                        generator=FakerGenerator(kind="faker", provider="email"),
                    ),
                    Column(
                        name="age",
                        semantic_type="integer",
                        dtype="int",
                        generator=NumericGenerator(
                            kind="numeric", dist="normal", min_val=18, max_val=80
                        ),
                    ),
                    Column(
                        name="plan",
                        semantic_type="category",
                        dtype="str",
                        generator=CategoricalGenerator(
                            kind="categorical", values=["free", "pro", "enterprise"]
                        ),
                    ),
                ],
            ),
            Table(
                name="orders",
                row_count=100,
                columns=[
                    Column(
                        name="id",
                        semantic_type="id",
                        dtype="int",
                        generator=SequenceGenerator(kind="sequence", start=1),
                        pk=True,
                    ),
                    Column(
                        name="user_id",
                        semantic_type="id",
                        dtype="int",
                        generator=ForeignKeyGenerator(
                            kind="foreign_key", reference_table="users", reference_column="id"
                        ),
                    ),
                    Column(
                        name="amount",
                        semantic_type="money",
                        dtype="float",
                        generator=NumericGenerator(
                            kind="numeric", dist="uniform", min_val=0.0, max_val=500.0
                        ),
                    ),
                ],
            ),
        ],
        relationships=[
            Relationship(
                parent="users",
                parent_key="id",
                child="orders",
                child_key="user_id",
                kind="one_to_many",
                cardinality=Cardinality(dist="poisson", min_val=1, max_val=10),
            )
        ],
    )


def test_t12a_parity_with_sdmetrics():
    """T-12a: Metric parity with SDMetrics within 1e-3 (TRD ?7.4)."""
    np.random.seed(123)

    # 1. KSComplement (numeric)
    real_num = pd.Series(np.random.normal(50, 10, 300))
    syn_num = pd.Series(np.random.normal(51, 9.8, 300))
    sd_ks = KSComplement.compute(real_num, syn_num)
    our_ks = compute_ks_complement(real_num.tolist(), syn_num.tolist())
    assert abs(sd_ks - our_ks) < 1e-3

    # 2. TVComplement (categorical)
    real_cat = pd.Series(np.random.choice(["X", "Y", "Z"], 300, p=[0.5, 0.3, 0.2]))
    syn_cat = pd.Series(np.random.choice(["X", "Y", "Z"], 300, p=[0.48, 0.31, 0.21]))
    sd_tv = TVComplement.compute(real_cat, syn_cat)
    our_tv = compute_tv_complement(real_cat.tolist(), syn_cat.tolist())
    assert abs(sd_tv - our_tv) < 1e-3

    # 3. Correlation similarity
    df_real = pd.DataFrame({
        "a": np.random.normal(10, 2, 150),
        "b": np.random.normal(20, 5, 150),
    })
    df_syn = pd.DataFrame({
        "a": np.random.normal(10.1, 1.9, 150),
        "b": np.random.normal(20.2, 5.1, 150),
    })
    sd_corr = CorrelationSimilarity.compute(df_real, df_syn)
    our_corr = compute_correlation_similarity(
        df_real.to_dict(orient="records"),
        df_syn.to_dict(orient="records"),
        ["a", "b"],
    )
    assert abs(sd_corr - our_corr) < 1e-3

    # 4. Contingency similarity
    df_cat_real = pd.DataFrame({
        "c1": np.random.choice(["A", "B"], 150),
        "c2": np.random.choice(["P", "Q"], 150),
    })
    df_cat_syn = pd.DataFrame({
        "c1": np.random.choice(["A", "B"], 150),
        "c2": np.random.choice(["P", "Q"], 150),
    })
    sd_cont = ContingencySimilarity.compute(df_cat_real, df_cat_syn)
    our_cont = compute_contingency_similarity(
        df_cat_real.to_dict(orient="records"),
        df_cat_syn.to_dict(orient="records"),
        ["c1", "c2"],
    )
    assert abs(sd_cont - our_cont) < 1e-3


def test_t12b_schema_only_na_behavior():
    """T-12b: Schema-only mode exhibits N/A for sample metrics and shows spec fidelity."""
    ds = _make_dummy_dataset()

    data = {
        "users": [
            {"id": i, "email": f"user{i}@example.com", "age": 25, "plan": "pro"}
            for i in range(1, 51)
        ],
        "orders": [
            {"id": i, "user_id": (i % 50) + 1, "amount": 99.99}
            for i in range(1, 101)
        ],
    }

    report = build_report(ds, generated_data=data, sample_data=None)
    assert isinstance(report, TrustReport)
    assert len(report.cards) == 3

    # Realistic card in schema-only mode
    real_card = next(c for c in report.cards if c.name == "realistic")
    na_metrics = [m for m in real_card.metrics if m.verdict == "n_a"]
    assert len(na_metrics) >= 4
    assert any("N/A" in m.detail for m in na_metrics)

    # Spec fidelity, Category coverage, Unique-row ratio present
    spec_metrics = [m for m in real_card.metrics if m.verdict != "n_a"]
    metric_names = [m.name for m in spec_metrics]
    assert "Spec fidelity (null rate)" in metric_names
    assert "Category coverage" in metric_names
    assert "Unique-row ratio" in metric_names

    # Safe card in schema-only mode
    safe_card = next(c for c in report.cards if c.name == "safe")
    assert any("Privacy by construction" in m.detail for m in safe_card.metrics)


def test_t12c_thresholds_and_verdict_aggregation():
    """T-12c: Card verdicts reflect worst-of non-N/A metrics."""
    ds = _make_dummy_dataset()

    # Valid data -> all pass
    clean_data = {
        "users": [
            {
                "id": i,
                "email": f"user{i}@example.com",
                "age": 30,
                "plan": ["free", "pro", "enterprise"][i % 3],
            }
            for i in range(1, 51)
        ],
        "orders": [
            {"id": i, "user_id": (i % 50) + 1, "amount": 10.0}
            for i in range(1, 101)
        ],
    }
    report = build_report(ds, generated_data=clean_data)
    for card in report.cards:
        assert card.verdict in ("pass", "warn")

    # Injected duplicate PK -> Correct card must FAIL
    broken_pk_data = {
        "users": [
            {"id": 1, "email": "user1@example.com", "age": 30, "plan": "free"},
            {"id": 1, "email": "user2@example.com", "age": 30, "plan": "free"},
        ],
        "orders": [],
    }
    report_broken = build_report(ds, generated_data=broken_pk_data)
    correct_card = next(c for c in report_broken.cards if c.name == "correct")
    assert correct_card.verdict == "fail"
    assert "Primary key uniqueness" in correct_card.reason


def test_rt25_tampered_trust_report_detection():
    """RT-25: Recomputed metrics detect FK orphan tampering."""
    ds = _make_dummy_dataset()

    tampered_data = {
        "users": [
            {"id": 1, "email": "alice@example.com", "age": 28, "plan": "free"}
        ],
        "orders": [
            {"id": 1, "user_id": 999, "amount": 50.0}
        ],
    }

    report = build_report(ds, generated_data=tampered_data)
    correct_card = next(c for c in report.cards if c.name == "correct")
    assert correct_card.verdict == "fail"
    fk_metric = next(m for m in correct_card.metrics if m.name == "Foreign key integrity")
    assert fk_metric.verdict == "fail"


@pytest.mark.asyncio
async def test_api_trust_and_zip_bundle():
    """Verify POST /api/trust and trust_report.json inside ZIP bundle (FR-12, FR-13)."""
    ds = _make_dummy_dataset()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Test POST /api/trust
        resp = await client.post("/api/trust", json={"recipe": ds.model_dump()})
        assert resp.status_code == 200
        rep_json = resp.json()
        assert "cards" in rep_json
        assert len(rep_json["cards"]) == 3
        assert rep_json["engine_version"] == "0.1.0"

        # 2. Test POST /api/export/bundle contains trust_report.json
        exp_resp = await client.post("/api/export/bundle", json={"recipe": ds.model_dump()})
        assert exp_resp.status_code == 200
        assert exp_resp.headers["content-type"] == "application/zip"

        zf = zipfile.ZipFile(io.BytesIO(exp_resp.content))
        names = zf.namelist()
        assert "trust_report.json" in names
        assert "manifest.json" in names
        assert "recipe.json" in names
