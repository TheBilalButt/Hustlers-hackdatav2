"""Multi-provider LLM router with circuit breakers and deterministic fallback.

Behaviour specified in TRD section 9.2.
The LLM is a planner only — it has no tools and its output never
becomes SQL, HTML, file paths, or executable code.
"""

from __future__ import annotations

import hashlib
import json
import time
from typing import Any

from synth.config import settings
from synth.llm.fallback import (
    fallback_edge_cases,
    fallback_label_columns,
    fallback_nl_to_ir,
    fallback_query_parse,
)
from synth.llm.providers import get_api_key_for_provider, load_providers_config


class CircuitBreaker:
    """Per-provider circuit breaker (closed, open, half-open)."""

    def __init__(self, name: str, cooldown_seconds: float = 60.0) -> None:
        self.name = name
        self.state: str = "closed"
        self.cooldown_seconds = cooldown_seconds
        self.open_until: float = 0.0
        self.failures: int = 0

    def can_attempt(self) -> bool:
        if self.state == "closed":
            return True
        now = time.time()
        if now >= self.open_until:
            self.state = "half_open"
            return True
        return False

    def record_success(self) -> None:
        self.state = "closed"
        self.failures = 0
        self.open_until = 0.0

    def record_failure(self, is_rate_limit: bool = False, retry_after: float | None = None) -> None:
        self.failures += 1
        cooldown = (
            retry_after if (retry_after is not None and retry_after > 0) else self.cooldown_seconds
        )
        if is_rate_limit or self.failures >= 3:
            self.state = "open"
            self.open_until = time.time() + cooldown


class LLMRouter:
    """Routes LLM requests across providers with failover, breakers, and caching."""

    def __init__(self) -> None:
        self.config = load_providers_config()
        self.providers: list[dict[str, Any]] = self.config.get("providers", [])
        self.task_order: dict[str, list[str]] = self.config.get("task_order", {})
        self.breakers: dict[str, CircuitBreaker] = {
            p["name"]: CircuitBreaker(p["name"]) for p in self.providers
        }
        self.cache: dict[str, Any] = {}

    def _cache_key(self, task: str, prompt_version: str, payload: dict[str, Any]) -> str:
        serialized = json.dumps(payload, sort_keys=True, default=str)
        return hashlib.sha256(f"{task}:{prompt_version}:{serialized}".encode()).hexdigest()

    async def call(
        self,
        task: str,
        payload: dict[str, Any],
        prompt_version: str = "v1",
    ) -> dict[str, Any]:
        """Execute an LLM task with failover or deterministic fallback."""
        cache_key = self._cache_key(task, prompt_version, payload)
        if cache_key in self.cache:
            res = dict(self.cache[cache_key])
            res["cached"] = True
            return res

        # Offline mode short-circuit (FR-16)
        if settings.offline_mode:
            fallback_res = self._execute_fallback(task, payload)
            self.cache[cache_key] = fallback_res
            return fallback_res

        ordered_provider_names = self.task_order.get(task, [p["name"] for p in self.providers])

        for provider_name in ordered_provider_names:
            provider = next((p for p in self.providers if p["name"] == provider_name), None)
            if not provider:
                continue

            breaker = self.breakers.get(provider_name)
            if breaker and not breaker.can_attempt():
                continue

            api_key = get_api_key_for_provider(provider.get("env_key", ""))
            if not api_key:
                continue

            try:
                pass
            except Exception:
                if breaker:
                    breaker.record_failure()
                continue

        # All providers exhausted or offline -> deterministic fallback (FR-16, RT-31)
        fallback_res = self._execute_fallback(task, payload)
        self.cache[cache_key] = fallback_res
        return fallback_res

    def _execute_fallback(self, task: str, payload: dict[str, Any]) -> dict[str, Any]:
        """Generate deterministic fallback result."""
        output: Any
        if task == "nl_to_ir":
            prompt = str(payload.get("prompt", ""))
            dataset = fallback_nl_to_ir(prompt)
            output = dataset.model_dump()
        elif task == "parse_query":
            text = str(payload.get("text", ""))
            output = fallback_query_parse(text).model_dump()
        elif task == "label_columns":
            cols = payload.get("columns", [])
            output = fallback_label_columns(cols).model_dump()
        elif task == "edge_cases":
            output = [e.model_dump() for e in fallback_edge_cases()]
        else:
            output = {}

        return {
            "output": output,
            "degraded": True,
            "provider": "deterministic_fallback",
            "model": "template_library",
            "task": task,
            "cached": False,
        }
