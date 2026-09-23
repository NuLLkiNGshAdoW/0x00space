import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

from sqlalchemy import create_engine, inspect, text


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


def test_existing_baseline_schema_can_be_stamped_without_losing_data(tmp_path):
    database_path = (tmp_path / "existing-production.db").as_posix()
    database_url = f"sqlite:///{database_path}"
    engine = create_engine(database_url)

    # Simulate the old DEBUG/create_all deployment, including live data.
    from app import models  # noqa: F401
    from app.database import Base
    from sqlalchemy.orm import Session

    Base.metadata.create_all(bind=engine)
    with Session(engine) as session:
        session.execute(
            models.Resource.__table__.insert().values(
                id="existing-resource",
                title="Existing resource",
                resource_type="MOD",
                game_category="MINECRAFT",
                download_url="https://example.test/resource",
                created_at=datetime(2026, 1, 1),
            )
        )
        session.commit()

    environment = os.environ.copy()
    environment["DATABASE_URL"] = database_url
    server_root = Path(__file__).resolve().parents[1]
    subprocess.run(
        [sys.executable, "-m", "alembic", "stamp", "20260922_0001"],
        cwd=server_root,
        env=environment,
        capture_output=True,
        text=True,
        check=True,
    )

    inspector = inspect(engine)
    assert set(inspector.get_table_names()) == {"alembic_version", "applications", "events", "resources", "seeds"}
    with Session(engine) as session:
        assert session.get(models.Resource, "existing-resource").title == "Existing resource"
        assert session.execute(text("SELECT version_num FROM alembic_version")).scalar_one() == "20260922_0001"
