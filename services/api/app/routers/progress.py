from fastapi import APIRouter, Depends

from app.core.auth import CurrentUser, get_current_user
from app.core.persistence import PersistenceStore, get_persistence_store
from app.core.schemas import ProgressSummary

router = APIRouter(tags=["progress"])


@router.get("/progress", response_model=ProgressSummary)
async def get_progress(
    user: CurrentUser = Depends(get_current_user),
    store: PersistenceStore = Depends(get_persistence_store),
) -> ProgressSummary:
    return store.get_progress(user)
