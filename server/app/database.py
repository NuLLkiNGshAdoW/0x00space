"""
Настройка движка SQLAlchemy, сессий и базового класса моделей.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import get_settings

settings = get_settings()

# Для SQLite нужен доп. флаг connect_args, для PostgreSQL — не нужен.
is_sqlite = settings.DATABASE_URL.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}

# Supabase/Render databases can close idle pooled connections.  Pre-ping avoids
# exposing an intermittent 500 to users after the API has been idle.
engine_options = {
    "connect_args": connect_args,
    "pool_pre_ping": True,
}
if not is_sqlite:
    engine_options.update(pool_recycle=1800, pool_size=5, max_overflow=10)

engine = create_engine(settings.DATABASE_URL, **engine_options)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """
    FastAPI dependency: выдаёт сессию БД на время запроса и гарантированно закрывает её.
    Использование: db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
