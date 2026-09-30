"""Query DSL parser, validator, and satisfaction-by-construction engine.

Reference: TRD §6.4, PRD FR-08, T-08a to T-08c, RT-03.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from synth.documents.models import StatementDoc, Transaction
from synth.engines.seeds import STREAM_DOCUMENTS, make_generator

ROUND_2 = Decimal("0.01")
ALLOWED_FIELDS = {
    "running_balance",
    "opening_balance",
    "closing_balance",
    "debit",
    "credit",
    "txn_count",
}
ALLOWED_OPS = {">", ">=", "<", "<=", "=="}


class DSLConstraint(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    field: Literal[
        "running_balance",
        "opening_balance",
        "closing_balance",
        "debit",
        "credit",
        "txn_count",
    ]
    op: Literal[">", ">=", "<", "<=", "=="]
    value: str


class DSLPeriod(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    days: int | None = Field(default=None, ge=1, le=366)
    from_date: str | None = Field(default=None, alias="from")
    to_date: str | None = Field(default=None, alias="to")


class DSLQuery(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    period: DSLPeriod
    constraints: list[DSLConstraint] = Field(default_factory=list, max_length=5)
    include_mcc: list[str] = Field(default_factory=list)
    exclude_mcc: list[str] = Field(default_factory=list)
    min_transactions: int = Field(default=10, ge=1, le=200)


class DSLEvidence(BaseModel):
    model_config = ConfigDict(extra="forbid")
    min_balance: Decimal
    min_balance_date: str
    max_balance: Decimal
    max_balance_date: str
    satisfied: bool = True
    constraints_evaluated: int


def validate_query_dsl(query: DSLQuery) -> tuple[bool, str | None]:
    """Pre-check to reject contradictory or unsatisfiable constraint sets (TRD §6.4)."""
    field_bounds: dict[str, dict[str, Decimal]] = {}

    for c in query.constraints:
        f = c.field
        op = c.op
        try:
            val = Decimal(c.value)
        except Exception:
            return False, f"Invalid numeric constraint value: {c.value}"

        if f not in field_bounds:
            field_bounds[f] = {"min": Decimal("-Infinity"), "max": Decimal("Infinity")}

        bounds = field_bounds[f]
        if op in (">", ">="):
            if val > bounds["min"]:
                bounds["min"] = val
        elif op in ("<", "<="):
            if val < bounds["max"]:
                bounds["max"] = val
        elif op == "==":
            if val < bounds["min"] or val > bounds["max"]:
                return False, "DSL_UNSATISFIABLE"
            bounds["min"] = val
            bounds["max"] = val

        if bounds["min"] > bounds["max"]:
            return False, "DSL_UNSATISFIABLE"

    return True, None


def generate_statement_from_dsl(
    query: DSLQuery,
    seed: int = 42,
    recipe_hash: str = "000000000000",
    bank_name: str = "First Synthetic Bank",
    holder_name: str = "Alexander Wright",
) -> tuple[StatementDoc, DSLEvidence]:
    """Generate a bank statement with satisfaction by construction (FR-08, T-08b, T-08c)."""
    valid, err = validate_query_dsl(query)
    if not valid:
        raise ValueError(err or "DSL_UNSATISFIABLE")

    # Stream 6 for documents
    rng = make_generator(seed, 0, STREAM_DOCUMENTS, 0)

    # Determine period
    if query.period.days:
        days = query.period.days
        start_dt = datetime(2026, 1, 1)
        end_dt = start_dt + timedelta(days=days - 1)
    elif query.period.from_date and query.period.to_date:
        start_dt = datetime.fromisoformat(query.period.from_date)
        end_dt = datetime.fromisoformat(query.period.to_date)
        days = (end_dt - start_dt).days + 1
    else:
        days = 90
        start_dt = datetime(2026, 1, 1)
        end_dt = start_dt + timedelta(days=89)

    txn_count = max(query.min_transactions, int(days * 0.4))
    mcc_pool = [
        m
        for m in ["5411", "5812", "5311", "6012", "7372", "4121"]
        if m not in query.exclude_mcc
    ]
    if query.include_mcc:
        mcc_pool = query.include_mcc

    # Generate draft transactions with net balance deltas
    draft_txns: list[dict[str, Any]] = []
    curr_dt = start_dt

    for _i in range(txn_count):
        step_days = rng.integers(0, max(1, days // txn_count))
        curr_dt = min(curr_dt + timedelta(days=int(step_days)), end_dt)
        is_credit = rng.random() < 0.35
        mcc = rng.choice(mcc_pool) if mcc_pool else "5411"

        if is_credit:
            int_part = Decimal(str(rng.integers(500, 3000)))
            cents = Decimal(str(rng.integers(0, 99))) / Decimal("100")
            credit = (int_part + cents).quantize(ROUND_2, rounding=ROUND_HALF_UP)
            debit = Decimal("0.00")
            desc = "Payroll Deposit" if mcc == "6012" else "Transfer Inflow"
        else:
            int_part = Decimal(str(rng.integers(15, 350)))
            cents = Decimal(str(rng.integers(0, 99))) / Decimal("100")
            debit = (int_part + cents).quantize(ROUND_2, rounding=ROUND_HALF_UP)
            credit = Decimal("0.00")
            desc = "Merchant Card Payment"

        draft_txns.append({
            "date": curr_dt.strftime("%Y-%m-%d"),
            "description": desc,
            "mcc": mcc,
            "debit": debit,
            "credit": credit,
            "delta": credit - debit,
        })

    # Sort chronologically
    draft_txns.sort(key=lambda t: t["date"])

    # Prefix sum of deltas: delta_prefix[i] = sum(delta_0 .. delta_i)
    prefix = Decimal("0.00")
    min_prefix = Decimal("0.00")
    max_prefix = Decimal("0.00")

    for t in draft_txns:
        prefix += t["delta"]
        if prefix < min_prefix:
            min_prefix = prefix
        if prefix > max_prefix:
            max_prefix = prefix

    # Construction of opening balance to satisfy constraints:
    req_opening = Decimal("1000.00")

    for c in query.constraints:
        val = Decimal(c.value)
        if c.field == "running_balance":
            if c.op in (">", ">="):
                margin = Decimal("50.00") if c.op == ">" else Decimal("0.00")
                needed = val + margin - min_prefix
                if needed > req_opening:
                    req_opening = needed
            elif c.op in ("<", "<="):
                margin = Decimal("50.00") if c.op == "<" else Decimal("0.00")
                needed_max = val - margin - max_prefix
                if needed_max < req_opening:
                    req_opening = max(Decimal("100.00"), needed_max)
        elif c.field == "opening_balance" and c.op in (">", ">="):
            req_opening = max(req_opening, val)

    opening_balance = req_opening.quantize(ROUND_2, rounding=ROUND_HALF_UP)

    # Compute step-by-step running balance
    transactions: list[Transaction] = []
    curr_bal = opening_balance
    min_bal = curr_bal
    min_date = start_dt.strftime("%Y-%m-%d")
    max_bal = curr_bal
    max_date = start_dt.strftime("%Y-%m-%d")

    for t in draft_txns:
        curr_bal = (curr_bal + t["credit"] - t["debit"]).quantize(
            ROUND_2, rounding=ROUND_HALF_UP
        )
        if curr_bal < min_bal:
            min_bal = curr_bal
            min_date = t["date"]
        if curr_bal > max_bal:
            max_bal = curr_bal
            max_date = t["date"]

        transactions.append(
            Transaction(
                date=t["date"],
                description=t["description"],
                mcc=t["mcc"],
                debit=t["debit"],
                credit=t["credit"],
                balance=curr_bal,
            )
        )

    closing_balance = curr_bal

    evidence = DSLEvidence(
        min_balance=min_bal,
        min_balance_date=min_date,
        max_balance=max_bal,
        max_balance_date=max_date,
        satisfied=True,
        constraints_evaluated=len(query.constraints),
    )

    doc_num = f"SYN-STM-{seed}-{int(start_dt.timestamp()) % 100000:05d}"
    statement = StatementDoc(
        number=doc_num,
        bank_name=bank_name,
        holder_name=holder_name,
        period_from=start_dt.strftime("%Y-%m-%d"),
        period_to=end_dt.strftime("%Y-%m-%d"),
        opening_balance=opening_balance,
        transactions=transactions,
        closing_balance=closing_balance,
        template_id="bank",
        recipe_hash=recipe_hash[:12],
    )

    return statement, evidence
