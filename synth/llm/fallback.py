"""Deterministic fallback library when offline or all LLM providers fail.

Reference: FR-16, TRD §9.1, RT-31.
"""
from __future__ import annotations

import re
from typing import Literal

from synth.ir.models import (
    Cardinality,
    CategoricalGenerator,
    Column,
    Dataset,
    DateRangeGenerator,
    FakerGenerator,
    NumericGenerator,
    Relationship,
    SequenceGenerator,
    Table,
)
from synth.llm.contracts import ColumnLabel, ColumnLabels, EdgeCase, QueryDSL


def fallback_nl_to_ir(prompt: str) -> Dataset:
    """Return a validated template Dataset based on prompt keywords."""
    text = prompt.lower()

    if any(k in text for k in ["saas", "subscription", "plan", "mrr"]):
        return Dataset(
            ir_version="1.0",
            name="SaaS Subscriptions",
            mode="schema_only",
            seed=42,
            locale="en_US",
            tables=[
                Table(
                    name="users",
                    row_count=500,
                    columns=[
                        Column(
                            name="user_id",
                            semantic_type="id",
                            dtype="int",
                            generator=SequenceGenerator(kind="sequence", start=1),
                            pk=True,
                        ),
                        Column(
                            name="name",
                            semantic_type="person_name",
                            dtype="str",
                            generator=FakerGenerator(kind="faker", provider="person_name"),
                        ),
                        Column(
                            name="email",
                            semantic_type="email",
                            dtype="str",
                            generator=FakerGenerator(kind="faker", provider="email"),
                        ),
                        Column(
                            name="signup_date",
                            semantic_type="date",
                            dtype="date",
                            generator=DateRangeGenerator(
                                kind="date_range", start="2026-01-01", end="2026-06-30"
                            ),
                        ),
                    ],
                ),
                Table(
                    name="subscriptions",
                    row_count=450,
                    columns=[
                        Column(
                            name="sub_id",
                            semantic_type="id",
                            dtype="int",
                            generator=SequenceGenerator(kind="sequence", start=1),
                            pk=True,
                        ),
                        Column(
                            name="user_id",
                            semantic_type="integer",
                            dtype="int",
                            generator=NumericGenerator(
                                kind="numeric", dist="uniform", params={"min": 1, "max": 500}
                            ),
                        ),
                        Column(
                            name="tier",
                            semantic_type="category",
                            dtype="str",
                            generator=CategoricalGenerator(
                                kind="categorical",
                                values=["starter", "pro", "enterprise"],
                                weights=[0.5, 0.35, 0.15],
                            ),
                        ),
                        Column(
                            name="monthly_fee",
                            semantic_type="money",
                            dtype="decimal",
                            generator=NumericGenerator(
                                kind="numeric",
                                dist="normal",
                                params={"mean": 49.0, "std": 20.0},
                                min_val=9.0,
                            ),
                        ),
                    ],
                ),
            ],
            relationships=[
                Relationship(
                    parent="users",
                    parent_key="user_id",
                    child="subscriptions",
                    child_key="user_id",
                    kind="one_to_many",
                    cardinality=Cardinality(
                        dist="uniform", params={"min": 1, "max": 3}, min_val=1, max_val=3
                    ),
                )
            ],
            invariants=[],
            privacy=[],
            chaos=None,
            documents=[],
            world=None,
        )

    elif any(k in text for k in ["bank", "banking", "account", "transaction", "balance"]):
        return Dataset(
            ir_version="1.0",
            name="Personal Banking",
            mode="schema_only",
            seed=42,
            locale="en_US",
            tables=[
                Table(
                    name="accounts",
                    row_count=200,
                    columns=[
                        Column(
                            name="account_id",
                            semantic_type="id",
                            dtype="int",
                            generator=SequenceGenerator(kind="sequence", start=1001),
                            pk=True,
                        ),
                        Column(
                            name="holder_name",
                            semantic_type="person_name",
                            dtype="str",
                            generator=FakerGenerator(kind="faker", provider="person_name"),
                        ),
                        Column(
                            name="account_type",
                            semantic_type="category",
                            dtype="str",
                            generator=CategoricalGenerator(
                                kind="categorical",
                                values=["checking", "savings"],
                                weights=[0.7, 0.3],
                            ),
                        ),
                    ],
                ),
                Table(
                    name="transactions",
                    row_count=3000,
                    columns=[
                        Column(
                            name="txn_id",
                            semantic_type="id",
                            dtype="int",
                            generator=SequenceGenerator(kind="sequence", start=50001),
                            pk=True,
                        ),
                        Column(
                            name="account_id",
                            semantic_type="integer",
                            dtype="int",
                            generator=NumericGenerator(
                                kind="numeric", dist="uniform", params={"min": 1001, "max": 1200}
                            ),
                        ),
                        Column(
                            name="amount",
                            semantic_type="money",
                            dtype="decimal",
                            generator=NumericGenerator(
                                kind="numeric",
                                dist="normal",
                                params={"mean": 85.0, "std": 45.0},
                                min_val=1.0,
                            ),
                        ),
                        Column(
                            name="txn_date",
                            semantic_type="date",
                            dtype="date",
                            generator=DateRangeGenerator(
                                kind="date_range", start="2026-01-01", end="2026-09-29"
                            ),
                        ),
                    ],
                ),
            ],
            relationships=[
                Relationship(
                    parent="accounts",
                    parent_key="account_id",
                    child="transactions",
                    child_key="account_id",
                    kind="one_to_many",
                    cardinality=Cardinality(
                        dist="poisson", params={"lam": 15.0}, min_val=1, max_val=50
                    ),
                )
            ],
            invariants=[],
            privacy=[],
            chaos=None,
            documents=[],
            world=None,
        )

    else:
        # Default: Retail / D2C Store
        locale: Literal["en_US", "en_IN", "de_DE"] = (
            "en_IN"
            if any(k in text for k in ["india", "indian", "gst", "rupee", "inr"])
            else "en_US"
        )
        return Dataset(
            ir_version="1.0",
            name="Retail Store",
            mode="schema_only",
            seed=42,
            locale=locale,
            tables=[
                Table(
                    name="customers",
                    row_count=500,
                    columns=[
                        Column(
                            name="customer_id",
                            semantic_type="id",
                            dtype="int",
                            generator=SequenceGenerator(kind="sequence", start=1),
                            pk=True,
                        ),
                        Column(
                            name="name",
                            semantic_type="person_name",
                            dtype="str",
                            generator=FakerGenerator(kind="faker", provider="person_name"),
                        ),
                        Column(
                            name="email",
                            semantic_type="email",
                            dtype="str",
                            generator=FakerGenerator(kind="faker", provider="email"),
                        ),
                        Column(
                            name="phone",
                            semantic_type="phone",
                            dtype="str",
                            generator=FakerGenerator(kind="faker", provider="phone"),
                            nullable=True,
                            null_rate=0.05,
                        ),
                    ],
                ),
                Table(
                    name="orders",
                    row_count=2000,
                    columns=[
                        Column(
                            name="order_id",
                            semantic_type="id",
                            dtype="int",
                            generator=SequenceGenerator(kind="sequence", start=10001),
                            pk=True,
                        ),
                        Column(
                            name="customer_id",
                            semantic_type="integer",
                            dtype="int",
                            generator=NumericGenerator(
                                kind="numeric", dist="uniform", params={"min": 1, "max": 500}
                            ),
                        ),
                        Column(
                            name="total_amount",
                            semantic_type="money",
                            dtype="decimal",
                            generator=NumericGenerator(
                                kind="numeric",
                                dist="normal",
                                params={"mean": 150.0, "std": 60.0},
                                min_val=10.0,
                            ),
                        ),
                        Column(
                            name="created_at",
                            semantic_type="date",
                            dtype="date",
                            generator=DateRangeGenerator(
                                kind="date_range", start="2026-01-01", end="2026-09-29"
                            ),
                        ),
                    ],
                ),
            ],
            relationships=[
                Relationship(
                    parent="customers",
                    parent_key="customer_id",
                    child="orders",
                    child_key="customer_id",
                    kind="one_to_many",
                    cardinality=Cardinality(
                        dist="poisson", params={"lam": 4.0}, min_val=1, max_val=20
                    ),
                )
            ],
            invariants=[],
            privacy=[],
            chaos=None,
            documents=[],
            world=None,
        )


