from uuid import uuid4

from app.core.model_provider import CoachModelProvider, get_coach_model_provider, score_message
from app.core.moderation import BLOCKED_SAFETY_MESSAGE, detect_safety_flags, moderate_text
from app.core.schemas import (
    BaselineAssessmentRequest,
    BaselineAssessmentResponse,
    CoachRewriteRequest,
    CoachRewriteResponse,
    CoachingNote,
    FeedbackScore,
    PracticeAttemptResponse,
    RolePlayRequest,
    RolePlayResponse,
    StructuredFeedbackOutput,
    StructuredRolePlayOutput,
    utcnow,
)


def rewrite_message(
    request: CoachRewriteRequest,
    provider: CoachModelProvider | None = None,
) -> CoachRewriteResponse:
    coach_provider = provider or get_coach_model_provider()
    input_decision = moderate_text(request.input_text)

    if input_decision.allowed:
        structured_output = coach_provider.generate_feedback(request)
        output_decision = moderate_text(structured_output.assertive_text)
    else:
        structured_output = _blocked_feedback_output()
        output_decision = moderate_text(structured_output.assertive_text)

    return CoachRewriteResponse(
        id=str(uuid4()),
        assertive_text=(
            structured_output.assertive_text
            if output_decision.allowed
            else output_decision.replacement_text or BLOCKED_SAFETY_MESSAGE
        ),
        coaching_notes=structured_output.coaching_notes,
        safety_flags=input_decision.safety_flags,
        output_safety_flags=output_decision.safety_flags,
        feedback_score=structured_output.feedback_score,
        suggested_practice=structured_output.suggested_practice,
        created_at=utcnow(),
    )


def score_practice_attempt(draft_text: str) -> PracticeAttemptResponse:
    return PracticeAttemptResponse(
        id=str(uuid4()),
        score=score_message(draft_text),
        notes=[
            CoachingNote(label="Clarity", detail="Name the specific action you want next."),
            CoachingNote(label="Warmth", detail="One respectful sentence is enough; avoid overexplaining."),
            CoachingNote(label="Boundary", detail="State what you can do and what you cannot keep doing."),
        ],
        created_at=utcnow(),
    )


def assess_baseline(request: BaselineAssessmentRequest) -> BaselineAssessmentResponse:
    total = sum(answer.value for answer in request.answers)
    average = total / max(len(request.answers), 1)
    boundary = next(
        (answer.value for answer in request.answers if answer.question_id == "hold-boundary"), average
    )
    regulation = next(
        (answer.value for answer in request.answers if answer.question_id == "regulate"), average
    )

    if average >= 4 and boundary >= 4:
        style = "balanced"
    elif boundary <= 2:
        style = "accommodating"
    elif regulation <= 2:
        style = "intense"
    else:
        style = "avoidant"

    return BaselineAssessmentResponse(
        style=style,
        summary=(
            "You already have a solid base. Your next growth edge is precision under pressure."
            if style == "balanced"
            else "Your plan should focus on short, specific asks and a pause before high-stakes replies."
        ),
        score=FeedbackScore(
            clarity=round(average * 18),
            politeness=82,
            assertiveness=round(boundary * 18),
            empathy=78,
            boundary_specificity=round(boundary * 17),
            emotional_regulation=round(regulation * 18),
        ),
        recommended_lesson_ids=(
            ["lesson-boundary", "lesson-i-statement"] if boundary <= 3 else ["lesson-repair"]
        ),
    )


def role_play(
    request: RolePlayRequest,
    voice_feature_enabled: bool = False,
    provider: CoachModelProvider | None = None,
) -> RolePlayResponse:
    coach_provider = provider or get_coach_model_provider()
    input_decision = moderate_text(request.user_message)

    if input_decision.allowed:
        structured_output = coach_provider.generate_role_play(
            request,
            voice_feature_enabled=voice_feature_enabled,
        )
        output_decision = moderate_text(structured_output.coach_reply)
    else:
        structured_output = _blocked_role_play_output(request, voice_feature_enabled)
        output_decision = moderate_text(structured_output.coach_reply)

    return RolePlayResponse(
        id=str(uuid4()),
        coach_reply=(
            structured_output.coach_reply
            if output_decision.allowed
            else output_decision.replacement_text or BLOCKED_SAFETY_MESSAGE
        ),
        captions=structured_output.captions,
        score=structured_output.score,
        safety_flags=input_decision.safety_flags,
        next_prompt=structured_output.next_prompt,
        voice_enabled=structured_output.voice_enabled,
        created_at=utcnow(),
    )


def _blocked_feedback_output() -> StructuredFeedbackOutput:
    return StructuredFeedbackOutput(
        assertive_text=BLOCKED_SAFETY_MESSAGE,
        coaching_notes=[
            CoachingNote(
                label="Pause before sending",
                detail="This situation may need support or a safety plan before direct messaging.",
            ),
            CoachingNote(
                label="Use a lower-risk next step",
                detail="Choose a trusted person, local service, or safer channel before confrontation.",
            ),
        ],
        feedback_score=score_message(BLOCKED_SAFETY_MESSAGE),
        suggested_practice=[
            "Do not send a message if it could increase immediate risk.",
            "Write down one safe next step you can take offline.",
        ],
    )


def _blocked_role_play_output(
    request: RolePlayRequest,
    voice_feature_enabled: bool,
) -> StructuredRolePlayOutput:
    return StructuredRolePlayOutput(
        coach_reply=BLOCKED_SAFETY_MESSAGE,
        captions=[
            "Safety-sensitive role-play is blocked before display.",
            "Voice mode remains disabled for this turn."
            if not voice_feature_enabled
            else "Voice mode is not used for safety-sensitive turns.",
        ],
        score=score_message(request.user_message),
        next_prompt="Choose a safer, lower-risk next step before practicing a direct message.",
        voice_enabled=False,
    )
