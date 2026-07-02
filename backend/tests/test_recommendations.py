import pytest

from app.llm.catalog import PROVIDERS
from app.llm.recommendations import AGENT_ROLES, recommend


def test_recommend_returns_all_agents():
    recs = recommend("anthropic")
    agent_names = {r.agent_name for r in recs}
    expected = {role.name for role in AGENT_ROLES}
    assert agent_names == expected


def test_recommend_anthropic_reasoning_is_opus():
    recs = {r.agent_name: r for r in recommend("anthropic")}
    assert recs["ceo_supervisor"].model_id == "claude-opus-4-8"
    assert recs["ceo_supervisor"].tier == "reasoning"


def test_recommend_anthropic_fast_is_haiku():
    recs = {r.agent_name: r for r in recommend("anthropic")}
    assert "haiku" in recs["security"].model_id.lower()
    assert recs["security"].tier == "fast"


def test_recommend_openai():
    recs = {r.agent_name: r for r in recommend("openai")}
    assert recs["ceo_supervisor"].model_id == "gpt-4.1"
    assert recs["security"].model_id == "gpt-4o-mini"


def test_recommend_google():
    recs = {r.agent_name: r for r in recommend("google")}
    assert "pro" in recs["ceo_supervisor"].model_id.lower()


def test_recommend_ollama_does_not_crash():
    recs = recommend("ollama")
    assert len(recs) == len(AGENT_ROLES)


def test_recommend_unknown_provider():
    with pytest.raises(ValueError, match="Unknown provider"):
        recommend("unknown_provider")
