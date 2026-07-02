import os

import pytest
from cryptography.fernet import Fernet
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

# Set env vars BEFORE importing any app module so settings picks them up.
os.environ["APP_API_KEY"] = "test-key"
os.environ["FERNET_KEY"] = Fernet.generate_key().decode()
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"

# ── Shared in-memory test engine (StaticPool → all connections share one DB) ──
test_engine = create_async_engine(
    "sqlite+aiosqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
test_session_factory = async_sessionmaker(
    bind=test_engine, class_=AsyncSession, expire_on_commit=False
)

# Import app AFTER env vars are set so settings resolves correctly.
from app.db.session import Base, get_session  # noqa: E402
from app.main import app  # noqa: E402


async def _override_get_session() -> AsyncSession:
    async with test_session_factory() as session:
        yield session


# Override the app's DB dependency with the test engine.
app.dependency_overrides[get_session] = _override_get_session


@pytest.fixture(autouse=True, scope="session")
async def _create_tables():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture()
async def db_session() -> AsyncSession:
    async with test_session_factory() as session:
        yield session


@pytest.fixture()
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


@pytest.fixture()
def auth_headers():
    return {"X-API-Key": "test-key"}
