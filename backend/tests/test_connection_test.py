from unittest.mock import AsyncMock, patch

import pytest

from app.llm.client import ConnectionTestResult
from app.llm.client import test_connection as run_connection_test


@pytest.mark.asyncio
async def test_connection_success():
    mock_response = AsyncMock()
    mock_response.usage = AsyncMock(prompt_tokens=1, completion_tokens=1)

    with patch("app.llm.client.litellm.acompletion", new_callable=AsyncMock, return_value=mock_response):
        result = await run_connection_test(
            provider="anthropic",
            model_id="claude-haiku-4-5-20251001",
            api_key="sk-fake-key-for-test",
        )

    assert isinstance(result, ConnectionTestResult)
    assert result.ok is True
    assert result.provider == "anthropic"
    assert result.model_id == "claude-haiku-4-5-20251001"
    assert result.error is None
    assert result.latency_ms is not None and result.latency_ms >= 0


@pytest.mark.asyncio
async def test_connection_failure():
    with patch(
        "app.llm.client.litellm.acompletion",
        new_callable=AsyncMock,
        side_effect=Exception("AuthenticationError: Invalid API key sk-real-key-ABCD1234"),
    ):
        result = await run_connection_test(
            provider="openai",
            model_id="gpt-4o",
            api_key="sk-bad-key",
        )

    assert result.ok is False
    assert result.error is not None
    # Ensure raw key is not in error string
    assert "sk-real-key-ABCD1234" not in result.error
    assert result.latency_ms is None


@pytest.mark.asyncio
async def test_connection_test_via_api(client, auth_headers):
    mock_response = AsyncMock()
    mock_response.usage = AsyncMock(prompt_tokens=1, completion_tokens=1)

    with patch("app.llm.client.litellm.acompletion", new_callable=AsyncMock, return_value=mock_response):
        resp = await client.post(
            "/settings/llm/test",
            json={"provider": "openai", "model_id": "gpt-4o-mini", "api_key": "sk-fake"},
            headers=auth_headers,
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["ok"] is True
    assert body["provider"] == "openai"
