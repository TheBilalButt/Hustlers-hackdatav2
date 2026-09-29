"""Export the IR as JSON Schema for TS type generation."""
import json
from pathlib import Path

from synth.ir.models import Dataset


def export_json_schema(output_path: Path | None = None) -> str:
    """Generate JSON Schema from the Dataset model."""
    schema = Dataset.model_json_schema()
    schema_str = json.dumps(schema, indent=2)

    if output_path:
        output_path.write_text(schema_str, encoding="utf-8")

    return schema_str


if __name__ == "__main__":
    out = Path(__file__).parent / "ir.schema.json"
    export_json_schema(out)
    print(f"Schema written to {out}")
