import copy
import json
import re

from langchain_core.runnables import RunnableConfig

from app.agents.demo_data import DEMO_TICKETS
from app.agents.prompts import SECURITY_DATA, SECURITY_OUTPUT, SECURITY_PRE
from app.agents.state import OpsIntelState
from app.agents.tools import extract_json
from app.llm.client import llm_factory
from app.telemetry.logging import get_logger

logger = get_logger("agents.security")

_PII_EMAIL = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", re.IGNORECASE)
_PII_PHONE = re.compile(r"\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b")
_PII_IP_PUBLIC = re.compile(
    r"\b(?!10\.|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.)"
    r"(?:\d{1,3}\.){3}\d{1,3}\b"
)

_INJECTION_PATTERNS = [
    r"ignore (?:all |previous |prior |these )*instructions",
    r"forget (?:all |previous |prior |your )*(?:instructions|everything|what you)",
    r"you are now",
    r"act as (a|an) (?!analyst|agent)",
    r"jailbreak",
    r"prompt injection",
    r"disregard (?:your|the) (?:system|previous)",
]
_INJECTION_RE = re.compile("|".join(_INJECTION_PATTERNS), re.IGNORECASE)


def _redact_text(text: str) -> tuple[str, list[str]]:
    flags: list[str] = []
    if _PII_EMAIL.search(text):
        flags.append("email_address")
        text = _PII_EMAIL.sub("[REDACTED_EMAIL]", text)
    if _PII_PHONE.search(text):
        flags.append("phone_number")
        text = _PII_PHONE.sub("[REDACTED_PHONE]", text)
    if _PII_IP_PUBLIC.search(text):
        flags.append("public_ip_address")
        text = _PII_IP_PUBLIC.sub("[REDACTED_IP]", text)
    return text, flags


def _redact_ticket(ticket: dict) -> tuple[dict, list[str]]:
    t = copy.deepcopy(ticket)
    all_flags: list[str] = []
    for field in ("description", "short_description"):
        if t.get(field):
            t[field], flags = _redact_text(t[field])
            if flags:
                all_flags.extend(f"{f} in {ticket.get('number', ticket.get('sys_id', '?'))}.{field}" for f in flags)
    return t, all_flags


async def security_pre_node(state: OpsIntelState, config: RunnableConfig) -> dict:
    """Validate the analysis objective for prompt injection and PII."""
    session = config.get("configurable", {}).get("session")
    run_id = config.get("configurable", {}).get("run_id", state["run_id"])

    flags: list[str] = []

    # Fast local checks first
    combined_text = state["objective"] + " " + json.dumps(state.get("filters", {}))
    if _INJECTION_RE.search(combined_text):
        flags.append("potential_prompt_injection_detected")
    if _PII_EMAIL.search(combined_text):
        flags.append("pii_email_in_objective")
    if _PII_PHONE.search(combined_text):
        flags.append("pii_phone_in_objective")

    # LLM deep-check (optional; skip if no assignment)
    if session and not flags:
        try:
            resp = await llm_factory.complete(
                "security",
                messages=[
                    {"role": "system", "content": SECURITY_PRE},
                    {"role": "user", "content": f"Objective: {state['objective']}\nFilters: {json.dumps(state.get('filters', {}))}"},
                ],
                session=session,
                run_id=run_id,
            )
            text = resp.choices[0].message.content or ""
            parsed = extract_json(text)
            if not parsed.get("passed", True):
                flags.extend(parsed.get("flags", ["llm_security_check_failed"]))
        except Exception as exc:
            logger.warning("security_pre_llm_skip", error=str(exc)[:120])

    passed = len(flags) == 0
    logger.info("security_pre", passed=passed, flags=flags, run_id=run_id)

    return {
        "security_pre_passed": passed,
        "security_pre_reason": "; ".join(flags) if flags else "ok",
        "security_flags": flags,
        "status": "security_pre_done",
    }


async def security_data_node(state: OpsIntelState, config: RunnableConfig) -> dict:
    """Redact PII from raw tickets before analysis."""
    run_id = config.get("configurable", {}).get("run_id", state["run_id"])

    raw = state.get("raw_tickets") or []
    sanitized: list[dict] = []
    all_flags: list[str] = []

    for ticket in raw:
        clean_ticket, flags = _redact_ticket(ticket)
        sanitized.append(clean_ticket)
        all_flags.extend(flags)

    logger.info("security_data", tickets=len(raw), redactions=len(all_flags), run_id=run_id)

    return {
        "sanitized_tickets": sanitized,
        "security_data_passed": True,
        "security_data_reason": f"{len(all_flags)} redactions applied" if all_flags else "no PII found",
        "security_flags": all_flags,
        "status": "security_data_done",
    }


async def security_output_node(state: OpsIntelState, config: RunnableConfig) -> dict:
    """Validate that analysis output doesn't contain PII."""
    session = config.get("configurable", {}).get("session")
    run_id = config.get("configurable", {}).get("run_id", state["run_id"])

    analysis_text = json.dumps(state.get("analysis_result", {}))
    flags: list[str] = []

    # Quick local scan
    _, text_flags = _redact_text(analysis_text)
    flags.extend(f"pii_in_output:{f}" for f in text_flags)

    # LLM validation
    if session and len(analysis_text) < 8000:
        try:
            resp = await llm_factory.complete(
                "security",
                messages=[
                    {"role": "system", "content": SECURITY_OUTPUT},
                    {"role": "user", "content": f"Analysis result to validate:\n{analysis_text[:4000]}"},
                ],
                session=session,
                run_id=run_id,
            )
            text = resp.choices[0].message.content or ""
            parsed = extract_json(text)
            if not parsed.get("passed", True):
                flags.extend(parsed.get("flags", ["llm_output_check_failed"]))
        except Exception as exc:
            logger.warning("security_output_llm_skip", error=str(exc)[:120])

    passed = len(flags) == 0
    logger.info("security_output", passed=passed, flags=flags, run_id=run_id)

    return {
        "security_output_passed": passed,
        "security_output_reason": "; ".join(flags) if flags else "ok",
        "security_flags": flags,
        "status": "security_output_done",
    }
