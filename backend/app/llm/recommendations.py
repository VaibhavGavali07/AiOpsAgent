from typing import NamedTuple

from app.llm.catalog import PROVIDERS, Tier, get_models_by_tier


class AgentRole(NamedTuple):
    name: str
    tier: Tier
    rationale: str


AGENT_ROLES: list[AgentRole] = [
    AgentRole("ceo_supervisor",        "reasoning", "Top-level judgment, review, and final approval"),
    AgentRole("analytical",            "balanced",  "Synthesis over computed metrics and RAG evidence"),
    AgentRole("graphical_representer", "balanced",  "Visualization design and dashboard layout reasoning"),
    AgentRole("security",              "fast",      "Classification, redaction, and injection detection"),
    AgentRole("servicenow_pulling",    "fast",      "Mostly deterministic ingestion with minimal LLM use"),
]


class AgentRecommendation(NamedTuple):
    agent_name: str
    tier: Tier
    rationale: str
    provider: str
    model_id: str
    model_description: str


def recommend(provider: str) -> list[AgentRecommendation]:
    if provider not in PROVIDERS:
        raise ValueError(f"Unknown provider: {provider!r}")

    results: list[AgentRecommendation] = []
    for role in AGENT_ROLES:
        models = get_models_by_tier(provider, role.tier)
        if not models:
            # Ollama has no catalog models; use balanced tier fallback or skip
            models = get_models_by_tier(provider, "balanced") or get_models_by_tier(provider, "fast")
        if not models:
            model_id = "custom"
            description = "User-defined local model"
        else:
            model_id = models[0]["id"]
            description = models[0]["description"]

        results.append(
            AgentRecommendation(
                agent_name=role.name,
                tier=role.tier,
                rationale=role.rationale,
                provider=provider,
                model_id=model_id,
                model_description=description,
            )
        )
    return results
