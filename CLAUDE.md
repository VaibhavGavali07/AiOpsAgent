# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

OpsIntel Agentic Dashboard — an AI-powered IT Operations Intelligence Platform that ingests ServiceNow task data, analyzes it with a LangGraph multi-agent system, and presents insights through an enterprise dashboard.

## Commands

All commands assume the venv is active: `.venv\Scripts\activate` (Windows) / `source .venv/bin/activate` (Mac/Linux).

### Backend

```bash
# From project root (opsintel-agentic-dashboard/)
pip install -e ".[dev]"                          # install / sync deps

# From backend/
uvicorn app.main:app --reload                    # dev server on :8000
python -m pytest ../tests -v                     # all tests (run from backend/)
python -m pytest ../tests/test_llm_config_api.py::test_health -v   # single test
python -m pytest ../tests -k "credential" -v    # filter by keyword
```

Tests use in-memory SQLite with `StaticPool` and override `get_session` via `app.dependency_overrides` — no real DB or LLM calls needed.

### Frontend

```bash
# From frontend/
npm install
npm run dev      # dev server on :5173, proxies /api → localhost:8000
npm run build    # tsc + vite bundle
npm run lint     # eslint
```

### Environment setup (one-time)

```bash
# Generate FERNET_KEY
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# Copy .env.example → .env at project root, fill in FERNET_KEY and APP_API_KEY
```

`.env` lives at the **project root** (`opsintel-agentic-dashboard/.env`). `settings.py` resolves it via `Path(__file__)` so it is found regardless of which directory uvicorn is launched from.

## Architecture

### Data flow

```
Frontend (React/Vite :5173)
  └─ axios → /api/* (proxied to FastAPI :8000)
       ├─ Auth: X-API-Key header checked against APP_API_KEY
       ├─ /settings/llm/*  — credential + agent-model management
       ├─ /health           — liveness + provider status
       └─ /agents/*         — LangGraph run management (pass 2+)

FastAPI
  ├─ LLMClientFactory      — resolves per-agent LLM config from DB, wraps LiteLLM
  ├─ CryptoService          — Fernet encrypt/decrypt for stored API keys
  └─ SQLAlchemy async ORM  — SQLite (dev) or Postgres (prod)
```

### LLM configuration system

The platform is provider-agnostic. Users supply API keys through the UI; the backend stores them Fernet-encrypted. Each of the five agents (`ceo_supervisor`, `analytical`, `graphical_representer`, `security`, `servicenow_pulling`) has an independent model assignment in the DB.

- **`llm/catalog.py`** — static registry of providers (Anthropic, OpenAI, Google, Ollama) and their models tagged with tiers: `reasoning / balanced / fast`
- **`llm/recommendations.py`** — maps agent roles to tiers (CEO→reasoning, security→fast, etc.); `recommend(provider)` returns pre-filled assignments
- **`llm/client.py`** — `LLMClientFactory` singleton: resolves agent→assignment→credential→LiteLLM model string, caches, records token usage in `llm_usage` table; `test_connection()` issues a 1-token ping and sanitizes errors before returning
- **`llm/crypto.py`** — `CryptoService(Fernet)`; `mask()` returns `sk-…last4` for API responses — plaintext never leaves the server

LiteLLM model strings follow the pattern `{prefix}/{model_id}` (e.g. `anthropic/claude-opus-4-8`).

### Agent graph (pass 2+)

LangGraph `StateGraph` in `agents/graph.py`. Nodes are async functions that receive typed state and return partial state updates. Flow:

```
START → ceo_initial → security_pre → servicenow_pulling → security_data
      → analytical → security_output → graphical → ceo_final → END
```

Security nodes can short-circuit to `error_handler → END`. CEO final can loop back to `analytical` for rework (guarded by `retry_count`). Each node resolves its LLM via `LLMClientFactory.resolve(agent_name, session=session)` and falls back to demo output if no assignment exists.

### Agent graph

`agents/graph.py` exports a compiled LangGraph `graph` and a `run_graph(objective, filters, *, session, run_id)` coroutine.

- **State** (`agents/state.py`): `OpsIntelState` TypedDict. `security_flags` uses `Annotated[list, operator.add]` to accumulate across all three security nodes.
- **Demo mode**: every agent node catches `LookupError`/`Exception` from `llm_factory` and falls back to deterministic demo output. The full pipeline runs without any LLM configured.
- **Injection detection** (`agents/security_agent.py`): `_INJECTION_RE` compiled once at module load. Pattern uses `(?:...)*` (zero-or-more) for qualifier groups so "ignore all previous instructions" matches.
- **Background execution**: `POST /agents/run` persists an `AnalysisRun` row synchronously (so the poll endpoint returns 202 immediately), then hands `_execute_run` to FastAPI `BackgroundTasks`. `_execute_run` opens its own `AsyncSessionFactory()` session — it cannot reuse the request session which closes after the 202 returns.
- **Node config injection**: every node receives `config: RunnableConfig` as the second argument. DB session is passed via `config["configurable"]["session"]`.

### Database

Six tables total:

| Table | Purpose |
|---|---|
| `provider_credentials` | One row per provider; `encrypted_key` is Fernet ciphertext |
| `agent_model_assignments` | One row per agent; maps to provider + model_id |
| `llm_usage` | Token usage per agent call, optionally keyed to `run_id` |
| `audit_log` | Append-only log of all credential/config mutations |
| `analysis_runs` | One row per graph run; status lifecycle: initialized → running → completed/failed/blocked |
| `agent_messages` | Per-node agent outputs, keyed by `run_id`; role ∈ {output, review, security} |

Repository classes (`CredentialRepo`, `AgentModelRepo`, `UsageRepo`, `AuditRepo`, `RunRepo`, `MessageRepo`) in `db/repositories.py` are the only place that issues SQL.

### Key patterns

- **Dependency injection**: `DBSession` and `AuthToken` type aliases in `api/deps.py` are injected into every route handler via FastAPI `Depends`.
- **Factory cache invalidation**: `llm_factory.invalidate(agent_name)` must be called after any credential or assignment change (done inside the relevant API endpoints).
- **No `func.now()` in models**: `updated_at` / `created_at` use Python-side `default=_now` lambdas — `server_default=func.now()` causes greenlet errors with aiosqlite.
- **Test DB override**: `conftest.py` creates a `StaticPool` in-memory engine and wires it via `app.dependency_overrides[get_session]`. The app's real engine is never touched during tests.

## Project structure (non-obvious parts)

```
opsintel-agentic-dashboard/
  .env                        ← project root (not inside backend/)
  pyproject.toml              ← also project root; install from here
  backend/
    app/
      llm/                    ← provider catalog, crypto, recommendations, LiteLLM factory
      agents/                 ← LangGraph state, nodes, graph, tools, prompts
                                  state.py, prompts.py, demo_data.py, tools.py
                                  ceo_agent.py, security_agent.py, servicenow_pulling_agent.py
                                  analytical_agent.py, graphical_representer_agent.py, graph.py
      db/                     ← models, session, repositories
      api/                    ← route handlers; all non-health routes require auth
      security/auth.py        ← require_auth FastAPI dependency
      telemetry/logging.py    ← structlog JSON renderer; bind run_id/agent_name to context
  frontend/
    src/
      api/client.ts           ← single axios instance + llmApi methods
      store/llmStore.ts       ← Zustand: selected provider state
      types/llm.ts            ← shared TS types + AGENT_DISPLAY_NAMES + TIER_BADGE
```
