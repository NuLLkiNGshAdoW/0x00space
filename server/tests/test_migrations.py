import os
import subprocess
import sys
from pathlib import Path

from sqlalchemy import create_engine, inspect


def test_baseline_upgrade_creates_only_current_model_tables(tmp_path):
    database_path = (tmp_path / "migration-test.db").as_posix()
    environment = os.environ.copy()
    environment["DATABASE_URL"] = f"sqlite:///{database_path}"

    server_root = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=server_root,
        env=environment,
        capture_output=True,
        text=True,
        check=True,
    )

    assert "20260922_0001" in result.stdout + result.stderr
    tables = set(inspect(create_engine(environment["DATABASE_URL"])).get_table_names())
    assert tables == {"alembic_version", "applications", "resources", "seeds", "events"}
