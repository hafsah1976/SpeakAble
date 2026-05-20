from fastapi import APIRouter, Depends

from app.core.auth import CurrentUser, get_current_user
from app.core.persistence import PersistenceStore, get_persistence_store
from app.core.schemas import OnboardingRequest, OnboardingResponse

router = APIRouter(tags=["onboarding"])


@router.post("/onboarding", response_model=OnboardingResponse)
async def complete_onboarding(
    payload: OnboardingRequest,
    user: CurrentUser = Depends(get_current_user),
    store: PersistenceStore = Depends(get_persistence_store),
) -> OnboardingResponse:
    response = OnboardingResponse(
        completed=payload.age_range != "under-13" and payload.consent_accepted,
        next_step="assessment" if payload.goals else "coach",
        privacy_controls=payload.privacy_controls,
    )
    store.save_onboarding(user, payload, response)

    return response
