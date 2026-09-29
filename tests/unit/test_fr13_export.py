"""Tests for FR-13: Exports.

T-13a: CSV formula escaping
T-13b: SQL round-trip in sqlite3
T-13c: ZIP bundle contents
"""

import io
import sqlite3
import zipfile

from synth.engines.relational import generate_relational
from synth.export.bundle import create_export_bundle
from synth.export.csv_safe import encode_csv
from synth.export.sql import generate_dataset_sql
from synth.export.sqlite import export_sqlite_bytes
from synth.ir.models import (
    Cardinality,
    Column,
    Dataset,
    FakerGenerator,
    ForeignKeyGenerator,
    NumericGenerator,
    Relationship,
    SequenceGenerator,
    Table,
)


def make_test_dataset() -> Dataset:
    return Dataset(
        ir_version="1.0",
        name="Export Test Dataset",
        mode="schema_only",
        seed=42,
        locale="en_US",
        tables=[
            Table(
                name="users",
                row_count=10,
                columns=[
                    Column(
                        name="user_id",
                        semantic_type="id",
                        dtype="int",
                        generator=SequenceGenerator(start=1),
                        pk=True,
                    ),
                    Column(
                        name="name",
                        semantic_type="person_name",
                        dtype="str",
                        generator=FakerGenerator(provider="name"),
                    ),
                    Column(
                        name="balance",
                        semantic_type="money",
                        dtype="decimal",
                        generator=NumericGenerator(dist="uniform", min_val=10.0, max_val=250.0),
                    ),
                ],
            ),
            Table(
                name="posts",
                row_count=20,
                columns=[
                    Column(
                        name="post_id",
                        semantic_type="id",
                        dtype="int",
                        generator=SequenceGenerator(start=101),
                        pk=True,
                    ),
                    Column(
                        name="user_id",
                        semantic_type="id",
                        dtype="int",
                        generator=ForeignKeyGenerator(
                            reference_table="users", reference_column="user_id"
                        ),
                    ),
                    Column(
                        name="title",
                        semantic_type="text_short",
                        dtype="str",
                        generator=FakerGenerator(provider="text_short"),
                    ),
                ],
            ),
        ],
        relationships=[
            Relationship(
                parent="users",
                parent_key="user_id",
                child="posts",
                child_key="user_id",
                kind="one_to_many",
                cardinality=Cardinality(dist="fixed", min_val=2, max_val=2),
            )
        ],
        invariants=[],
        privacy=[],
    )


def test_fr13_t13a_csv_formula_escaping():
    """T-13a: Formula prefixing escapes cells starting with =, +, -, @, \\t, \\r."""
    rows = [
        {"id": 1, "formula": "=SUM(A1:A10)", "safe_num": 100},
        {"id": 2, "formula": "+12345", "safe_num": -50},
        {"id": 3, "formula": "@cmd", "safe_num": 0},
    ]
    csv_str = encode_csv(rows, ["id", "formula", "safe_num"])
    lines = csv_str.strip().split("\n")
    assert "'=SUM(A1:A10)" in lines[1]
    assert "'+12345" in lines[2]
    assert "'@cmd" in lines[3]


def test_fr13_t13b_sql_roundtrip_sqlite3():
    """T-13b: Generated SQL executes cleanly in SQLite with exact roundtrip row counts."""
    ds = make_test_dataset()
    data = generate_relational(ds)

    sql_script = generate_dataset_sql(ds, data)
    assert "CREATE TABLE" in sql_script
    assert "INSERT INTO" in sql_script

    # Execute in an in-memory SQLite database
    conn = sqlite3.connect(":memory:")
    cursor = conn.cursor()
    cursor.executescript(sql_script)

    # Verify users
    cursor.execute("SELECT COUNT(*) FROM users")
    count_users = cursor.fetchone()[0]
    assert count_users == len(data["users"])

    # Verify posts
    cursor.execute("SELECT COUNT(*) FROM posts")
    count_posts = cursor.fetchone()[0]
    assert count_posts == len(data["posts"])

    # Verify FK integrity inside SQLite
    cursor.execute("""
        SELECT COUNT(*)
        FROM posts p
        LEFT JOIN users u ON p.user_id = u.user_id
        WHERE u.user_id IS NULL
    """)
    orphans = cursor.fetchone()[0]
    assert orphans == 0, "Foreign key orphans found in SQL database"

    conn.close()


def test_fr13_sqlite_binary_export():
    """Verify SQLite binary database builds and can be queried directly."""
    ds = make_test_dataset()
    data = generate_relational(ds)

    db_bytes = export_sqlite_bytes(ds, data)
    assert db_bytes.startswith(b"SQLite format 3\x00")

    # Connect to the binary buffer via temporary memory/file
    import tempfile

    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        tmp.write(db_bytes)
        tmp_path = tmp.name

    conn = sqlite3.connect(tmp_path)
    c = conn.cursor()
    c.execute("SELECT count(*) FROM users")
    assert c.fetchone()[0] == len(data["users"])
    conn.close()


def test_fr13_t13c_zip_bundle_contents():
    """T-13c: ZIP export contains CSVs, JSONL, SQL, SQLite, and recipe manifests."""
    ds = make_test_dataset()
    data = generate_relational(ds)

    zip_bytes = create_export_bundle(ds, data)
    assert len(zip_bytes) > 0

    with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as zf:
        namelist = zf.namelist()
        assert "recipe.json" in namelist
        assert "schema.sql" in namelist
        assert "manifest.json" in namelist
        assert "tables/users.csv" in namelist
        assert "tables/posts.csv" in namelist
        assert "tables/users.jsonl" in namelist
        assert "tables/posts.jsonl" in namelist
        assert "database.sqlite" in namelist

        # Verify recipe.json parses
        import json

        recipe = json.loads(zf.read("recipe.json").decode("utf-8"))
        assert recipe["name"] == ds.name
