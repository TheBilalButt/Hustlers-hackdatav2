"""Provider client and request configuration."""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import yaml


def load_providers_config() -> dict[str, Any]:
    """Load providers configuration from providers.yaml."""
    yaml_path = Path(__file__).parent / "providers.yaml"
    if not yaml_path.exists():
        return {"providers": [], "task_order": {}}
    with open(yaml_path, encoding="utf-8") as f:
        data = yaml.safe_load(f)
        return data if isinstance(data, dict) else {"providers": [], "task_order": {}}


def get_api_key_for_provider(env_key: str) -> str:
    """Get API key from environment."""
    return os.environ.get(env_key, "").strip()
