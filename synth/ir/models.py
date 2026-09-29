"""IR v1 Pydantic models.

Every model uses extra="forbid" and frozen=True so LLM output
cannot sneak in unexpected fields.

Reference: TRD section 4.
"""

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

# Safe identifier pattern — also rejects SQL reserved words via a validator
Identifier = Annotated[
    str,
    StringConstraints(pattern=r"^[A-Za-z_][A-Za-z0-9_]{0,62}$"),
]


# ── Semantic types ──────────────────────────────────────
SemanticType = Literal[
    "id",
    "person_name",
    "first_name",
    "last_name",
    "email",
    "phone",
    "street_address",
    "city",
    "region",
    "postal_code",
    "country",
    "company",
    "job_title",
    "date",
    "datetime",
    "money",
    "quantity",
    "integer",
    "float",
    "percent",
    "category",
    "boolean",
    "text_short",
    "text_long",
    "sku",
    "product_name",
    "merchant",
    "mcc",
    "iban_fake",
    "card_fake",
    "url_fake",
]


# ── Generator types (discriminated union on "kind") ─────
class FakerGenerator(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    kind: Literal["faker"] = "faker"
    provider: str
    locale: str | None = None


class CategoricalGenerator(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    kind: Literal["categorical"] = "categorical"
    values: list[str]
    weights: list[float] | None = None


class NumericGenerator(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    kind: Literal["numeric"] = "numeric"
    dist: Literal["normal", "lognormal", "uniform", "poisson", "empirical"]
    params: dict[str, float] = Field(default_factory=dict)
    min_val: float | None = None
    max_val: float | None = None


class SequenceGenerator(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    kind: Literal["sequence"] = "sequence"
    start: int = 1
    step: int = 1
    prefix: str = ""


class DateRangeGenerator(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    kind: Literal["date_range"] = "date_range"
    start: str  # ISO date string
    end: str


class CopulaRefGenerator(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    kind: Literal["copula_ref"] = "copula_ref"
    column_index: int


class DerivedGenerator(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    kind: Literal["derived"] = "derived"
    derivation: Literal["sum_children", "row_expr"]
    expression: str | None = None  # allow-listed expression tree, never eval


class ForeignKeyGenerator(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    kind: Literal["foreign_key"] = "foreign_key"
    reference_table: Identifier
    reference_column: Identifier


Generator = (
    FakerGenerator
    | CategoricalGenerator
    | NumericGenerator
    | SequenceGenerator
    | DateRangeGenerator
    | CopulaRefGenerator
    | DerivedGenerator
    | ForeignKeyGenerator
)


# ── Constraints ─────────────────────────────────────────
class Constraint(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    kind: Literal["min", "max", "regex", "one_of", "after_column"]
    value: str | float | list[str]


# ── Column ──────────────────────────────────────────────
class Column(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    name: Identifier
    semantic_type: SemanticType
    dtype: Literal["int", "float", "decimal", "str", "bool", "date", "datetime"]
    generator: Generator = Field(discriminator="kind")
    nullable: bool = False
    null_rate: float = Field(default=0, ge=0, le=0.5)
    outlier_rate: float = Field(default=0, ge=0, le=0.1)
    unique: bool = False
    pk: bool = False
    constraints: list[Constraint] = Field(default_factory=list)


# ── Table ───────────────────────────────────────────────
class Table(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    name: Identifier
    row_count: int | None = None
    columns: list[Column] = Field(min_length=1, max_length=64)


# ── Relationships ───────────────────────────────────────
class Cardinality(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    dist: Literal["fixed", "uniform", "poisson", "negbin", "empirical"]
    params: dict[str, float] = Field(default_factory=dict)
    min_val: int = 0
    max_val: int = 100


class Relationship(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    parent: Identifier
    parent_key: Identifier
    child: Identifier
    child_key: Identifier
    kind: Literal["one_to_one", "one_to_many", "many_to_many"]
    cardinality: Cardinality
    junction: Identifier | None = None
    nullable_backfill: bool = False


# ── Invariants ──────────────────────────────────────────
class SumChildren(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    kind: Literal["sum_children"] = "sum_children"
    parent_table: Identifier
    parent_column: Identifier
    child_table: Identifier
    child_columns: list[Identifier]
    operation: str  # e.g. "qty * unit_price"


class TemporalOrder(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    kind: Literal["temporal_order"] = "temporal_order"
    parent_table: Identifier
    parent_column: Identifier
    child_table: Identifier
    child_column: Identifier


class UniqueCombo(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    kind: Literal["unique_combo"] = "unique_combo"
    table: Identifier
    columns: list[Identifier]


class RunningBalance(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    kind: Literal["running_balance"] = "running_balance"
    table: Identifier
    balance_column: Identifier
    debit_column: Identifier
    credit_column: Identifier


Invariant = SumChildren | TemporalOrder | UniqueCombo | RunningBalance


# ── Privacy rules ───────────────────────────────────────
class PrivacyRule(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    table: Identifier
    column: Identifier
    control: Literal["mask", "hmac_hash", "drop", "generalize", "dp_marginals"]


# ── Chaos config ────────────────────────────────────────
class ChaosConfig(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    enabled: bool = False
    null_injection_rate: float = 0.01
    outlier_rate: float = 0.005
    duplicate_rate: float = 0.005
    encoding_issues: bool = False
    boundary_dates: bool = False


# ── Document specs ──────────────────────────────────────
class DocumentSpec(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    kind: Literal["invoice", "statement"]
    template_id: str = "classic"
    count: int = Field(ge=1, le=2000)
    locale: Literal["en_US", "en_IN", "de_DE"] = "en_US"


# ── World config (fictional entities for one-world) ─────
class WorldConfig(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    seller_name: str = "Acme Trading Co."
    seller_address: str = "42 Innovation Drive, Techville"
    bank_name: str = "First Synthetic Bank"
    payment_terms_days: int = Field(default=30, ge=0, le=90)


# ── Top-level Dataset ───────────────────────────────────
class Dataset(BaseModel):
    """The single IR contract. See TRD section 4."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    ir_version: Literal["1.0"] = "1.0"
    name: str = Field(max_length=80)
    mode: Literal["schema_only", "sample"]
    seed: int = Field(ge=0, lt=2**63)
    locale: Literal["en_US", "en_IN", "de_DE"]
    tables: list[Table] = Field(min_length=1, max_length=12)
    relationships: list[Relationship] = Field(default_factory=list)
    invariants: list[Invariant] = Field(default_factory=list)
    privacy: list[PrivacyRule] = Field(default_factory=list)
    chaos: ChaosConfig | None = None
    documents: list[DocumentSpec] = Field(default_factory=list)
    world: WorldConfig | None = None
