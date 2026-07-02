from fastapi import APIRouter

from app.db.repositories import CredentialRepo
from app.api.deps import DBSession

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "opsintel-agentic-dashboard"}


@router.get("/health/llm")
async def health_llm(session: DBSession) -> dict:
    from app.llm.catalog import PROVIDERS

    repo = CredentialRepo(session)
    stored = {c.provider: c for c in await repo.list_all()}

    provider_status = {}
    for provider_key in PROVIDERS:
        if provider_key in stored:
            provider_status[provider_key] = "configured"
        elif provider_key == "ollama":
            provider_status[provider_key] = "optional"
        else:
            provider_status[provider_key] = "unconfigured"

    all_ok = any(v == "configured" for v in provider_status.values())
    return {
        "status": "ready" if all_ok else "no_providers_configured",
        "providers": provider_status,
    }
