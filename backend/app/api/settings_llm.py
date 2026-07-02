from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, field_validator

from app.api.deps import AuthToken, DBSession
from app.db.repositories import AgentModelRepo, AuditRepo, CredentialRepo
from app.llm.catalog import PROVIDERS, get_model, get_provider
from app.llm.client import test_connection
from app.llm.crypto import get_crypto
from app.llm.recommendations import recommend

router = APIRouter(prefix="/settings/llm", tags=["llm-settings"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class CredentialIn(BaseModel):
    provider: str
    api_key: str
    base_url: Optional[str] = None

    @field_validator("provider")
    @classmethod
    def validate_provider(cls, v: str) -> str:
        if v not in PROVIDERS:
            raise ValueError(f"Unknown provider '{v}'. Valid: {list(PROVIDERS)}")
        return v


class CredentialOut(BaseModel):
    provider: str
    display_name: str
    masked_key: str
    base_url: Optional[str]
    configured: bool


class ConnectionTestIn(BaseModel):
    provider: str
    model_id: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None


class AgentAssignmentIn(BaseModel):
    agent_name: str
    provider: str
    model_id: str
    base_url: Optional[str] = None

    @field_validator("provider")
    @classmethod
    def validate_provider(cls, v: str) -> str:
        if v not in PROVIDERS:
            raise ValueError(f"Unknown provider '{v}'. Valid: {list(PROVIDERS)}")
        return v


class AgentAssignmentOut(BaseModel):
    agent_name: str
    provider: str
    model_id: str
    base_url: Optional[str]
    litellm_model: str


class RecommendationOut(BaseModel):
    agent_name: str
    tier: str
    rationale: str
    provider: str
    model_id: str
    model_description: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/providers")
async def list_providers(_: AuthToken) -> dict:
    return {
        "providers": {
            key: {
                "display_name": entry["display_name"],
                "litellm_prefix": entry["litellm_prefix"],
                "requires_base_url": entry["requires_base_url"],
                "models": entry["models"],
            }
            for key, entry in PROVIDERS.items()
        }
    }


@router.get("/credentials", response_model=list[CredentialOut])
async def list_credentials(_: AuthToken, session: DBSession) -> list[CredentialOut]:
    repo = CredentialRepo(session)
    creds = await repo.list_all()
    crypto = get_crypto()

    result = []
    for cred in creds:
        plaintext = crypto.decrypt(cred.encrypted_key)
        result.append(
            CredentialOut(
                provider=cred.provider,
                display_name=PROVIDERS.get(cred.provider, {}).get("display_name", cred.provider),
                masked_key=crypto.mask(plaintext),
                base_url=cred.base_url,
                configured=True,
            )
        )
    return result


@router.post("/credentials", status_code=status.HTTP_200_OK)
async def upsert_credential(body: CredentialIn, token: AuthToken, session: DBSession) -> dict:
    crypto = get_crypto()
    encrypted = crypto.encrypt(body.api_key)

    repo = CredentialRepo(session)
    await repo.upsert(provider=body.provider, encrypted_key=encrypted, base_url=body.base_url)

    audit = AuditRepo(session)
    await audit.log(
        actor="api",
        action="credential_upsert",
        detail=f"provider={body.provider} base_url={body.base_url}",
    )

    # Invalidate cached LLM resolutions for this provider
    from app.llm.client import llm_factory
    llm_factory.invalidate()

    return {"status": "ok", "provider": body.provider}


@router.delete("/credentials/{provider}", status_code=status.HTTP_200_OK)
async def delete_credential(provider: str, _: AuthToken, session: DBSession) -> dict:
    repo = CredentialRepo(session)
    deleted = await repo.delete(provider)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"No credential found for provider '{provider}'")

    audit = AuditRepo(session)
    await audit.log(actor="api", action="credential_delete", detail=f"provider={provider}")

    from app.llm.client import llm_factory
    llm_factory.invalidate()

    return {"status": "deleted", "provider": provider}


@router.post("/test")
async def test_provider_connection(body: ConnectionTestIn, _: AuthToken, session: DBSession) -> dict:
    api_key = body.api_key

    # If no inline key provided, try decrypting the stored credential
    if not api_key:
        cred_repo = CredentialRepo(session)
        cred = await cred_repo.get(body.provider)
        if cred:
            crypto = get_crypto()
            api_key = crypto.decrypt(cred.encrypted_key)

    result = await test_connection(
        provider=body.provider,
        model_id=body.model_id,
        api_key=api_key,
        api_base=body.base_url,
    )

    audit = AuditRepo(session)
    await audit.log(
        actor="api",
        action="connection_test",
        detail=f"provider={body.provider} model={body.model_id} ok={result.ok}",
    )

    return {
        "ok": result.ok,
        "provider": result.provider,
        "model_id": result.model_id,
        "latency_ms": result.latency_ms,
        "error": result.error,
    }


@router.get("/recommendations", response_model=list[RecommendationOut])
async def get_recommendations(provider: str, _: AuthToken) -> list[RecommendationOut]:
    if provider not in PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Unknown provider '{provider}'")
    recs = recommend(provider)
    return [
        RecommendationOut(
            agent_name=r.agent_name,
            tier=r.tier,
            rationale=r.rationale,
            provider=r.provider,
            model_id=r.model_id,
            model_description=r.model_description,
        )
        for r in recs
    ]


@router.get("/agents", response_model=list[AgentAssignmentOut])
async def list_agent_assignments(_: AuthToken, session: DBSession) -> list[AgentAssignmentOut]:
    from app.llm.catalog import litellm_model_string

    repo = AgentModelRepo(session)
    assignments = await repo.list_all()
    return [
        AgentAssignmentOut(
            agent_name=a.agent_name,
            provider=a.provider,
            model_id=a.model_id,
            base_url=a.base_url,
            litellm_model=litellm_model_string(a.provider, a.model_id),
        )
        for a in assignments
    ]


@router.post("/agents", status_code=status.HTTP_200_OK)
async def upsert_agent_assignment(
    body: AgentAssignmentIn, _: AuthToken, session: DBSession
) -> dict:
    repo = AgentModelRepo(session)
    await repo.upsert(
        agent_name=body.agent_name,
        provider=body.provider,
        model_id=body.model_id,
        base_url=body.base_url,
    )

    from app.llm.client import llm_factory
    llm_factory.invalidate(body.agent_name)

    return {
        "status": "ok",
        "agent_name": body.agent_name,
        "provider": body.provider,
        "model_id": body.model_id,
    }
