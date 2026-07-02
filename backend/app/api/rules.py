"""Rules API — user-defined approval and compliance rules, LLM-compiled."""

import json
from typing import Any, Literal, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.api.deps import AuthToken, DBSession
from app.db.repositories import RuleRepo
from app.telemetry.logging import get_logger

router = APIRouter(prefix="/rules", tags=["rules"])
logger = get_logger("api.rules")

RULE_COMPILE_PROMPT = """Convert the following natural-language rule into a compact JSON object that an AI agent can use to evaluate tickets.

Rule type: {rule_type}
Rule text: {rule_text}

Return ONLY valid JSON with keys:
- "condition": short string describing what makes a ticket match
- "criteria": list of specific conditions to check (list of strings)
- "field_hints": dict mapping relevant ticket fields to what values trigger this rule

Example output for "Tickets touching production databases require DBA approval":
{{"condition": "production database change", "criteria": ["category contains Database", "short_description mentions production or prod"], "field_hints": {{"category": "Database", "short_description": ["production", "prod"]}}}}"""

RULE_TYPES = {"approval", "compliance"}


class RuleCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    rule_type: Literal["approval", "compliance"]
    rule_text: str = Field(..., min_length=5, max_length=2000)


class RulePatch(BaseModel):
    enabled: Optional[bool] = None
    rule_text: Optional[str] = Field(None, min_length=5, max_length=2000)
    name: Optional[str] = Field(None, min_length=1, max_length=200)


class RuleOut(BaseModel):
    id: int
    name: str
    rule_type: str
    rule_text: str
    compiled_json: Optional[str]
    enabled: bool
    created_at: str
    updated_at: str


def _rule_out(r: Any) -> RuleOut:
    return RuleOut(
        id=r.id,
        name=r.name,
        rule_type=r.rule_type,
        rule_text=r.rule_text,
        compiled_json=r.compiled_json,
        enabled=r.enabled,
        created_at=r.created_at.isoformat(),
        updated_at=r.updated_at.isoformat(),
    )


def _check_injection(text: str) -> None:
    from app.agents.security_agent import _INJECTION_RE
    if _INJECTION_RE.search(text):
        raise HTTPException(status_code=400, detail="Rule text contains potentially unsafe content.")


async def _try_compile(rule_type: str, rule_text: str) -> Optional[str]:
    try:
        from app.llm.client import llm_factory
        prompt = RULE_COMPILE_PROMPT.format(rule_type=rule_type, rule_text=rule_text)
        text = await llm_factory.complete("analytical", [{"role": "user", "content": prompt}], max_tokens=300)
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            parsed = json.loads(text[start:end])
            return json.dumps(parsed)
    except Exception as exc:
        logger.info("rule_compile_skipped", reason=str(exc)[:120])
    return None


@router.get("", response_model=list[RuleOut])
async def list_rules(session: DBSession, _: AuthToken, rule_type: Optional[str] = None) -> list[RuleOut]:
    repo = RuleRepo(session)
    rules = await repo.list_all(rule_type=rule_type)
    return [_rule_out(r) for r in rules]


@router.post("", response_model=RuleOut, status_code=status.HTTP_201_CREATED)
async def create_rule(body: RuleCreate, session: DBSession, _: AuthToken) -> RuleOut:
    _check_injection(body.rule_text)
    compiled = await _try_compile(body.rule_type, body.rule_text)
    repo = RuleRepo(session)
    rule = await repo.add(
        name=body.name,
        rule_type=body.rule_type,
        rule_text=body.rule_text,
        compiled_json=compiled,
    )
    logger.info("rule_created", id=rule.id, rule_type=rule.rule_type)
    return _rule_out(rule)


@router.patch("/{rule_id}", response_model=RuleOut)
async def update_rule(rule_id: int, body: RulePatch, session: DBSession, _: AuthToken) -> RuleOut:
    repo = RuleRepo(session)
    existing = await repo.get(rule_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Rule not found")

    kwargs: dict = {}
    if body.enabled is not None:
        kwargs["enabled"] = body.enabled
    if body.name is not None:
        kwargs["name"] = body.name
    if body.rule_text is not None:
        _check_injection(body.rule_text)
        kwargs["rule_text"] = body.rule_text
        kwargs["compiled_json"] = await _try_compile(existing.rule_type, body.rule_text)

    rule = await repo.update(rule_id, **kwargs)
    return _rule_out(rule)


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rule(rule_id: int, session: DBSession, _: AuthToken) -> None:
    repo = RuleRepo(session)
    deleted = await repo.delete(rule_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Rule not found")
