from fastapi import APIRouter, Depends

from app.core.auth import CurrentUser, require_moderator
from app.core.schemas import ModerationReportResponse, ModerationReportUpdate, utcnow

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/moderation/reports", response_model=list[ModerationReportResponse])
async def list_reports(_user: CurrentUser = Depends(require_moderator)) -> list[ModerationReportResponse]:
    return [
        ModerationReportResponse(
            id="report-seed-1",
            status="open",
            created_at=utcnow(),
        )
    ]


@router.patch("/moderation/reports/{report_id}", response_model=ModerationReportResponse)
async def update_report(
    report_id: str,
    payload: ModerationReportUpdate,
    _user: CurrentUser = Depends(require_moderator),
) -> ModerationReportResponse:
    return ModerationReportResponse(
        id=report_id,
        status=payload.status,
        created_at=utcnow(),
    )
