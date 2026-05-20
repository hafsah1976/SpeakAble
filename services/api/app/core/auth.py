from dataclasses import dataclass
from functools import lru_cache
from typing import Any

import jwt
from fastapi import Depends, Header, HTTPException, status
from jwt import InvalidTokenError, PyJWKClient

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

    if settings.auth_provider != "cognito":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "AUTH_NOT_CONFIGURED", "message": "Auth provider is not configured."}},
        )

    token = authorization.removeprefix("Bearer ").strip()
    return _verify_cognito_user(token, settings)


def require_moderator(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.role not in {"moderator", "admin"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "FORBIDDEN", "message": "Moderator access required."}},
        )

    return user


def _verify_cognito_user(token: str, settings: Settings) -> CurrentUser:
    issuer = settings.cognito_issuer
    client_id = settings.aws_cognito_user_pool_client_id
    if not issuer or not client_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "AUTH_NOT_CONFIGURED", "message": "AWS Cognito auth is not configured."}},
        )

    try:
        signing_key = _jwks_client(issuer).get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=issuer,
            options={"verify_aud": False, "require": ["exp", "iat", "sub"]},
        )
    except InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "UNAUTHORIZED", "message": "Invalid bearer token."}},
        ) from exc

    _validate_cognito_client(payload, client_id)
    groups = payload.get("cognito:groups") or []
    role = _role_from_groups(groups)

    return CurrentUser(
        id=str(payload["sub"]),
        email=payload.get("email") or payload.get("username"),
        role=role,
    )


def _validate_cognito_client(payload: dict[str, Any], expected_client_id: str) -> None:
    token_client_id = payload.get("client_id") or payload.get("aud")
    if token_client_id != expected_client_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "UNAUTHORIZED", "message": "Token audience does not match this API."}},
        )

    token_use = payload.get("token_use")
    if token_use not in {"access", "id"}:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "UNAUTHORIZED", "message": "Unsupported Cognito token type."}},
        )


def _role_from_groups(groups: list[str]) -> str:
    normalized = {group.lower() for group in groups}
    if "admin" in normalized:
        return "admin"
    if "moderator" in normalized:
        return "moderator"
    return "member"


@lru_cache
def _jwks_client(issuer: str) -> PyJWKClient:
    return PyJWKClient(f"{issuer}/.well-known/jwks.json")
