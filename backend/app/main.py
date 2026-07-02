from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import agents, health, rules, settings_llm
from app.db.session import init_db
from app.settings import settings
from app.telemetry.logging import configure_logging


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging(settings.log_level)
    await init_db()
    yield


app = FastAPI(
    title="OpsIntel Agentic Dashboard",
    description="AI-powered IT Operations Intelligence Platform",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(settings_llm.router)
app.include_router(agents.router)
app.include_router(rules.router)
