from langchain_core.runnables import RunnableConfig

from app.agents.demo_data import DEMO_TICKETS
from app.agents.state import OpsIntelState
from app.agents.tools import fetch_servicenow_tickets
from app.telemetry.logging import get_logger

logger = get_logger("agents.servicenow_pulling")


async def servicenow_pulling_node(state: OpsIntelState, config: RunnableConfig) -> dict:
    run_id = config.get("configurable", {}).get("run_id", state["run_id"])
    filters = state.get("filters", {})

    tickets = await fetch_servicenow_tickets(filters)

    if not tickets:
        # No real ServiceNow configured — apply filter subset to demo data
        tickets = _filter_demo(DEMO_TICKETS, filters)
        logger.info("servicenow_demo_mode", ticket_count=len(tickets), run_id=run_id)
    else:
        logger.info("servicenow_live_mode", ticket_count=len(tickets), run_id=run_id)

    return {
        "raw_tickets": tickets,
        "status": "servicenow_pulling_done",
    }


def _filter_demo(tickets: list[dict], filters: dict) -> list[dict]:
    result = tickets

    if priorities := filters.get("priority"):
        if not isinstance(priorities, list):
            priorities = [str(priorities)]
        priorities = [str(p) for p in priorities]
        result = [t for t in result if str(t.get("priority", "")) in priorities]

    if state_filter := filters.get("state"):
        result = [t for t in result if t.get("state", "").lower() == state_filter.lower()]

    limit = filters.get("limit", 50)
    return result[:limit]
