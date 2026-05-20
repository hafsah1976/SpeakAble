from fastapi import APIRouter, Depends

from app.core.auth import CurrentUser, get_current_user
from app.core.coach import role_play
from app.core.config import Settings, get_settings
from app.core.model_provider import get_coach_model_provider
from app.core.persistence import PersistenceStore, get_persistence_store
from app.core.schemas import RolePlayRequest, RolePlayResponse

router = APIRouter(tags=["role-play"])


@router.post("/role-play", response_model=RolePlayResponse)
async def create_role_play_turn(
    payload: RolePlayRequest,
    settings: Settings = Depends(get_settings),
    user: CurrentUser = Depends(get_current_user),
    store: PersistenceStore = Depends(get_persistence_store),
) -> RolePlayResponse:
    response = role_play(
        payload,
        voice_feature_enabled=settings.voice_role_play_enabled,
        provider=get_coach_model_provider(settings.coach_model_provider),
    )
    store.save_role_play(user, payload, response)

    return response
