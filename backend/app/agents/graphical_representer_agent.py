import json

from langchain_core.runnables import RunnableConfig

from app.agents.demo_data import DEMO_CHART_SPECS
from app.agents.prompts import GRAPHICAL
from app.agents.state import OpsIntelState
from app.agents.tools import extract_json
from app.llm.client import llm_factory
from app.telemetry.logging import get_logger

logger = get_logger("agents.graphical")


async def graphical_node(state: OpsIntelState, config: RunnableConfig) -> dict:
    session = config.get("configurable", {}).get("session")
    run_id = config.get("configurable", {}).get("run_id", state["run_id"])

    analysis = state.get("analysis_result", {})
    user_msg = (
        f"Analysis result to visualize:\n{json.dumps(analysis, indent=2)}\n\n"
        f"Objective context: {state['objective']}"
    )

    chart_specs: list = []
    if session:
        try:
            resp = await llm_factory.complete(
                "graphical_representer",
                messages=[
                    {"role": "system", "content": GRAPHICAL},
                    {"role": "user", "content": user_msg},
                ],
                session=session,
                run_id=run_id,
            )
            text = resp.choices[0].message.content or ""
            parsed = extract_json(text)
            chart_specs = parsed if isinstance(parsed, list) else []
            logger.info("graphical_llm", run_id=run_id, chart_count=len(chart_specs))
        except Exception as exc:
            logger.warning("graphical_fallback", error=str(exc)[:150])

    if not chart_specs:
        chart_specs = _build_demo_charts(analysis)

    return {"chart_specs": chart_specs, "status": "graphical_done"}


def _build_demo_charts(analysis: dict) -> list[dict]:
    # Use the full DEMO_CHART_SPECS which include 3-month trend data.
    # Patch the priority/status bars to reflect actual analysis metrics when available.
    metrics = analysis.get("metrics", {})
    charts = list(DEMO_CHART_SPECS)
    if metrics:
        for chart in charts:
            if chart["id"] == "priority_dist":
                chart = dict(chart)
                chart["data"] = [
                    {"priority": "P1 Critical", "count": metrics.get("p1_count", 0)},
                    {"priority": "P2 High",     "count": metrics.get("p2_count", 0)},
                    {"priority": "P3 Medium",   "count": metrics.get("p3_count", 0)},
                ]
    return charts
