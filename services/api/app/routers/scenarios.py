from fastapi import APIRouter, Depends, Query

from app.core.auth import CurrentUser, get_current_user
from app.core.scenario_store import SCENARIOS
from app.core.schemas import PracticeScenario

router = APIRouter(tags=["scenarios"])


@router.get("/scenarios", response_model=list[PracticeScenario])
async def list_scenarios(
    difficulty: str | None = None,
    category: str | None = None,
    limit: int = Query(default=12, ge=1, le=50),
    _user: CurrentUser = Depends(get_current_user),
) -> list[PracticeScenario]:
    items = SCENARIOS

    if difficulty:
        items = [item for item in items if item.difficulty == difficulty]

    if category:
        items = [item for item in items if item.category == category]

    return items[:limit]
