import time
from dataclasses import dataclass
from typing import Optional

import litellm

from app.llm.catalog import litellm_model_string
from app.llm.crypto import get_crypto
from app.telemetry.logging import get_logger

logger = get_logger("llm.client")

# Silence LiteLLM's verbose default logging; we handle it ourselves.
litellm.suppress_debug_info = True


@dataclass
class ResolvedLLM:
    provider: str
    model_id: str
    litellm_model: str
    api_key: Optional[str]
    api_base: Optional[str]


@dataclass
class ConnectionTestResult:
    ok: bool
    provider: str
    model_id: str
    latency_ms: Optional[float]
    error: Optional[str]


class LLMClientFactory:
    """
    Resolves per-agent LLM configuration from DB assignments + decrypted credentials,
    then wraps LiteLLM for completion calls with usage tracking.
    """

    def __init__(self) -> None:
        self._cache: dict[str, ResolvedLLM] = {}

    def invalidate(self, agent_name: Optional[str] = None) -> None:
        if agent_name:
            self._cache.pop(agent_name, None)
        else:
            self._cache.clear()

    async def resolve(
        self,
        agent_name: str,
        *,
        session,  # AsyncSession — imported lazily to avoid circular dep
    ) -> ResolvedLLM:
        if agent_name in self._cache:
            return self._cache[agent_name]

        from app.db.repositories import AgentModelRepo, CredentialRepo

        agent_repo = AgentModelRepo(session)
        cred_repo = CredentialRepo(session)

        assignment = await agent_repo.get(agent_name)
        if not assignment:
            raise LookupError(
                f"No model assignment found for agent '{agent_name}'. "
                "Configure it via POST /settings/llm/agents"
            )

        cred = await cred_repo.get(assignment.provider)
        api_key: Optional[str] = None
        if cred:
            crypto = get_crypto()
            api_key = crypto.decrypt(cred.encrypted_key)

        resolved = ResolvedLLM(
            provider=assignment.provider,
            model_id=assignment.model_id,
            litellm_model=litellm_model_string(assignment.provider, assignment.model_id),
            api_key=api_key,
            api_base=assignment.base_url or (cred.base_url if cred else None),
        )
        self._cache[agent_name] = resolved
        return resolved

    async def complete(
        self,
        agent_name: str,
        messages: list[dict],
        *,
        session,
        run_id: Optional[str] = None,
        **kwargs,
    ) -> litellm.ModelResponse:
        from app.db.repositories import UsageRepo

        resolved = await self.resolve(agent_name, session=session)

        call_kwargs = {
            "model": resolved.litellm_model,
            "messages": messages,
            **kwargs,
        }
        if resolved.api_key:
            call_kwargs["api_key"] = resolved.api_key
        if resolved.api_base:
            call_kwargs["api_base"] = resolved.api_base

        logger.info(
            "llm_call",
            agent=agent_name,
            model=resolved.litellm_model,
            run_id=run_id,
        )

        response = await litellm.acompletion(**call_kwargs)

        # Record token usage
        if hasattr(response, "usage") and response.usage:
            usage_repo = UsageRepo(session)
            await usage_repo.record(
                agent_name=agent_name,
                provider=resolved.provider,
                model_id=resolved.model_id,
                prompt_tokens=response.usage.prompt_tokens or 0,
                completion_tokens=response.usage.completion_tokens or 0,
                run_id=run_id,
            )

        return response


async def test_connection(
    provider: str,
    model_id: str,
    api_key: Optional[str],
    api_base: Optional[str] = None,
) -> ConnectionTestResult:
    litellm_model = litellm_model_string(provider, model_id)
    start = time.monotonic()
    try:
        call_kwargs: dict = {
            "model": litellm_model,
            "messages": [{"role": "user", "content": "ping"}],
            "max_tokens": 1,
        }
        if api_key:
            call_kwargs["api_key"] = api_key
        if api_base:
            call_kwargs["api_base"] = api_base

        await litellm.acompletion(**call_kwargs)
        latency_ms = (time.monotonic() - start) * 1000
        logger.info("connection_test_ok", provider=provider, model=model_id, latency_ms=round(latency_ms))
        return ConnectionTestResult(ok=True, provider=provider, model_id=model_id, latency_ms=round(latency_ms), error=None)

    except Exception as exc:  # noqa: BLE001
        latency_ms = (time.monotonic() - start) * 1000
        # Sanitize: never expose raw exception message containing keys
        safe_error = _sanitize_error(str(exc))
        logger.warning("connection_test_failed", provider=provider, model=model_id, error=safe_error)
        return ConnectionTestResult(ok=False, provider=provider, model_id=model_id, latency_ms=None, error=safe_error)


def _sanitize_error(raw: str) -> str:
    import re
    # Redact common API key patterns (sk-..., AIza..., key-..., Bearer ..., etc.)
    cleaned = re.sub(r"\b(sk|AIza|Bearer|token|key)[-_][A-Za-z0-9_\-]{4,}", "***", raw, flags=re.IGNORECASE)
    # Redact long opaque strings (≥20 consecutive alphanum/dash/underscore)
    cleaned = re.sub(r"[A-Za-z0-9_\-]{20,}", "***", cleaned)
    return cleaned[:300]


# Module-level singleton
llm_factory = LLMClientFactory()
