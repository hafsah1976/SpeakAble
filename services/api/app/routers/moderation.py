from fastapi import APIRouter, Depends

from app.core.auth import CurrentUser, get_current_user
from app.core.persistence import PersistenceStore, get_persistence_store
from app.core.schemas import ModerationReportRequest, ModerationReportResponse

router = APIRouter(tags=["moderation"])


@router.post("/moderation/reports", response_model=ModerationReportResponse)
async def create_report(
    payload: ModerationReportRequest,
    user: CurrentUser = Depends(get_current_user),
    store: PersistenceStore = Depends(get_persistence_store),
) -> ModerationReportResponse:
    return store.create_report(user, payload)
