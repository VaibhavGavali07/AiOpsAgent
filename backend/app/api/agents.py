"""Agents API — run the LangGraph pipeline and query results."""

import json
import uuid
from typing import Any, Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from pydantic import BaseModel, Field

from app.api.deps import AuthToken, DBSession
from app.db.repositories import MessageRepo, RunRepo
from app.telemetry.logging import get_logger

router = APIRouter(prefix="/agents", tags=["agents"])
logger = get_logger("api.agents")


# ── Request / response schemas ─────────────────────────────────────────────────

class RunRequest(BaseModel):
    objective: str = Field(..., min_length=5, max_length=2000,
                           description="What to analyse (e.g. 'Summarize P1 incidents this week')")
    filters: dict = Field(default_factory=dict,
                          description="Optional ServiceNow filters: priority, state, days_back, limit")


class RunResponse(BaseModel):
    run_id: str
    status: str
    message: str


class RunSummary(BaseModel):
    run_id: str
    objective: str
    status: str
    current_step: Optional[str]
    started_at: str
    completed_at: Optional[str]
    final_summary: Optional[str]


class RunDetail(RunSummary):
    filters: Any
    chart_specs: Optional[Any]
    analysis_result: Optional[Any]
    tickets: Optional[list]
    error: Optional[str]
    security_flags: Optional[list]


# ── Background worker ──────────────────────────────────────────────────────────

async def _execute_run(run_id: str, objective: str, filters: dict) -> None:
    """Run the graph in the background and persist results."""
    from app.agents.graph import run_graph
    from app.db.session import AsyncSessionFactory

    async with AsyncSessionFactory() as session:
        run_repo = RunRepo(session)
        msg_repo = MessageRepo(session)

        await run_repo.update_status(run_id, "running")
        try:
            final_state = await run_graph(
                objective=objective,
                filters=filters,
                session=session,
                run_id=run_id,
            )

            # Persist key agent outputs as messages
            for agent_name, role, content_key in [
                ("ceo_supervisor", "output", "ceo_initial_plan"),
                ("analytical", "output", "analysis_result"),
                ("graphical_representer", "output", "chart_specs"),
                ("ceo_supervisor", "review", "final_summary"),
            ]:
                value = final_state.get(content_key)
                if value:
                    content_str = json.dumps(value) if not isinstance(value, str) else value
                    await msg_repo.add(run_id, agent_name, role, content_str)

            if final_state.get("security_flags"):
                await msg_repo.add(
                    run_id, "security", "security",
                    json.dumps(final_state["security_flags"])
                )

            await run_repo.update_status(
                run_id,
                status=final_state.get("status", "completed"),
                final_summary=final_state.get("final_summary", ""),
                result_json=json.dumps({
                    "analysis_result": final_state.get("analysis_result"),
                    "chart_specs": final_state.get("chart_specs"),
                    "security_flags": final_state.get("security_flags"),
                    "ceo_initial_plan": final_state.get("ceo_initial_plan"),
                    "tickets": final_state.get("sanitized_tickets") or [],
                }),
                error=final_state.get("error") or None,
            )
            logger.info("run_completed", run_id=run_id, status=final_state.get("status"))

        except Exception as exc:
            err_msg = str(exc)[:500]
            logger.exception("run_failed", run_id=run_id, error=err_msg)
            await run_repo.update_status(run_id, "failed", error=err_msg)


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/run", response_model=RunResponse, status_code=status.HTTP_202_ACCEPTED)
async def start_run(
    body: RunRequest,
    background_tasks: BackgroundTasks,
    session: DBSession,
    _: AuthToken,
) -> RunResponse:
    run_id = str(uuid.uuid4())
    run_repo = RunRepo(session)
    await run_repo.create(
        run_id=run_id,
        objective=body.objective,
        filters=json.dumps(body.filters),
    )

    background_tasks.add_task(
        _execute_run,
        run_id=run_id,
        objective=body.objective,
        filters=body.filters,
    )

    logger.info("run_queued", run_id=run_id, objective=body.objective[:80])
    return RunResponse(run_id=run_id, status="initialized", message="Analysis started. Poll GET /agents/runs/{run_id} for results.")


@router.get("/runs", response_model=list[RunSummary])
async def list_runs(session: DBSession, _: AuthToken) -> list[RunSummary]:
    run_repo = RunRepo(session)
    runs = await run_repo.list_all(limit=50)
    return [
        RunSummary(
            run_id=r.run_id,
            objective=r.objective,
            status=r.status,
            current_step=r.current_step,
            started_at=r.started_at.isoformat(),
            completed_at=r.completed_at.isoformat() if r.completed_at else None,
            final_summary=r.final_summary,
        )
        for r in runs
    ]


@router.get("/runs/{run_id}", response_model=RunDetail)
async def get_run(run_id: str, session: DBSession, _: AuthToken) -> RunDetail:
    run_repo = RunRepo(session)
    run = await run_repo.get(run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Run {run_id!r} not found")

    result_data: dict = {}
    if run.result_json:
        try:
            result_data = json.loads(run.result_json)
        except json.JSONDecodeError:
            pass

    filters_data: Any = {}
    if run.filters:
        try:
            filters_data = json.loads(run.filters)
        except json.JSONDecodeError:
            filters_data = run.filters

    return RunDetail(
        run_id=run.run_id,
        objective=run.objective,
        status=run.status,
        current_step=run.current_step,
        started_at=run.started_at.isoformat(),
        completed_at=run.completed_at.isoformat() if run.completed_at else None,
        final_summary=run.final_summary,
        filters=filters_data,
        chart_specs=result_data.get("chart_specs"),
        analysis_result=result_data.get("analysis_result"),
        tickets=result_data.get("tickets"),
        error=run.error,
        security_flags=result_data.get("security_flags"),
    )


@router.get("/runs/{run_id}/messages")
async def get_messages(run_id: str, session: DBSession, _: AuthToken) -> list[dict]:
    msg_repo = MessageRepo(session)
    messages = await msg_repo.list_for_run(run_id)
    return [
        {
            "id": m.id,
            "agent_name": m.agent_name,
            "role": m.role,
            "content": m.content,
            "created_at": m.created_at.isoformat(),
        }
        for m in messages
    ]
