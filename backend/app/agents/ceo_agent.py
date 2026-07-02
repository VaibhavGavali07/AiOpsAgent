import json

from langchain_core.runnables import RunnableConfig

from app.agents.demo_data import DEMO_ANALYSIS, DEMO_CHART_SPECS
from app.agents.prompts import CEO_FINAL, CEO_INITIAL
from app.agents.state import OpsIntelState
from app.agents.tools import extract_json
from app.llm.client import llm_factory
from app.telemetry.logging import get_logger

logger = get_logger("agents.ceo")

MAX_RETRIES = 2


async def ceo_initial_node(state: OpsIntelState, config: RunnableConfig) -> dict:
    session = config.get("configurable", {}).get("session")
    run_id = config.get("configurable", {}).get("run_id", state["run_id"])

    user_msg = (
        f"Objective: {state['objective']}\n"
        f"Filters: {json.dumps(state['filters'], indent=2)}"
    )

    plan_text = ""
    if session:
        try:
            resp = await llm_factory.complete(
                "ceo_supervisor",
                messages=[
                    {"role": "system", "content": CEO_INITIAL},
                    {"role": "user", "content": user_msg},
                ],
                session=session,
                run_id=run_id,
            )
            plan_text = resp.choices[0].message.content or ""
            logger.info("ceo_initial_llm", run_id=run_id, chars=len(plan_text))
        except Exception as exc:
            logger.warning("ceo_initial_fallback", error=str(exc)[:150])

    if not plan_text:
        plan_text = json.dumps({
            "task_summary": f"Analyze IT operations data: {state['objective']}",
            "data_scope": "ServiceNow incidents from the last 30 days",
            "expected_outputs": ["priority distribution", "SLA metrics", "top recurring issues", "recommendations"],
            "success_criteria": "Actionable insights with supporting charts for IT leadership review",
        })

    return {"ceo_initial_plan": plan_text, "status": "ceo_initial_done"}


async def ceo_final_node(state: OpsIntelState, config: RunnableConfig) -> dict:
    session = config.get("configurable", {}).get("session")
    run_id = config.get("configurable", {}).get("run_id", state["run_id"])

    user_msg = (
        f"Initial plan: {state.get('ceo_initial_plan', '')}\n\n"
        f"Analysis result: {json.dumps(state.get('analysis_result', {}), indent=2)}\n\n"
        f"Chart specs count: {len(state.get('chart_specs', []))}\n\n"
        f"Security flags: {json.dumps(state.get('security_flags', []))}\n\n"
        f"Retry count so far: {state.get('retry_count', 0)}"
    )

    result_text = ""
    if session:
        try:
            resp = await llm_factory.complete(
                "ceo_supervisor",
                messages=[
                    {"role": "system", "content": CEO_FINAL},
                    {"role": "user", "content": user_msg},
                ],
                session=session,
                run_id=run_id,
            )
            result_text = resp.choices[0].message.content or ""
        except Exception as exc:
            logger.warning("ceo_final_fallback", error=str(exc)[:150])

    approved = True
    final_summary = ""
    rework = ""

    if result_text:
        try:
            parsed = extract_json(result_text)
            approved = bool(parsed.get("approved", True))
            final_summary = parsed.get("final_summary", "")
            rework = parsed.get("rework_instructions", "")
        except (ValueError, KeyError):
            pass

    if not final_summary:
        analysis = state.get("analysis_result") or DEMO_ANALYSIS
        final_summary = analysis.get("summary", "Analysis complete.")
        approved = True

    updates: dict = {
        "final_summary": final_summary,
        "ceo_approved": approved,
        "status": "completed" if approved else "needs_rework",
    }

    if not approved and state.get("retry_count", 0) < MAX_RETRIES:
        updates["retry_count"] = state.get("retry_count", 0) + 1
        updates["objective"] = state["objective"] + (f"\nRework: {rework}" if rework else "")

    return updates
