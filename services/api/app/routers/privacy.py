from fastapi import APIRouter, Depends

from app.core.auth import CurrentUser, get_current_user
from app.core.persistence import PersistenceStore, get_persistence_store
from app.core.schemas import (
    PrivacyDeletionRequest,
    PrivacyDeletionResponse,
    PrivacyExportResponse,
)

router = APIRouter(tags=["privacy"])


@router.post("/privacy/export", response_model=PrivacyExportResponse)
async def export_privacy_data(
    user: CurrentUser = Depends(get_current_user),
    store: PersistenceStore = Depends(get_persistence_store),
) -> PrivacyExportResponse:
    return store.create_privacy_export(user)


@router.post("/privacy/delete", response_model=PrivacyDeletionResponse)
async def request_deletion(
    payload: PrivacyDeletionRequest,
    user: CurrentUser = Depends(get_current_user),
    store: PersistenceStore = Depends(get_persistence_store),
) -> PrivacyDeletionResponse:
    return store.request_privacy_deletion(user, payload)
