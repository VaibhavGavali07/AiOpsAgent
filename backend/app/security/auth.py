from enum import Enum
from typing import Annotated

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import APIKeyHeader, HTTPAuthorizationCredentials, HTTPBearer

from app.settings import settings

_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
_bearer = HTTPBearer(auto_error=False)


class Role(str, Enum):
    admin = "admin"
    analyst = "analyst"
    readonly = "readonly"


async def require_auth(
    api_key: Annotated[str | None, Security(_api_key_header)] = None,
    bearer: Annotated[HTTPAuthorizationCredentials | None, Security(_bearer)] = None,
) -> str:
    token = api_key or (bearer.credentials if bearer else None)
    if not token or token != settings.app_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key. Pass X-API-Key header or Authorization: Bearer <key>",
        )
    return token
