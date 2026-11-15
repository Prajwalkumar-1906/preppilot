import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import pytest
from fastapi.testclient import TestClient

os.environ["SECRET_KEY"] = "test-secret-key-for-interview-coach-testing"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SYNC_DATABASE_URL"] = "sqlite:///:memory:"
os.environ["LLM_PROVIDER"] = "mock"

test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestSessionLocal = sessionmaker(
    bind=test_engine,
    autocommit=False,
    autoflush=False,
)

# Patch app.core.database engine and SessionLocal so lifespan uses in-memory DB
import app.core.database
app.core.database.engine = test_engine
app.core.database.SessionLocal = TestSessionLocal

from app.core.database import Base, get_db
from app.main import app


@pytest.fixture(scope="function", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def client():
    def override_get_db():
        session = TestSessionLocal()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    test_client = TestClient(app=app, base_url="http://test")
    yield test_client
    app.dependency_overrides.clear()
