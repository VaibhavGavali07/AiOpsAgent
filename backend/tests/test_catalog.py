import pytest

from app.llm.catalog import (
    PROVIDERS,
    get_model,
    get_models_by_tier,
    get_provider,
    litellm_model_string,
)


def test_all_providers_present():
    assert {"anthropic", "openai", "google", "ollama"} <= set(PROVIDERS)


def test_each_provider_has_required_fields():
    for name, entry in PROVIDERS.items():
        assert "display_name" in entry
        assert "litellm_prefix" in entry
        assert "requires_base_url" in entry
        assert isinstance(entry["models"], list)


def test_non_ollama_providers_have_models():
    for name, entry in PROVIDERS.items():
        if name != "ollama":
            assert len(entry["models"]) >= 3, f"{name} must have at least 3 models"


def test_all_tiers_covered_for_non_ollama():
    for name, entry in PROVIDERS.items():
        if name == "ollama":
            continue
        tiers = {m["tier"] for m in entry["models"]}
        assert tiers == {"reasoning", "balanced", "fast"}, f"{name} must have all tiers"


def test_get_models_by_tier():
    models = get_models_by_tier("anthropic", "reasoning")
    assert len(models) >= 1
    assert all(m["tier"] == "reasoning" for m in models)


def test_get_model_found():
    m = get_model("openai", "gpt-4o")
    assert m["id"] == "gpt-4o"


def test_get_model_not_found():
    with pytest.raises(ValueError):
        get_model("openai", "gpt-9999-nonexistent")


def test_litellm_model_string():
    assert litellm_model_string("anthropic", "claude-opus-4-8") == "anthropic/claude-opus-4-8"
    assert litellm_model_string("openai", "gpt-4o") == "openai/gpt-4o"
    assert litellm_model_string("google", "gemini-2.0-flash") == "gemini/gemini-2.0-flash"


def test_get_provider_invalid():
    with pytest.raises(ValueError, match="Unknown provider"):
        get_provider("nonexistent")
