from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException, status
from supabase import create_client

from app.core.config import Settings, get_settings


@dataclass(frozen=True)
class CurrentUser:
    id: str
    email: str | None
    role: str = "member"


async def get_current_user(
    authorization: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> CurrentUser:
    if not settings.require_auth:
        return CurrentUser(id="local-user", email="local@example.test", role="admin")

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "UNAUTHORIZED", "message": "Missing bearer token."}},
        )

    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "AUTH_NOT_CONFIGURED", "message": "Auth is not configured."}},
        )

    token = authorization.removeprefix("Bearer ").strip()
    client = create_client(settings.supabase_url, settings.supabase_service_role_key)

    try:
        response = client.auth.get_user(token)
    except Exception as exc:  # pragma: no cover - depends on Supabase network responses
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "UNAUTHORIZED", "message": "Invalid bearer token."}},
        ) from exc

    user = response.user
    app_metadata = user.app_metadata or {}

    return CurrentUser(
        id=user.id,
        email=user.email,
        role=str(app_metadata.get("role", "member")),
    )


def require_moderator(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.role not in {"moderator", "admin"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "FORBIDDEN", "message": "Moderator access required."}},
        )

    return user
