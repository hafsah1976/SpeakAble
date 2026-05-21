import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.core.auth import get_current_user
from app.core.config import Settings


def _request(scope: dict | None = None) -> Request:
    return Request({"type": "http", "headers": [], **(scope or {})})


@pytest.mark.anyio
async def test_local_auth_returns_development_user() -> None:
    user = await get_current_user(request=_request(), settings=Settings(require_auth=False))

    assert user.id == "local-user"
    assert user.role == "admin"


@pytest.mark.anyio
async def test_cognito_auth_requires_bearer_token() -> None:
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(
            request=_request(),
            authorization=None,
            settings=Settings(require_auth=True),
        )

    assert exc_info.value.status_code == 401


@pytest.mark.anyio
async def test_unknown_auth_provider_fails_closed() -> None:
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(
            request=_request(),
            authorization="Bearer token",
            settings=Settings(require_auth=True, auth_provider="unknown"),
        )

    assert exc_info.value.status_code == 500


@pytest.mark.anyio
async def test_gateway_authorizer_claims_can_be_trusted() -> None:
    request = _request(
        {
            "aws.event": {
                "requestContext": {
                    "authorizer": {
                        "jwt": {
                            "claims": {
                                "sub": "2f3b7b1c-41b5-4aa6-8b7a-b2f5423cda1e",
                                "email": "moderator@example.test",
                                "cognito:groups": "moderator",
                            }
                        }
                    }
                }
            },
        }
    )

    user = await get_current_user(
        request=request,
        settings=Settings(require_auth=True, trust_gateway_auth=True),
    )

    assert user.id == "2f3b7b1c-41b5-4aa6-8b7a-b2f5423cda1e"
    assert user.email == "moderator@example.test"
    assert user.role == "moderator"
