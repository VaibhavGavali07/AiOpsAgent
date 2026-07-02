from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.settings import settings


class Base(DeclarativeBase):
    pass


engine = create_async_engine(
    settings.database_url,
    echo=False,
    connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {},
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Add current_step column if missing (safe on existing DBs)
        try:
            await conn.execute(
                __import__("sqlalchemy").text(
                    "ALTER TABLE analysis_runs ADD COLUMN current_step VARCHAR(100)"
                )
            )
        except Exception:
            pass  # column already exists


async def get_session() -> AsyncSession:  # used as FastAPI dependency
    async with AsyncSessionLocal() as session:
        yield session


# Direct factory for background tasks that can't use FastAPI's DI
AsyncSessionFactory = AsyncSessionLocal