def fallback_query_parse(text: str) -> QueryDSL:
    """Regex-based grammar parser for common statement queries."""
    days_match = re.search(r"last\s+(\d+)\s+days?", text, re.IGNORECASE)
    days = int(days_match.group(1)) if days_match else 90

    balance_match = re.search(
        r"balance\s*(?:over|>|>=)\s*[$₹€]?\s*([\d,]+(?:\.\d+)?)", text, re.IGNORECASE
    )
    constraints: list[dict[str, str | float]] = []
    if balance_match:
        val_str = balance_match.group(1).replace(",", "")
        constraints.append({"field": "running_balance", "op": ">", "value": float(val_str)})

    return QueryDSL(
        period={"days": min(days, 366)},
        constraints=constraints,
        include_mcc=[],
        exclude_mcc=[],
        min_transactions=5,
    )


def fallback_label_columns(columns: list[str]) -> ColumnLabels:
    """Heuristic column labeler."""
    labels = []
    for col in columns:
        c = col.lower()
        if "id" in c:
            labels.append(
                ColumnLabel(
                    column_name=col,
                    semantic_type="id",
                    dtype="int",
                    generator_kind="sequence",
                )
            )
        elif "email" in c:
            labels.append(
                ColumnLabel(
                    column_name=col,
                    semantic_type="email",
                    dtype="str",
                    generator_kind="faker",
                )
            )
        elif "phone" in c:
            labels.append(
                ColumnLabel(
                    column_name=col,
                    semantic_type="phone",
                    dtype="str",
                    generator_kind="faker",
                )
            )
        elif "name" in c:
            labels.append(
                ColumnLabel(
                    column_name=col,
                    semantic_type="person_name",
                    dtype="str",
                    generator_kind="faker",
                )
            )
        elif "date" in c or "time" in c:
            labels.append(
                ColumnLabel(
                    column_name=col,
                    semantic_type="date",
                    dtype="date",
                    generator_kind="date_range",
                )
            )
        elif any(k in c for k in ["amount", "price", "total", "fee", "cost"]):
            labels.append(
                ColumnLabel(
                    column_name=col,
                    semantic_type="money",
                    dtype="decimal",
                    generator_kind="numeric",
                )
            )
        else:
            labels.append(
                ColumnLabel(
                    column_name=col,
                    semantic_type="category",
                    dtype="str",
                    generator_kind="categorical",
                )
            )
    return ColumnLabels(labels=labels)


def fallback_edge_cases() -> list[EdgeCase]:
    """Built-in catalog edge cases."""
    return [
        EdgeCase(
            catalog_type="extreme_outlier",
            table="orders",
            column="total_amount",
            description="Injected 10x p99 spike",
        ),
        EdgeCase(
            catalog_type="null_burst",
            table="customers",
            column="phone",
            description="Consecutive null values",
        ),
    ]
