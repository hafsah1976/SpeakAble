from fastapi import APIRouter, Depends

from app.core.auth import CurrentUser, get_current_user
from app.core.coach import assess_baseline
from app.core.persistence import PersistenceStore, get_persistence_store
from app.core.schemas import (
    BaselineAssessmentQuestion,
    BaselineAssessmentRequest,
    BaselineAssessmentResponse,
)

router = APIRouter(tags=["assessment"])

QUESTIONS = [
    BaselineAssessmentQuestion(
        id="ask-directly",
        prompt="When I need something, I can ask directly.",
        low_label="Rarely",
        high_label="Usually",
    ),
    BaselineAssessmentQuestion(
        id="stay-kind",
        prompt="I can stay polite without hiding my point.",
        low_label="Hard",
        high_label="Steady",
    ),
    BaselineAssessmentQuestion(
        id="hold-boundary",
        prompt="I can hold a boundary after someone pushes back.",
        low_label="I cave",
        high_label="I stay clear",
    ),
    BaselineAssessmentQuestion(
        id="regulate",
        prompt="I can pause before sending a message when I feel activated.",
        low_label="Rarely",
        high_label="Often",
    ),
]


@router.get("/assessment/baseline/questions", response_model=list[BaselineAssessmentQuestion])
async def list_questions(_user: CurrentUser = Depends(get_current_user)) -> list[BaselineAssessmentQuestion]:
    return QUESTIONS


@router.post("/assessment/baseline", response_model=BaselineAssessmentResponse)
async def submit_baseline(
    payload: BaselineAssessmentRequest,
    user: CurrentUser = Depends(get_current_user),
    store: PersistenceStore = Depends(get_persistence_store),
) -> BaselineAssessmentResponse:
    response = assess_baseline(payload)
    store.save_assessment(user, payload, response)

    return response
