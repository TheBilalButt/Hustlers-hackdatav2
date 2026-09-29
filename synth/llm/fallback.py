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
    DocumentSpec,
    FakerGenerator,
    NumericGenerator,
    Relationship,
    SequenceGenerator,
    Table,
    WorldConfig,
)
from synth.llm.contracts import ColumnLabel, ColumnLabels, EdgeCase, QueryDSL


def _detect_locale(text: str) -> Literal["en_US", "en_IN", "de_DE"]:
    lower = text.lower()
    in_terms = ["india", "indian", "gst", "inr", "rupee", "delhi", "mumbai", "bangalore"]
    if any(k in lower for k in in_terms):
        return "en_IN"
    de_terms = ["germany", "german", "eur", "euro", "berlin", "munich", "de_de"]
    if any(k in lower for k in de_terms):
        return "de_DE"
    return "en_US"


def fallback_nl_to_ir(prompt: str) -> Dataset:
    """Return a validated template Dataset based on prompt keywords."""
    text = prompt.lower()
    locale = _detect_locale(text)

    # 1. Healthcare / Clinical
    health_terms = [
        "health",
        "patient",
        "doctor",
        "hospital",
        "clinic",
        "medical",
        "appointment",
        "diagnostic",
        "dental",
    ]
    if any(k in text for k in health_terms):
        return Dataset(
            ir_version="1.0",
            name="Healthcare & Patients",
            mode="schema_only",
            seed=42,
            locale=locale,
            tables=[
                Table(
                    name="patients",
                    row_count=500,
                    columns=[
                        Column(
                            name="patient_id",
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
                            name="city",
                            semantic_type="city",
                            dtype="str",
                            generator=FakerGenerator(kind="faker", provider="city"),
                        ),
                        Column(
                            name="blood_type",
                            semantic_type="category",
                            dtype="str",
                            generator=CategoricalGenerator(
                                kind="categorical",
                                values=["A+", "A-", "B+", "B-", "O+", "O-", "AB+"],
                            ),
                        ),
                    ],
                ),
                Table(
                    name="appointments",
                    columns=[
                        Column(
                            name="appointment_id",
                            semantic_type="id",
                            dtype="int",
                            generator=SequenceGenerator(kind="sequence", start=1),
                            pk=True,
                        ),
                        Column(
                            name="patient_id",
                            semantic_type="id",
                            dtype="int",
                            generator=SequenceGenerator(kind="sequence", start=1),
                        ),
                        Column(
                            name="date",
                            semantic_type="date",
                            dtype="date",
                            generator=DateRangeGenerator(
                                kind="date_range", start="2023-01-01", end="2026-12-31"
                            ),
                        ),
                        Column(
                            name="fee",
                            semantic_type="money",
                            dtype="decimal",
                            generator=NumericGenerator(
                                kind="numeric", dist="uniform", min_val=50.0, max_val=300.0
                            ),
                        ),
                        Column(
                            name="status",
                            semantic_type="category",
                            dtype="str",
                            generator=CategoricalGenerator(
                                kind="categorical",
                                values=["scheduled", "completed", "cancelled"],
                            ),
                        ),
                    ],
                ),
            ],
            relationships=[
                Relationship(
                    parent="patients",
                    parent_key="patient_id",
                    child="appointments",
                    child_key="patient_id",
                    kind="one_to_many",
                    cardinality=Cardinality(dist="uniform", min_val=1, max_val=4),
                )
            ],
            invariants=[],
            privacy=[],
            chaos=None,
            documents=[],
            world=WorldConfig(
                seller_name="Metropolis Hospital", bank_name="Medical Trust Bank"
            ),
        )

    # 2. Education / University
    edu_terms = [
        "school",
        "student",
        "course",
        "class",
        "university",
        "grade",
        "enrollment",
        "academic",
    ]
    if any(k in text for k in edu_terms):
        return Dataset(
            ir_version="1.0",
            name="University Course Enrollments",
            mode="schema_only",
            seed=42,
            locale=locale,
            tables=[
                Table(
                    name="students",
                    row_count=400,
                    columns=[
                        Column(
                            name="student_id",
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
                            name="major",
                            semantic_type="category",
                            dtype="str",
                            generator=CategoricalGenerator(
                                kind="categorical",
                                values=["Computer Science", "Economics", "Biology", "Mathematics"],
                            ),
                        ),
                        Column(
                            name="email",
                            semantic_type="email",
                            dtype="str",
                            generator=FakerGenerator(kind="faker", provider="email"),
                        ),
                    ],
                ),
                Table(
                    name="enrollments",
                    columns=[
                        Column(
                            name="enrollment_id",
                            semantic_type="id",
                            dtype="int",
                            generator=SequenceGenerator(kind="sequence", start=1),
                            pk=True,
                        ),
                        Column(
                            name="student_id",
                            semantic_type="id",
                            dtype="int",
                            generator=SequenceGenerator(kind="sequence", start=1),
                        ),
                        Column(
                            name="semester",
                            semantic_type="category",
                            dtype="str",
                            generator=CategoricalGenerator(
                                kind="categorical",
                                values=["Fall 2024", "Spring 2025", "Fall 2025"],
                            ),
                        ),
                        Column(
                            name="score",
                            semantic_type="float",
                            dtype="float",
                            generator=NumericGenerator(
                                kind="numeric", dist="normal", params={"mean": 82.0, "std": 10.0}
                            ),
                        ),
                    ],
                ),
            ],
            relationships=[
                Relationship(
                    parent="students",
                    parent_key="student_id",
                    child="enrollments",
                    child_key="student_id",
                    kind="one_to_many",
                    cardinality=Cardinality(dist="uniform", min_val=2, max_val=5),
                )
            ],
            invariants=[],
            privacy=[],
            chaos=None,
            documents=[],
            world=WorldConfig(
                seller_name="Global University", bank_name="Campus Credit Union"
            ),
        )

    # 3. Logistics & Fleet
    logistics_terms = [
        "logistics",
        "shipping",
        "fleet",
        "delivery",
        "tracking",
        "cargo",
        "warehouse",
        "freight",
    ]
    if any(k in text for k in logistics_terms):
        return Dataset(
            ir_version="1.0",
            name="Logistics & Fleet Tracking",
            mode="schema_only",
            seed=42,
            locale=locale,
            tables=[
                Table(
                    name="warehouses",
                    row_count=20,
                    columns=[
                        Column(
                            name="warehouse_id",
                            semantic_type="id",
                            dtype="int",
                            generator=SequenceGenerator(kind="sequence", start=1),
                            pk=True,
                        ),
                        Column(
                            name="facility_name",
                            semantic_type="company",
                            dtype="str",
                            generator=FakerGenerator(kind="faker", provider="company"),
                        ),
                        Column(
                            name="city",
                            semantic_type="city",
                            dtype="str",
                            generator=FakerGenerator(kind="faker", provider="city"),
                        ),
                        Column(
                            name="capacity",
                            semantic_type="quantity",
                            dtype="int",
                            generator=NumericGenerator(
                                kind="numeric", dist="uniform", min_val=1000.0, max_val=10000.0
                            ),
                        ),
                    ],
                ),
                Table(
                    name="shipments",
                    columns=[
                        Column(
                            name="shipment_id",
                            semantic_type="id",
                            dtype="int",
                            generator=SequenceGenerator(kind="sequence", start=1),
                            pk=True,
                        ),
                        Column(
                            name="warehouse_id",
                            semantic_type="id",
                            dtype="int",
                            generator=SequenceGenerator(kind="sequence", start=1),
                        ),
                        Column(
                            name="weight_kg",
                            semantic_type="float",
                            dtype="float",
                            generator=NumericGenerator(
                                kind="numeric", dist="uniform", min_val=1.0, max_val=100.0
                            ),
                        ),
                        Column(
                            name="status",
                            semantic_type="category",
                            dtype="str",
                            generator=CategoricalGenerator(
                                kind="categorical",
                                values=["in_transit", "delivered", "exception"],
                            ),
                        ),
                    ],
                ),
            ],
            relationships=[
                Relationship(
                    parent="warehouses",
                    parent_key="warehouse_id",
                    child="shipments",
                    child_key="warehouse_id",
                    kind="one_to_many",
                    cardinality=Cardinality(dist="uniform", min_val=10, max_val=30),
                )
            ],
            invariants=[],
            privacy=[],
            chaos=None,
            documents=[],
            world=WorldConfig(
                seller_name="SwiftLogistics Hub", bank_name="TransGlobal Bank"
            ),
        )

    # 4. SaaS & Subscriptions
    saas_terms = [
        "saas",
        "subscription",
        "plan",
        "mrr",
        "b2b",
        "software",
        "license",
        "streaming",
        "monitoring",
    ]
    if any(k in text for k in saas_terms):
        return Dataset(
            ir_version="1.0",
            name="SaaS Subscriptions",
            mode="schema_only",
            seed=42,
            locale=locale,
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
                            name="company",
                            semantic_type="company",
                            dtype="str",
                            generator=FakerGenerator(kind="faker", provider="company"),
                        ),
                        Column(
                            name="created_at",
                            semantic_type="date",
                            dtype="date",
                            generator=DateRangeGenerator(
                                kind="date_range", start="2023-01-01", end="2025-12-31"
                            ),
                        ),
                    ],
                ),
                Table(
                    name="subscriptions",
                    columns=[
                        Column(
                            name="subscription_id",
                            semantic_type="id",
                            dtype="int",
                            generator=SequenceGenerator(kind="sequence", start=1),
                            pk=True,
                        ),
                        Column(
                            name="user_id",
                            semantic_type="id",
                            dtype="int",
                            generator=SequenceGenerator(kind="sequence", start=1),
                        ),
                        Column(
                            name="plan",
                            semantic_type="category",
                            dtype="str",
                            generator=CategoricalGenerator(
                                kind="categorical",
                                values=["starter", "pro", "enterprise"],
                                weights=[0.5, 0.35, 0.15],
                            ),
                        ),
                        Column(
                            name="amount",
                            semantic_type="money",
                            dtype="decimal",
                            generator=NumericGenerator(
                                kind="numeric",
                                dist="uniform",
                                min_val=29.0,
                                max_val=299.0,
                            ),
                        ),
                        Column(
                            name="active",
                            semantic_type="boolean",
                            dtype="bool",
                            generator=CategoricalGenerator(
                                kind="categorical",
                                values=["true", "false"],
                                weights=[0.85, 0.15],
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
                    cardinality=Cardinality(dist="uniform", min_val=1, max_val=3),
                )
            ],
            invariants=[],
            privacy=[],
            chaos=None,
            documents=[
                DocumentSpec(kind="invoice", template_id="classic", count=50, locale=locale)
            ],
            world=WorldConfig(seller_name="CloudSync Inc.", bank_name="Silicon Bank"),
        )

    # 5. Banking / Finance
    bank_terms = [
        "bank",
        "banking",
        "finance",
        "fintech",
        "account",
        "loan",
        "deposit",
        "credit union",
    ]
    if any(k in text for k in bank_terms):
        return Dataset(
            ir_version="1.0",
            name="Personal Banking",
            mode="schema_only",
            seed=42,
            locale=locale,
            tables=[
                Table(
                    name="customers",
                    row_count=300,
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
                        ),
                    ],
                ),
                Table(
                    name="accounts",
                    columns=[
                        Column(
                            name="account_id",
                            semantic_type="id",
                            dtype="int",
                            generator=SequenceGenerator(kind="sequence", start=1),
                            pk=True,
                        ),
                        Column(
                            name="customer_id",
                            semantic_type="id",
                            dtype="int",
                            generator=SequenceGenerator(kind="sequence", start=1),
                        ),
                        Column(
                            name="account_type",
                            semantic_type="category",
                            dtype="str",
                            generator=CategoricalGenerator(
                                kind="categorical",
                                values=["checking", "savings"],
                                weights=[0.6, 0.4],
                            ),
                        ),
                        Column(
                            name="balance",
                            semantic_type="money",
                            dtype="decimal",
                            generator=NumericGenerator(
                                kind="numeric",
                                dist="uniform",
                                min_val=100.0,
                                max_val=50000.0,
                            ),
                        ),
                    ],
                ),
            ],
            relationships=[
                Relationship(
                    parent="customers",
                    parent_key="customer_id",
                    child="accounts",
                    child_key="customer_id",
                    kind="one_to_many",
                    cardinality=Cardinality(dist="uniform", min_val=1, max_val=2),
                )
            ],
            invariants=[],
            privacy=[],
            chaos=None,
            documents=[
                DocumentSpec(kind="statement", template_id="bank", count=30, locale=locale)
            ],
            world=WorldConfig(
                seller_name="First National Reserve", bank_name="Reserve Bank"
            ),
        )

    # 6. Retail / eCommerce / D2C (Default fallback)
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
                        name="city",
                        semantic_type="city",
                        dtype="str",
                        generator=FakerGenerator(kind="faker", provider="city"),
                    ),
                ],
            ),
            Table(
                name="orders",
                columns=[
                    Column(
                        name="order_id",
                        semantic_type="id",
                        dtype="int",
                        generator=SequenceGenerator(kind="sequence", start=1),
                        pk=True,
                    ),
                    Column(
                        name="customer_id",
                        semantic_type="id",
                        dtype="int",
                        generator=SequenceGenerator(kind="sequence", start=1),
                    ),
                    Column(
                        name="amount",
                        semantic_type="money",
                        dtype="decimal",
                        generator=NumericGenerator(
                            kind="numeric",
                            dist="uniform",
                            min_val=15.0,
                            max_val=450.0,
                        ),
                    ),
                    Column(
                        name="order_date",
                        semantic_type="date",
                        dtype="date",
                        generator=DateRangeGenerator(
                            kind="date_range",
                            start="2024-01-01",
                            end="2026-12-31",
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
                cardinality=Cardinality(dist="uniform", min_val=1, max_val=5),
            )
        ],
        invariants=[],
        privacy=[],
        chaos=None,
        documents=[DocumentSpec(kind="invoice", template_id="classic", count=50, locale=locale)],
        world=WorldConfig(seller_name="Acme Retail Goods", bank_name="Retail Horizon Bank"),
    )


def fallback_query_parse(text: str) -> QueryDSL:
    """Parse common financial statement query patterns via regex."""
    days_match = re.search(r"(\d+)\s*days?", text, re.IGNORECASE)
    period: dict[str, int | str] | None = (
        {"days": int(days_match.group(1))} if days_match else None
    )

    constraints: list[dict[str, str | float]] = []
    bal_pat = r"balance\s*(?:over|>|greater\s+than)\s*\$?(\d+(?:\.\d+)?)"
    bal_match = re.search(bal_pat, text, re.IGNORECASE)
    if bal_match:
        constraints.append({"field": "balance", "op": ">", "value": float(bal_match.group(1))})

    return QueryDSL(period=period, constraints=constraints)


def fallback_label_columns(columns: list[str]) -> ColumnLabels:
    """Infer column labels deterministically from column names."""
    labels: list[ColumnLabel] = []
    for col in columns:
        cl = col.lower().strip()
        if cl == "id" or cl.endswith("_id"):
            labels.append(
                ColumnLabel(
                    column_name=col,
                    semantic_type="id",
                    dtype="int",
                    generator_kind="sequence",
                )
            )
        elif "email" in cl:
            labels.append(
                ColumnLabel(
                    column_name=col,
                    semantic_type="email",
                    dtype="str",
                    generator_kind="faker",
                )
            )
        elif "phone" in cl:
            labels.append(
                ColumnLabel(
                    column_name=col,
                    semantic_type="phone",
                    dtype="str",
                    generator_kind="faker",
                )
            )
        elif any(k in cl for k in ["price", "amount", "salary", "fee", "cost", "balance"]):
            labels.append(
                ColumnLabel(
                    column_name=col,
                    semantic_type="money",
                    dtype="decimal",
                    generator_kind="numeric",
                )
            )
        elif any(k in cl for k in ["date", "time", "created_at"]):
            labels.append(
                ColumnLabel(
                    column_name=col,
                    semantic_type="date",
                    dtype="date",
                    generator_kind="date_range",
                )
            )
        elif any(k in cl for k in ["status", "category", "type", "plan"]):
            labels.append(
                ColumnLabel(
                    column_name=col,
                    semantic_type="category",
                    dtype="str",
                    generator_kind="categorical",
                )
            )
        elif any(k in cl for k in ["name", "first_name", "last_name"]):
            labels.append(
                ColumnLabel(
                    column_name=col,
                    semantic_type="person_name",
                    dtype="str",
                    generator_kind="faker",
                )
            )
        else:
            labels.append(
                ColumnLabel(
                    column_name=col,
                    semantic_type="text_short",
                    dtype="str",
                    generator_kind="faker",
                )
            )

    return ColumnLabels(labels=labels)


def fallback_edge_cases() -> list[EdgeCase]:
    """Return default edge-case injection specifications."""
    return [
        EdgeCase(
            catalog_type="null_injection",
            table="orders",
            column="amount",
            description="Inject null values into amount column",
        ),
        EdgeCase(
            catalog_type="boundary_dates",
            table="orders",
            column="order_date",
            description="Inject leap-year and boundary date edge cases",
        ),
    ]