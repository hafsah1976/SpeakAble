from fastapi import APIRouter, Depends

from app.core.auth import CurrentUser, get_current_user
from app.core.coach import rewrite_message, score_practice_attempt
from app.core.config import Settings, get_settings
from app.core.model_provider import get_coach_model_provider
from app.core.persistence import PersistenceStore, get_persistence_store
from app.core.schemas import (
    CoachRewriteRequest,
    CoachRewriteResponse,
    PracticeAttemptRequest,
    PracticeAttemptResponse,
)

router = APIRouter(tags=["coach"])


@router.post("/coach/rewrite", response_model=CoachRewriteResponse)
async def create_rewrite(
    payload: CoachRewriteRequest,
    settings: Settings = Depends(get_settings),
    user: CurrentUser = Depends(get_current_user),
    store: PersistenceStore = Depends(get_persistence_store),
) -> CoachRewriteResponse:
    response = rewrite_message(
        payload, provider=get_coach_model_provider(settings.coach_model_provider)
    )
    store.save_rewrite(user, payload, response)

    return response


@router.post("/practice-attempts", response_model=PracticeAttemptResponse)
async def create_practice_attempt(
    payload: PracticeAttemptRequest,
    user: CurrentUser = Depends(get_current_user),
    store: PersistenceStore = Depends(get_persistence_store),
) -> PracticeAttemptResponse:
    response = score_practice_attempt(payload.draft_text)
    store.save_practice_attempt(user, response)

    return response
