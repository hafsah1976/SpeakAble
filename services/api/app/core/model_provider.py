from functools import lru_cache
from typing import Protocol

from app.core.schemas import (
    CoachRewriteRequest,
    CoachingNote,
    FeedbackScore,
    RolePlayRequest,
    StructuredFeedbackOutput,
    StructuredRolePlayOutput,
)
from app.core.scenario_store import SCENARIOS


TONE_OPENERS = {
    "warm-direct": "I want to be clear and respectful:",
    "firm-boundary": "I need to be direct about this:",
    "repair": "I want to reset this in a better way:",
    "curious": "I want to understand this better while being clear:",
}


class CoachModelProvider(Protocol):
    def generate_feedback(self, request: CoachRewriteRequest) -> StructuredFeedbackOutput:
        """Return structured coaching JSON. Implementations may call any model vendor."""

    def generate_role_play(
        self,
        request: RolePlayRequest,
        *,
        voice_feature_enabled: bool,
    ) -> StructuredRolePlayOutput:
        """Return structured role-play JSON. Output must be moderated before display."""


class DeterministicCoachProvider:
    def generate_feedback(self, request: CoachRewriteRequest) -> StructuredFeedbackOutput:
        opener = TONE_OPENERS[request.tone]
        relationship = request.relationship.replace("-", " ")
        context = request.context or "this comes up"
        goal = request.goal.strip()

        assertive_text = " ".join(
            [
                opener,
                f"When {context.lower()}, I feel it would help to be explicit about what I need.",
                f"My request is: {goal}.",
                "I am open to talking through options, and I want us to choose a next step that works for both of us.",
            ]
        )

        return StructuredFeedbackOutput(
            assertive_text=assertive_text,
            coaching_notes=[
                CoachingNote(
                    label="Start with respect",
                    detail=f"Names the conversation with your {relationship} without blame.",
                ),
                CoachingNote(
                    label="Use an I statement",
                    detail="Centers your need and request instead of diagnosing the other person.",
                ),
                CoachingNote(
                    label="Make the ask concrete",
                    detail="A clear next step is easier to agree to than a general frustration.",
                ),
            ],
            feedback_score=score_message(assertive_text),
            suggested_practice=[
                "Read it once out loud and remove any sentence you would not actually say.",
                "Keep the request to one concrete action.",
                "If your body feels tense, pause before sending and shorten the opening.",
            ],
        )

    def generate_role_play(
        self,
        request: RolePlayRequest,
        *,
        voice_feature_enabled: bool,
    ) -> StructuredRolePlayOutput:
        scenario = next(
            (item for item in SCENARIOS if item.id == request.scenario_id),
            SCENARIOS[0],
        )

        return StructuredRolePlayOutput(
            coach_reply=(
                f"Good start. In this {scenario.category} scenario, try making the ask one sentence shorter "
                "and include a clear next step."
            ),
            captions=[
                "Coach feedback is shown as text captions.",
                "Voice role-play is currently disabled by feature flag."
                if not voice_feature_enabled
                else "Voice mode is enabled and captions remain visible.",
            ],
            score=score_message(request.user_message),
            next_prompt="Try again with one sentence that starts with 'I need...'",
            voice_enabled=voice_feature_enabled and request.mode == "voice",
        )


def score_message(text: str) -> FeedbackScore:
    lower = text.lower()
    has_ask = any(term in lower for term in ["need", "request", "ask", "can we", "could we"])
    has_warmth = any(term in lower for term in ["respect", "appreciate", "open to", "thank"])
    has_boundary = any(term in lower for term in ["i can", "i cannot", "i need", "after that"])
    has_empathy = any(term in lower for term in ["works for both", "understand", "open to"])
    regulated = not any(term in lower for term in ["always", "never", "ridiculous", "furious", "hate"])

    return FeedbackScore(
        clarity=86 if has_ask else 64,
        politeness=88 if has_warmth else 70,
        assertiveness=84 if has_ask or has_boundary else 62,
        empathy=82 if has_empathy else 66,
        boundary_specificity=80 if has_boundary else 58,
        emotional_regulation=90 if regulated else 56,
    )


@lru_cache
def get_coach_model_provider(provider_name: str = "deterministic") -> CoachModelProvider:
    if provider_name != "deterministic":
        raise ValueError(f"Unsupported coach model provider: {provider_name}")

    return DeterministicCoachProvider()
