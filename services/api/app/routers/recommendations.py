from fastapi import APIRouter, Depends

from app.core.auth import CurrentUser, get_current_user
from app.core.recommendation_store import RECOMMENDATIONS
from app.core.schemas import Recommendation

router = APIRouter(tags=["recommendations"])


@router.get("/recommendations", response_model=list[Recommendation])
async def list_recommendations(_user: CurrentUser = Depends(get_current_user)) -> list[Recommendation]:
    return RECOMMENDATIONS
