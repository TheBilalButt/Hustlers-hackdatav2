"""Shared test fixtures.

All tests run with OFFLINE_MODE=1. No live LLM calls.
"""

import os

import pytest

# Force offline mode for all tests
os.environ["OFFLINE_MODE"] = "1"


@pytest.fixture
def sample_recipe() -> dict:
    """Minimal valid recipe for testing."""
    return {
        "recipe_version": 1,
        "engine_version": "0.1.0",
        "ir": {
            "ir_version": "1.0",
            "name": "test_dataset",
            "mode": "schema_only",
            "seed": 42,
            "locale": "en_US",
            "tables": [
                {
                    "name": "users",
                    "row_count": 100,
                    "columns": [
                        {
                            "name": "id",
                            "semantic_type": "id",
                            "dtype": "int",
                            "generator": {"kind": "sequence", "start": 1, "step": 1, "prefix": ""},
                            "pk": True,
                            "unique": True,
                        }
                    ],
                }
            ],
            "relationships": [],
            "invariants": [],
            "privacy": [],
            "chaos": None,
            "documents": [],
            "world": None,
        },
        "llm_plan": [],
        "fitted": None,
        "hash": "",
    }
