"""
LangGraph StateGraph for OpsIntel multi-agent analysis pipeline.

Flow:
  START → ceo_initial → security_pre
        → [blocked] error_handler → END
        → servicenow_pulling → security_data
        → [blocked] error_handler → END
        → analytical → security_output
        → [output_fail / retry] analytical (loop, max 2)
        → [blocked] error_handler → END
        → graphical → ceo_final
        → [needs_rework + retries left] analytical
        → END
"""

import json
import uuid

from langgraph.graph import END, START, StateGraph
from langchain_core.runnables import RunnableConfig

from app.agents.analytical_agent import analytical_node
from app.agents.ceo_agent import ceo_final_node, ceo_initial_node
from app.agents.graphical_representer_agent import graphical_node
from app.agents.security_agent import (
    security_data_node,
    security_output_node,
    security_pre_node,
)
from app.agents.servicenow_pulling_agent import servicenow_pulling_node
from app.agents.state import OpsIntelState
from app.telemetry.logging import get_logger

logger = get_logger("agents.graph")

_MAX_RETRIES = 2


# ── Routing functions ──────────────────────────────────────────────────────────

def route_after_security_pre(state: OpsIntelState) -> str:
    return "servicenow_pulling" if state.get("security_pre_passed", True) else "error_handler"


def route_after_security_data(state: OpsIntelState) -> str:
    return "analytical" if state.get("security_data_passed", True) else "error_handler"


def route_after_security_output(state: OpsIntelState) -> str:
    if state.get("security_output_passed", True):
        return "graphical"
    if state.get("retry_count", 0) < _MAX_RETRIES:
        return "analytical"
    return "error_handler"


def route_after_ceo_final(state: OpsIntelState) -> str:
    if state.get("ceo_approved", True):
        return END
    if state.get("retry_count", 0) < _MAX_RETRIES:
        return "analytical"
    return END


# ── Step progress helper ───────────────────────────────────────────────────────

async def _set_step(state: OpsIntelState, config: RunnableConfig, step: str) -> None:
    session = config.get("configurable", {}).get("session")
    run_id = state.get("run_id")
    if session and run_id:
        try:
            from app.db.repositories import RunRepo
            await RunRepo(session).set_step(run_id, step)
        except Exception:
            pass


def _with_step(step_name: str, node_fn):
    """Wrap a node so it records its step name in the DB before executing."""
    async def wrapper(state: OpsIntelState, config: RunnableConfig) -> dict:
        await _set_step(state, config, step_name)
        return await node_fn(state, config)
    wrapper.__name__ = node_fn.__name__
    return wrapper


# ── Error handler node ─────────────────────────────────────────────────────────

async def error_handler_node(state: OpsIntelState, config: RunnableConfig) -> dict:
    reasons = []
    if not state.get("security_pre_passed", True):
        reasons.append(f"security_pre: {state.get('security_pre_reason', 'blocked')}")
    if not state.get("security_data_passed", True):
        reasons.append(f"security_data: {state.get('security_data_reason', 'blocked')}")
    if not state.get("security_output_passed", True):
        reasons.append(f"security_output: {state.get('security_output_reason', 'blocked')}")

    error_msg = "; ".join(reasons) or "pipeline blocked"
    logger.warning("pipeline_blocked", error=error_msg, run_id=state.get("run_id"))

    return {
        "error": error_msg,
        "status": "blocked",
        "ceo_approved": False,
        "final_summary": f"Analysis blocked by security check: {error_msg}",
    }


# ── Build graph ────────────────────────────────────────────────────────────────

def _build_graph() -> StateGraph:
    wf = StateGraph(OpsIntelState)

    wf.add_node("ceo_initial",        _with_step("ceo_initial",        ceo_initial_node))
    wf.add_node("security_pre",       _with_step("security_pre",       security_pre_node))
    wf.add_node("servicenow_pulling", _with_step("servicenow_pulling", servicenow_pulling_node))
    wf.add_node("security_data",      _with_step("security_data",      security_data_node))
    wf.add_node("analytical",         _with_step("analytical",         analytical_node))
    wf.add_node("security_output",    _with_step("security_output",    security_output_node))
    wf.add_node("graphical",          _with_step("graphical",          graphical_node))
    wf.add_node("ceo_final",          _with_step("ceo_final",          ceo_final_node))
    wf.add_node("error_handler",      _with_step("error_handler",      error_handler_node))

    wf.add_edge(START, "ceo_initial")
    wf.add_edge("ceo_initial", "security_pre")

    wf.add_conditional_edges(
        "security_pre",
        route_after_security_pre,
        {"servicenow_pulling": "servicenow_pulling", "error_handler": "error_handler"},
    )

    wf.add_edge("servicenow_pulling", "security_data")

    wf.add_conditional_edges(
        "security_data",
        route_after_security_data,
        {"analytical": "analytical", "error_handler": "error_handler"},
    )

    wf.add_edge("analytical", "security_output")

    wf.add_conditional_edges(
        "security_output",
        route_after_security_output,
        {"graphical": "graphical", "analytical": "analytical", "error_handler": "error_handler"},
    )

    wf.add_edge("graphical", "ceo_final")

    wf.add_conditional_edges(
        "ceo_final",
        route_after_ceo_final,
        {"analytical": "analytical", END: END},
    )

    wf.add_edge("error_handler", END)

    return wf


# Compiled once at import time; reused for every run.
graph = _build_graph().compile()


# ── Public entry point ─────────────────────────────────────────────────────────

async def _load_rules(session) -> tuple[list, list]:
    """Return (approval_rules, compliance_rules) from the DB, or empty lists."""
    if session is None:
        return [], []
    try:
        from app.db.repositories import RuleRepo
        repo = RuleRepo(session)
        approval = [
            {"name": r.name, "rule_text": r.rule_text, "compiled_json": r.compiled_json}
            for r in await repo.list_all("approval") if r.enabled
        ]
        compliance = [
            {"name": r.name, "rule_text": r.rule_text, "compiled_json": r.compiled_json}
            for r in await repo.list_all("compliance") if r.enabled
        ]
        return approval, compliance
    except Exception:
        return [], []


async def run_graph(
    objective: str,
    filters: dict,
    *,
    session=None,
    run_id: str | None = None,
) -> OpsIntelState:
    """Invoke the compiled graph and return the final state."""
    if run_id is None:
        run_id = str(uuid.uuid4())

    approval_rules, compliance_rules = await _load_rules(session)

    initial: OpsIntelState = {
        "run_id": run_id,
        "objective": objective,
        "filters": filters,
        "ceo_initial_plan": "",
        "raw_tickets": [],
        "sanitized_tickets": [],
        "security_pre_passed": True,
        "security_pre_reason": "",
        "security_data_passed": True,
        "security_data_reason": "",
        "security_output_passed": True,
        "security_output_reason": "",
        "analysis_result": {},
        "chart_specs": [],
        "security_flags": [],
        "final_summary": "",
        "ceo_approved": False,
        "retry_count": 0,
        "error": "",
        "status": "running",
        "approval_rules": approval_rules,
        "compliance_rules": compliance_rules,
    }

    cfg = RunnableConfig(configurable={"session": session, "run_id": run_id})

    logger.info("graph_start", run_id=run_id, objective=objective[:100])
    final_state: OpsIntelState = await graph.ainvoke(initial, config=cfg)
    logger.info("graph_done", run_id=run_id, status=final_state.get("status"))
    return final_state
