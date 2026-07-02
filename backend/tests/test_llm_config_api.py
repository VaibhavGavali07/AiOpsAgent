import pytest


@pytest.mark.asyncio
async def test_health(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_auth_required_on_credentials(client):
    resp = await client.get("/settings/llm/credentials")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_list_providers_requires_auth(client):
    resp = await client.get("/settings/llm/providers")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_list_providers_with_auth(client, auth_headers):
    resp = await client.get("/settings/llm/providers", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert "providers" in body
    assert "anthropic" in body["providers"]
    assert "openai" in body["providers"]
    assert "google" in body["providers"]
    assert "ollama" in body["providers"]


@pytest.mark.asyncio
async def test_upsert_credential_and_list(client, auth_headers):
    payload = {"provider": "openai", "api_key": "sk-testkey1234567890abcdef"}
    resp = await client.post("/settings/llm/credentials", json=payload, headers=auth_headers)
    assert resp.status_code == 200

    resp = await client.get("/settings/llm/credentials", headers=auth_headers)
    assert resp.status_code == 200
    creds = resp.json()
    openai_cred = next((c for c in creds if c["provider"] == "openai"), None)
    assert openai_cred is not None
    assert openai_cred["configured"] is True
    # Key must NEVER be returned in plaintext
    assert "sk-testkey1234567890abcdef" not in str(openai_cred)
    assert "masked_key" in openai_cred
    assert "…" in openai_cred["masked_key"]


@pytest.mark.asyncio
async def test_upsert_invalid_provider(client, auth_headers):
    resp = await client.post(
        "/settings/llm/credentials",
        json={"provider": "bogus_provider", "api_key": "key"},
        headers=auth_headers,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_delete_credential(client, auth_headers):
    await client.post(
        "/settings/llm/credentials",
        json={"provider": "google", "api_key": "gk-test-abcdef1234567890"},
        headers=auth_headers,
    )
    resp = await client.delete("/settings/llm/credentials/google", headers=auth_headers)
    assert resp.status_code == 200

    resp = await client.get("/settings/llm/credentials", headers=auth_headers)
    creds = resp.json()
    assert not any(c["provider"] == "google" for c in creds)


@pytest.mark.asyncio
async def test_delete_nonexistent_credential(client, auth_headers):
    resp = await client.delete("/settings/llm/credentials/nonexistent", headers=auth_headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_recommendations(client, auth_headers):
    resp = await client.get(
        "/settings/llm/recommendations", params={"provider": "anthropic"}, headers=auth_headers
    )
    assert resp.status_code == 200
    recs = resp.json()
    assert len(recs) == 5
    names = {r["agent_name"] for r in recs}
    assert "ceo_supervisor" in names
    assert "security" in names


@pytest.mark.asyncio
async def test_recommendations_invalid_provider(client, auth_headers):
    resp = await client.get(
        "/settings/llm/recommendations", params={"provider": "bogus"}, headers=auth_headers
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_upsert_agent_assignment(client, auth_headers):
    payload = {
        "agent_name": "ceo_supervisor",
        "provider": "anthropic",
        "model_id": "claude-opus-4-8",
    }
    resp = await client.post("/settings/llm/agents", json=payload, headers=auth_headers)
    assert resp.status_code == 200

    resp = await client.get("/settings/llm/agents", headers=auth_headers)
    assert resp.status_code == 200
    assignments = resp.json()
    ceo = next((a for a in assignments if a["agent_name"] == "ceo_supervisor"), None)
    assert ceo is not None
    assert ceo["model_id"] == "claude-opus-4-8"
    assert ceo["litellm_model"] == "anthropic/claude-opus-4-8"
