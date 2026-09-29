"""Multi-provider LLM router with circuit breakers and deterministic fallback.

Behaviour specified in TRD section 9.2.
The LLM is a planner only — it has no tools and its output never
becomes SQL, HTML, file paths, or executable code.
"""
from __future__ import annotations

from typing import Any


class LLMRouter:
    """Routes LLM requests across providers with failover and caching."""

    def __init__(self) -> None:
        # TODO: load providers.yaml, init breakers
        pass

    async def call(self, task: str, payload: dict[str, Any]) -> dict[str, Any]:
        """Execute an LLM task with provider rotation and validation."""
        # TODO: implement router (FR-16, ADR-0003)
        raise NotImplementedError
