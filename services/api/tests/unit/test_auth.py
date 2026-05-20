import pytest
from fastapi import HTTPException

from app.core.auth import get_current_user
from app.core.config import Settings


@pytest.mark.anyio
async def test_local_auth_returns_development_user() -> None:
    user = await get_current_user(settings=Settings(require_auth=False))

    assert user.id == "local-user"
    assert user.role == "admin"


@pytest.mark.anyio
async def test_cognito_auth_requires_bearer_token() -> None:
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(authorization=None, settings=Settings(require_auth=True))

    assert exc_info.value.status_code == 401


@pytest.mark.anyio
async def test_unknown_auth_provider_fails_closed() -> None:
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(
            authorization="Bearer token",
            settings=Settings(require_auth=True, auth_provider="unknown"),
        )

    assert exc_info.value.status_code == 500
