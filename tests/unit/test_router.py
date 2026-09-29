"""Tests for LLM router, circuit breakers, and deterministic fallback.

Traceability:
- T-10b: Deterministic fallback returns valid IR when providers fail
- T-16a / RT-31: Full demo path works offline with degraded banner
- Circuit breaker state machine and 429 backoff
"""

import time

import pytest

from synth.config import settings
from synth.ir.models import Dataset
from synth.llm.contracts import QueryDSL
from synth.llm.router import CircuitBreaker, LLMRouter


def test_circuit_breaker_transitions():
    cb = CircuitBreaker("test_provider", cooldown_seconds=0.1)
    assert cb.state == "closed"
    assert cb.can_attempt() is True

    # Record 429 rate limit
    cb.record_failure(is_rate_limit=True, retry_after=0.05)
    assert cb.state == "open"
    assert cb.can_attempt() is False

    # Wait for cooldown
    time.sleep(0.06)
    assert cb.can_attempt() is True
    assert cb.state == "half_open"

    # Success resets to closed
    cb.record_success()
    assert cb.state == "closed"
    assert cb.failures == 0


@pytest.mark.asyncio
async def test_t10b_deterministic_fallback():
    """T-10b: Router returns valid IR and degraded: True when no provider is live."""
    router = LLMRouter()
    res = await router.call(
        task="nl_to_ir",
        payload={"prompt": "Indian D2C shop with customers, orders and GST invoices"},
    )

    assert res["degraded"] is True
    assert res["provider"] == "deterministic_fallback"
    assert "output" in res

    # Validate output against Dataset model
    ds = Dataset.model_validate(res["output"])
    assert len(ds.tables) >= 2
    assert ds.locale == "en_IN"
    assert any(t.name == "customers" for t in ds.tables)


@pytest.mark.asyncio
async def test_t16a_rt31_offline_mode():
    """RT-31 / T-16a: Full demo path offline works without errors."""
    orig_mode = settings.offline_mode
    try:
        settings.offline_mode = True
        router = LLMRouter()

        # 1. Prompt to IR
        res_ir = await router.call("nl_to_ir", {"prompt": "SaaS subscription platform"})
        assert res_ir["degraded"] is True
        ds = Dataset.model_validate(res_ir["output"])
        assert "subscriptions" in [t.name for t in ds.tables]

        # 2. Query parsing
        res_query = await router.call("parse_query", {"text": "last 90 days, balance over $500"})
        assert res_query["degraded"] is True
        q = QueryDSL.model_validate(res_query["output"])
        assert q.period == {"days": 90}
        assert len(q.constraints) == 1

        # 3. Cache verification
        res_cached = await router.call("parse_query", {"text": "last 90 days, balance over $500"})
        assert res_cached["cached"] is True

    finally:
        settings.offline_mode = orig_mode
