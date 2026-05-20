from app.core.coach import detect_safety_flags, rewrite_message, role_play, score_message
from app.core.model_provider import get_coach_model_provider
from app.core.schemas import CoachRewriteRequest, RolePlayRequest


def test_score_message_uses_privacy_safe_dimensions() -> None:
    score = score_message("I need one final deadline and I am open to talking through options.")

    assert score.clarity >= 80
    assert score.assertiveness >= 80
    assert score.emotional_regulation >= 80


def test_detect_safety_flags_without_logging_text() -> None:
    flags = detect_safety_flags("I am afraid of them and feel unsafe at home.")

    assert flags == ["personal-safety"]


def test_model_provider_returns_structured_feedback_schema() -> None:
    provider = get_coach_model_provider("deterministic")
    response = provider.generate_feedback(
        CoachRewriteRequest(
            input_text="I guess the deadline can move again.",
            relationship="coworker",
            tone="warm-direct",
            goal="agree on a final deadline",
        )
    )

    assert response.model_dump()["feedback_score"]["clarity"] >= 80
    assert response.coaching_notes[0].label == "Start with respect"


def test_rewrite_blocks_safety_sensitive_display() -> None:
    response = rewrite_message(
        CoachRewriteRequest(
            input_text="I am afraid of them and feel unsafe at home.",
            relationship="partner",
            tone="firm-boundary",
            goal="get support",
        )
    )

    assert "personal-safety" in response.safety_flags
    assert "cannot provide a polished message" in response.assertive_text


def test_role_play_blocks_safety_sensitive_turns() -> None:
    response = role_play(
        RolePlayRequest(
            scenario_id="scenario-deadline",
            user_message="I want to blackmail them and make them pay.",
            mode="text",
        )
    )

    assert "coercion-or-threat" in response.safety_flags
    assert response.voice_enabled is False
