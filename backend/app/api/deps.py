from typing import Annotated, AsyncGenerator

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.security.auth import require_auth

DBSession = Annotated[AsyncSession, Depends(get_session)]
AuthToken = Annotated[str, Depends(require_auth)]
