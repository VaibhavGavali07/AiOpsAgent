"""Utility functions used by agent nodes: JSON extraction, ServiceNow HTTP fetch."""

import json
import re
from typing import Optional

import httpx

from app.settings import settings
from app.telemetry.logging import get_logger

logger = get_logger("agents.tools")


def extract_json(text: str) -> dict | list:
    """Extract the first JSON object or array from LLM output text."""
    # Try ```json ... ``` block first
    md_match = re.search(r"```(?:json)?\s*([\[\{].*?)\s*```", text, re.DOTALL)
    if md_match:
        return json.loads(md_match.group(1))

    # Try to find raw JSON starting with { or [
    for start_char, end_char in [("{", "}"), ("[", "]")]:
        start = text.find(start_char)
        if start == -1:
            continue
        # Walk backwards from end to find matching close
        end = text.rfind(end_char)
        if end != -1 and end > start:
            candidate = text[start : end + 1]
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                continue

    raise ValueError(f"No valid JSON found in LLM response: {text[:200]}")


async def fetch_servicenow_tickets(filters: dict) -> list[dict]:
    """
    Fetch incidents/tasks from ServiceNow REST API.
    Returns [] and logs a warning if ServiceNow is not configured.
    """
    base_url = getattr(settings, "servicenow_instance_url", "")
    username = getattr(settings, "servicenow_username", "")
    password = getattr(settings, "servicenow_password", "")

    if not base_url:
        logger.info("servicenow_not_configured", note="returning empty list; demo data will be used")
        return []

    sysparm_query_parts = []
    if filters.get("priority"):
        priorities = filters["priority"] if isinstance(filters["priority"], list) else [filters["priority"]]
        sysparm_query_parts.append("^".join(f"priority={p}" for p in priorities))
    if filters.get("state"):
        sysparm_query_parts.append(f"state={filters['state']}")
    if filters.get("days_back"):
        sysparm_query_parts.append(f"opened_atONLast {filters['days_back']} days@javascript:gs.beginningOfLast30Days()@javascript:gs.endOfLast30Days()")

    sysparm_query = "^OR".join(sysparm_query_parts) if sysparm_query_parts else ""

    params = {
        "sysparm_limit": filters.get("limit", 50),
        "sysparm_fields": "sys_id,number,short_description,description,priority,state,category,subcategory,assignment_group,assigned_to,opened_at,resolved_at,close_code,cmdb_ci,business_service,sla_due",
    }
    if sysparm_query:
        params["sysparm_query"] = sysparm_query

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{base_url.rstrip('/')}/api/now/table/incident",
                params=params,
                auth=(username, password),
                headers={"Accept": "application/json"},
            )
            resp.raise_for_status()
            data = resp.json()
            tickets = data.get("result", [])
            logger.info("servicenow_fetch_ok", count=len(tickets))
            return tickets
    except Exception as exc:
        logger.warning("servicenow_fetch_failed", error=str(exc)[:200])
        return []
