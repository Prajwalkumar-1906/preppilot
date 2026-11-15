from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

# Engine setup
engine_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    engine_args["connect_args"] = {"check_same_thread": False}
else:
    engine_args["pool_size"] = 10
    engine_args["max_overflow"] = 20

# Normalize sqlite URL if it has async driver prefix
db_url = settings.DATABASE_URL.replace("+aiosqlite", "").replace("+asyncpg", "")

engine = create_engine(db_url, echo=False, **engine_args)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False
)


class Base(DeclarativeBase):
    """Base model class for all SQLAlchemy declarative models."""
    pass


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for obtaining a database session."""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
