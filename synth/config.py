"""Application configuration via pydantic-settings.

Reads from environment variables. All limits follow TRD section 2.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # LLM providers
    groq_api_key: str = ""
    gemini_api_key: str = ""
    cf_account_id: str = ""
    cf_api_token: str = ""
    openrouter_api_key: str = ""
    mistral_api_key: str = ""

    # Security
    hmac_key: str = ""

    # Runtime
    offline_mode: bool = False
    engine_version: str = "0.1.0"

    # Hard limits (TRD §2)
    max_rows_per_dataset: int = 200_000
    max_tables: int = 12
    max_columns_per_table: int = 64
    block_size: int = 10_000
    max_upload_bytes: int = 4 * 1024 * 1024  # 4 MB
    max_prompt_chars: int = 4_000
    max_pdfs_per_request: int = 50
    max_docs_per_recipe: int = 2_000
    request_timeout_seconds: int = 60

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
