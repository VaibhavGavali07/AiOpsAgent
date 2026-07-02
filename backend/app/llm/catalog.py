from typing import Literal, TypedDict


Tier = Literal["reasoning", "balanced", "fast"]


class ModelEntry(TypedDict):
    id: str
    tier: Tier
    context_window: int
    description: str


class ProviderEntry(TypedDict):
    display_name: str
    litellm_prefix: str
    requires_base_url: bool
    env_key_name: str
    models: list[ModelEntry]


PROVIDERS: dict[str, ProviderEntry] = {
    "anthropic": {
        "display_name": "Anthropic (Claude)",
        "litellm_prefix": "anthropic",
        "requires_base_url": False,
        "env_key_name": "ANTHROPIC_API_KEY",
        "models": [
            {
                "id": "claude-opus-4-8",
                "tier": "reasoning",
                "context_window": 200000,
                "description": "Highest capability — deep reasoning, multi-step analysis",
            },
            {
                "id": "claude-sonnet-4-6",
                "tier": "balanced",
                "context_window": 200000,
                "description": "Strong reasoning at lower cost — ideal for analytics",
            },
            {
                "id": "claude-haiku-4-5-20251001",
                "tier": "fast",
                "context_window": 200000,
                "description": "Fastest / cheapest — classification, redaction, simple tasks",
            },
        ],
    },
    "openai": {
        "display_name": "OpenAI",
        "litellm_prefix": "openai",
        "requires_base_url": False,
        "env_key_name": "OPENAI_API_KEY",
        "models": [
            {
                "id": "gpt-4.1",
                "tier": "reasoning",
                "context_window": 1000000,
                "description": "Latest flagship — best reasoning and instruction following",
            },
            {
                "id": "gpt-4o",
                "tier": "balanced",
                "context_window": 128000,
                "description": "Fast and capable — good for analytical workloads",
            },
            {
                "id": "gpt-4o-mini",
                "tier": "fast",
                "context_window": 128000,
                "description": "Cost-efficient — classification and quick tasks",
            },
        ],
    },
    "google": {
        "display_name": "Google (Gemini)",
        "litellm_prefix": "gemini",
        "requires_base_url": False,
        "env_key_name": "GEMINI_API_KEY",
        "models": [
            {
                "id": "gemini-2.5-pro",
                "tier": "reasoning",
                "context_window": 1000000,
                "description": "Gemini's strongest model — deep reasoning with huge context",
            },
            {
                "id": "gemini-2.0-flash",
                "tier": "balanced",
                "context_window": 1000000,
                "description": "Fast and accurate — large context at moderate cost",
            },
            {
                "id": "gemini-2.0-flash-lite",
                "tier": "fast",
                "context_window": 1000000,
                "description": "Lightest Gemini — maximum speed and cost efficiency",
            },
        ],
    },
    "ollama": {
        "display_name": "Local / Self-hosted (Ollama)",
        "litellm_prefix": "ollama",
        "requires_base_url": True,
        "env_key_name": "",
        "models": [],
    },
}


def get_provider(provider: str) -> ProviderEntry:
    if provider not in PROVIDERS:
        raise ValueError(f"Unknown provider: {provider!r}. Valid: {list(PROVIDERS)}")
    return PROVIDERS[provider]


def get_models_by_tier(provider: str, tier: Tier) -> list[ModelEntry]:
    entry = get_provider(provider)
    return [m for m in entry["models"] if m["tier"] == tier]


def get_model(provider: str, model_id: str) -> ModelEntry:
    entry = get_provider(provider)
    for m in entry["models"]:
        if m["id"] == model_id:
            return m
    raise ValueError(f"Model {model_id!r} not found for provider {provider!r}")


def litellm_model_string(provider: str, model_id: str) -> str:
    prefix = PROVIDERS[provider]["litellm_prefix"]
    return f"{prefix}/{model_id}"
