from fastapi import APIRouter, Depends

from app.core.auth import CurrentUser, get_current_user
from app.core.persistence import PersistenceStore, get_persistence_store
from app.core.schemas import AnalyticsEventRequest, AnalyticsEventResponse

router = APIRouter(tags=["analytics"])


@router.post("/analytics/events", response_model=AnalyticsEventResponse)
async def track_event(
    payload: AnalyticsEventRequest,
    user: CurrentUser = Depends(get_current_user),
    store: PersistenceStore = Depends(get_persistence_store),
) -> AnalyticsEventResponse:
    return store.track_event(user, payload)
