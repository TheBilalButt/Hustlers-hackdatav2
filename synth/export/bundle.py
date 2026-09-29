"""Export bundle packaging as ZIP (FR-13).

Packages:
- tables/*.csv (formula-safe)
- tables/*.jsonl
- schema.sql
- database.sqlite (when <= 4 MB)
- recipe.json
- manifest.json
- trust_report.json
"""
from __future__ import annotations

import hashlib
import io
import json
import zipfile
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from synth.config import settings
from synth.export.csv_safe import encode_csv
from synth.export.jsonl import encode_jsonl
from synth.export.sql import generate_dataset_sql
from synth.export.sqlite import export_sqlite_bytes

if TYPE_CHECKING:
    from synth.ir.models import Dataset


def create_export_bundle(
    dataset: Dataset,
    data: dict[str, list[dict[str, Any]]],
    trust_report: dict[str, Any] | None = None,
) -> bytes:
    """Create a complete ZIP archive with all export formats and manifests."""
    buf = io.BytesIO()
    manifest_entries: list[dict[str, Any]] = []

    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        def _add_file(filename: str, content_bytes: bytes) -> None:
            zf.writestr(filename, content_bytes)
            file_hash = hashlib.sha256(content_bytes).hexdigest()
            manifest_entries.append({
                "path": filename,
                "bytes": len(content_bytes),
                "sha256": file_hash,
            })

        for table in dataset.tables:
            rows = data.get(table.name, [])
            col_names = [c.name for c in table.columns]

            csv_str = encode_csv(rows, col_names)
            _add_file(f"tables/{table.name}.csv", csv_str.encode("utf-8"))

            jsonl_str = encode_jsonl(rows)
            _add_file(f"tables/{table.name}.jsonl", jsonl_str.encode("utf-8"))

        sql_str = generate_dataset_sql(dataset, data)
        _add_file("schema.sql", sql_str.encode("utf-8"))

        total_rows = sum(len(rows) for rows in data.values())
        if total_rows <= 100_000:
            db_bytes = export_sqlite_bytes(dataset, data)
            _add_file("database.sqlite", db_bytes)

        recipe_json = json.dumps(dataset.model_dump(), indent=2, ensure_ascii=False)
        _add_file("recipe.json", recipe_json.encode("utf-8"))

        if trust_report is not None:
            trust_json = json.dumps(trust_report, indent=2, ensure_ascii=False)
            _add_file("trust_report.json", trust_json.encode("utf-8"))

        manifest = {
            "dataset_name": dataset.name,
            "engine_version": settings.engine_version,
            "seed": dataset.seed,
            "locale": dataset.locale,
            "exported_at": datetime.now(UTC).isoformat(),
            "total_tables": len(dataset.tables),
            "total_rows": total_rows,
            "files": manifest_entries,
        }
        manifest_json = json.dumps(manifest, indent=2, ensure_ascii=False)
        zf.writestr("manifest.json", manifest_json.encode("utf-8"))

    return buf.getvalue()