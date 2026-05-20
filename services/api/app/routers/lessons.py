from fastapi import APIRouter, Depends

from app.core.auth import CurrentUser, get_current_user
from app.core.lesson_store import LESSONS
from app.core.schemas import Lesson

router = APIRouter(tags=["lessons"])


@router.get("/lessons", response_model=list[Lesson])
async def list_lessons(_user: CurrentUser = Depends(get_current_user)) -> list[Lesson]:
    return LESSONS
