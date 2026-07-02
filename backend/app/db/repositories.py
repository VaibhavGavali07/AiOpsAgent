from typing import Optional

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AgentMessage, AgentModelAssignment, AnalysisRun, AuditLog, LLMUsage, ProviderCredential, Rule


class CredentialRepo:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def upsert(self, provider: str, encrypted_key: str, base_url: Optional[str]) -> ProviderCredential:
        result = await self._session.execute(
            select(ProviderCredential).where(ProviderCredential.provider == provider)
        )
        cred = result.scalar_one_or_none()
        if cred:
            cred.encrypted_key = encrypted_key
            cred.base_url = base_url
        else:
            cred = ProviderCredential(provider=provider, encrypted_key=encrypted_key, base_url=base_url)
            self._session.add(cred)
        await self._session.commit()
        await self._session.refresh(cred)
        return cred

    async def get(self, provider: str) -> Optional[ProviderCredential]:
        result = await self._session.execute(
            select(ProviderCredential).where(ProviderCredential.provider == provider)
        )
        return result.scalar_one_or_none()

    async def list_all(self) -> list[ProviderCredential]:
        result = await self._session.execute(select(ProviderCredential))
        return list(result.scalars().all())

    async def delete(self, provider: str) -> bool:
        result = await self._session.execute(
            delete(ProviderCredential).where(ProviderCredential.provider == provider)
        )
        await self._session.commit()
        return result.rowcount > 0


class AgentModelRepo:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def upsert(
        self, agent_name: str, provider: str, model_id: str, base_url: Optional[str] = None
    ) -> AgentModelAssignment:
        result = await self._session.execute(
            select(AgentModelAssignment).where(AgentModelAssignment.agent_name == agent_name)
        )
        assignment = result.scalar_one_or_none()
        if assignment:
            assignment.provider = provider
            assignment.model_id = model_id
            assignment.base_url = base_url
        else:
            assignment = AgentModelAssignment(
                agent_name=agent_name, provider=provider, model_id=model_id, base_url=base_url
            )
            self._session.add(assignment)
        await self._session.commit()
        await self._session.refresh(assignment)
        return assignment

    async def get(self, agent_name: str) -> Optional[AgentModelAssignment]:
        result = await self._session.execute(
            select(AgentModelAssignment).where(AgentModelAssignment.agent_name == agent_name)
        )
        return result.scalar_one_or_none()

    async def list_all(self) -> list[AgentModelAssignment]:
        result = await self._session.execute(select(AgentModelAssignment))
        return list(result.scalars().all())


class UsageRepo:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def record(
        self,
        agent_name: str,
        provider: str,
        model_id: str,
        prompt_tokens: int,
        completion_tokens: int,
        run_id: Optional[str] = None,
    ) -> LLMUsage:
        usage = LLMUsage(
            agent_name=agent_name,
            provider=provider,
            model_id=model_id,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            run_id=run_id,
        )
        self._session.add(usage)
        await self._session.commit()
        return usage


class AuditRepo:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def log(self, actor: str, action: str, detail: Optional[str] = None) -> AuditLog:
        entry = AuditLog(actor=actor, action=action, detail=detail)
        self._session.add(entry)
        await self._session.commit()
        return entry


class RunRepo:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, run_id: str, objective: str, filters: str) -> AnalysisRun:
        run = AnalysisRun(run_id=run_id, objective=objective, filters=filters)
        self._session.add(run)
        await self._session.commit()
        await self._session.refresh(run)
        return run

    async def get(self, run_id: str) -> Optional[AnalysisRun]:
        result = await self._session.execute(
            select(AnalysisRun).where(AnalysisRun.run_id == run_id)
        )
        return result.scalar_one_or_none()

    async def list_all(self, limit: int = 50) -> list[AnalysisRun]:
        result = await self._session.execute(
            select(AnalysisRun).order_by(AnalysisRun.started_at.desc()).limit(limit)
        )
        return list(result.scalars().all())

    async def set_step(self, run_id: str, step: str) -> None:
        run = await self.get(run_id)
        if run:
            run.current_step = step
            await self._session.commit()

    async def update_status(
        self,
        run_id: str,
        status: str,
        final_summary: Optional[str] = None,
        result_json: Optional[str] = None,
        error: Optional[str] = None,
    ) -> None:
        from datetime import datetime, timezone
        run = await self.get(run_id)
        if not run:
            return
        run.status = status
        if final_summary is not None:
            run.final_summary = final_summary
        if result_json is not None:
            run.result_json = result_json
        if error is not None:
            run.error = error
        if status in ("completed", "failed", "blocked"):
            run.completed_at = datetime.now(timezone.utc)
        await self._session.commit()


class RuleRepo:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, name: str, rule_type: str, rule_text: str, compiled_json: Optional[str] = None) -> Rule:
        rule = Rule(name=name, rule_type=rule_type, rule_text=rule_text, compiled_json=compiled_json)
        self._session.add(rule)
        await self._session.commit()
        await self._session.refresh(rule)
        return rule

    async def get(self, rule_id: int) -> Optional[Rule]:
        result = await self._session.execute(select(Rule).where(Rule.id == rule_id))
        return result.scalar_one_or_none()

    async def list_all(self, rule_type: Optional[str] = None) -> list[Rule]:
        q = select(Rule).order_by(Rule.created_at)
        if rule_type:
            q = q.where(Rule.rule_type == rule_type)
        result = await self._session.execute(q)
        return list(result.scalars().all())

    async def update(self, rule_id: int, **kwargs) -> Optional[Rule]:
        rule = await self.get(rule_id)
        if not rule:
            return None
        for k, v in kwargs.items():
            setattr(rule, k, v)
        await self._session.commit()
        await self._session.refresh(rule)
        return rule

    async def delete(self, rule_id: int) -> bool:
        result = await self._session.execute(delete(Rule).where(Rule.id == rule_id))
        await self._session.commit()
        return result.rowcount > 0


class MessageRepo:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, run_id: str, agent_name: str, role: str, content: str) -> AgentMessage:
        msg = AgentMessage(run_id=run_id, agent_name=agent_name, role=role, content=content)
        self._session.add(msg)
        await self._session.commit()
        return msg

    async def list_for_run(self, run_id: str) -> list[AgentMessage]:
        result = await self._session.execute(
            select(AgentMessage)
            .where(AgentMessage.run_id == run_id)
            .order_by(AgentMessage.created_at)
        )
        return list(result.scalars().all())
