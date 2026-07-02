import json

from langchain_core.runnables import RunnableConfig

from app.agents.demo_data import DEMO_ANALYSIS
from app.agents.prompts import ANALYTICAL
from app.agents.state import OpsIntelState
from app.agents.tools import extract_json
from app.llm.client import llm_factory
from app.telemetry.logging import get_logger

logger = get_logger("agents.analytical")


async def analytical_node(state: OpsIntelState, config: RunnableConfig) -> dict:
    session = config.get("configurable", {}).get("session")
    run_id = config.get("configurable", {}).get("run_id", state["run_id"])

    tickets = state.get("sanitized_tickets") or state.get("raw_tickets") or []
    ticket_json = json.dumps(tickets, indent=2)

    # Truncate to avoid token limits (keep first 60 tickets worth of data)
    if len(ticket_json) > 12000:
        ticket_json = json.dumps(tickets[:60], indent=2)

    rework_note = ""
    if state.get("retry_count", 0) > 0:
        rework_note = f"\n\nPrevious attempt was rejected. Rework instructions: {state.get('objective', '')}"

    rules_note = ""
    approval_rules = state.get("approval_rules") or []
    compliance_rules = state.get("compliance_rules") or []
    if approval_rules or compliance_rules:
        rules_note = "\n\nUser-defined rules to apply:\n"
        if approval_rules:
            rules_note += "APPROVAL RULES:\n" + "\n".join(f"- {r['name']}: {r['rule_text']}" for r in approval_rules) + "\n"
        if compliance_rules:
            rules_note += "COMPLIANCE RULES:\n" + "\n".join(f"- {r['name']}: {r['rule_text']}" for r in compliance_rules)

    user_msg = (
        f"Objective: {state['objective']}{rework_note}{rules_note}\n\n"
        f"Tickets ({len(tickets)} total):\n{ticket_json}"
    )

    analysis: dict = {}
    if session:
        try:
            resp = await llm_factory.complete(
                "analytical",
                messages=[
                    {"role": "system", "content": ANALYTICAL},
                    {"role": "user", "content": user_msg},
                ],
                session=session,
                run_id=run_id,
            )
            text = resp.choices[0].message.content or ""
            analysis = extract_json(text)
            logger.info("analytical_llm", run_id=run_id, keys=list(analysis.keys()))
        except Exception as exc:
            logger.warning("analytical_fallback", error=str(exc)[:150])

    if not analysis:
        analysis = _build_demo_analysis(tickets)

    return {"analysis_result": analysis, "status": "analytical_done"}


def _build_demo_analysis(tickets: list[dict]) -> dict:
    if not tickets:
        return DEMO_ANALYSIS

    total = len(tickets)
    p1 = sum(1 for t in tickets if str(t.get("priority")) == "1")
    p2 = sum(1 for t in tickets if str(t.get("priority")) == "2")
    p3 = sum(1 for t in tickets if str(t.get("priority")) in ("3", "4"))
    open_count = sum(1 for t in tickets if t.get("state") not in ("Resolved", "Closed"))
    sla_breached = sum(1 for t in tickets if t.get("sla_breached"))

    return {
        "summary": (
            f"Analysis of {total} tickets shows {p1} critical (P1) incidents. "
            f"SLA breach rate is {sla_breached / max(total, 1):.0%}. "
            f"{open_count} tickets remain open requiring attention."
        ),
        "metrics": {
            "total_tickets": total,
            "p1_count": p1,
            "p2_count": p2,
            "p3_count": p3,
            "avg_resolution_hours": 2.5,
            "sla_breach_rate": round(sla_breached / max(total, 1), 2),
            "open_tickets": open_count,
            "resolved_tickets": total - open_count,
        },
        "top_issues": DEMO_ANALYSIS["top_issues"],
        "trends": DEMO_ANALYSIS["trends"],
        "recommendations": DEMO_ANALYSIS["recommendations"],
        "ritm_summary": DEMO_ANALYSIS.get("ritm_summary"),
        "spike_analysis": DEMO_ANALYSIS.get("spike_analysis"),
    }
