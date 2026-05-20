from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


def to_camel(value: str) -> str:
    first, *rest = value.split("_")
    return first + "".join(part.capitalize() for part in rest)


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


CoachTone = Literal["warm-direct", "firm-boundary", "repair", "curious"]
Relationship = Literal[
    "coworker", "manager", "friend", "partner", "family", "service-provider", "other"
]
AgeRange = Literal["under-13", "13-15", "16-17", "18-plus"]
CommunicationGoal = Literal[
    "clearer-asks",
    "boundaries",
    "hard-feedback",
    "less-apologizing",
    "conflict-repair",
    "workplace-confidence",
]


class FeatureFlags(CamelModel):
    voice_role_play: bool = False
    external_sharing: bool = False


class PrivacyControls(CamelModel):
    save_practice_history: bool
    allow_personalized_recommendations: bool
    allow_deidentified_product_analytics: bool


class AccessibilityPreferences(CamelModel):
    captions: bool
    reduced_motion: bool
    adjustable_type: Literal["standard", "large", "extra-large"]


class OnboardingRequest(CamelModel):
    age_range: AgeRange
    consent_accepted: bool
    goals: list[CommunicationGoal]
    privacy_controls: PrivacyControls
    accessibility: AccessibilityPreferences


class OnboardingResponse(CamelModel):
    completed: bool
    next_step: Literal["assessment", "coach"]
    privacy_controls: PrivacyControls


class CoachingNote(CamelModel):
    label: str
    detail: str


class FeedbackScore(CamelModel):
    clarity: int
    politeness: int
    assertiveness: int
    empathy: int
    boundary_specificity: int
    emotional_regulation: int


class StructuredFeedbackOutput(CamelModel):
    assertive_text: str
    coaching_notes: list[CoachingNote]
    feedback_score: FeedbackScore
    suggested_practice: list[str]


class StructuredRolePlayOutput(CamelModel):
    coach_reply: str
    captions: list[str]
    score: FeedbackScore
    next_prompt: str
    voice_enabled: bool


class CoachRewriteRequest(CamelModel):
    input_text: str = Field(min_length=1, max_length=4000)
    relationship: Relationship
    tone: CoachTone
    goal: str = Field(min_length=1, max_length=240)
    context: str | None = Field(default=None, max_length=1000)


class CoachRewriteResponse(CamelModel):
    id: str
    assertive_text: str
    coaching_notes: list[CoachingNote]
    feedback_score: FeedbackScore
    safety_flags: list[str]
    output_safety_flags: list[str]
    suggested_practice: list[str]
    created_at: datetime


class PracticeScenario(CamelModel):
    id: str
    slug: str
    title: str
    description: str
    difficulty: Literal["starter", "steady", "stretch"]
    category: str
    prompt: str


class PracticeAttemptRequest(CamelModel):
    scenario_id: str
    draft_text: str = Field(min_length=1, max_length=4000)


class PracticeAttemptResponse(CamelModel):
    id: str
    score: FeedbackScore
    notes: list[CoachingNote]
    created_at: datetime


class Recommendation(CamelModel):
    id: str
    title: str
    reason: str
    action: str
    priority: Literal["low", "medium", "high"]


class ProgressSummary(CamelModel):
    streak_days: int
    rewrites_this_week: int
    saved_phrases: int
    strongest_skill: str
    next_skill: str
    recommendations: list[Recommendation]


class BaselineAssessmentQuestion(CamelModel):
    id: str
    prompt: str
    low_label: str
    high_label: str


class BaselineAssessmentAnswer(CamelModel):
    question_id: str
    value: int = Field(ge=1, le=5)


class BaselineAssessmentRequest(CamelModel):
    answers: list[BaselineAssessmentAnswer]


class BaselineAssessmentResponse(CamelModel):
    style: Literal["accommodating", "direct", "avoidant", "balanced", "intense"]
    summary: str
    score: FeedbackScore
    recommended_lesson_ids: list[str]


class LessonExercise(CamelModel):
    id: str
    prompt: str
    example_answer: str


class Lesson(CamelModel):
    id: str
    title: str
    objective: str
    example: dict[str, str]
    exercises: list[LessonExercise]
    estimated_minutes: int


class RolePlayRequest(CamelModel):
    scenario_id: str
    user_message: str = Field(min_length=1, max_length=4000)
    mode: Literal["text", "voice"] = "text"


class RolePlayResponse(CamelModel):
    id: str
    coach_reply: str
    captions: list[str]
    score: FeedbackScore
    safety_flags: list[str]
    next_prompt: str
    voice_enabled: bool
    created_at: datetime


class ModerationReportRequest(CamelModel):
    subject_type: Literal["coach_message", "practice_attempt", "scenario", "other"]
    subject_id: str | None = None
    reason: str = Field(min_length=1, max_length=160)
    details: str | None = Field(default=None, max_length=2000)


class ModerationReportResponse(CamelModel):
    id: str
    status: Literal["open", "triaged", "resolved", "dismissed"]
    created_at: datetime


class ModerationReportUpdate(CamelModel):
    status: Literal["open", "triaged", "resolved", "dismissed"]
    reviewer_notes: str | None = Field(default=None, max_length=2000)


class PrivacyExportResponse(CamelModel):
    id: str
    generated_at: datetime
    format: Literal["json"]
    download_url: str | None = None
    includes: list[str]


class PrivacyDeletionRequest(CamelModel):
    delete_practice_history: bool
    delete_assessment: bool
    delete_account: bool


class PrivacyDeletionResponse(CamelModel):
    id: str
    status: Literal["queued", "completed"]
    created_at: datetime
    estimated_completion: datetime


class AnalyticsProperties(CamelModel):
    surface: str | None = None
    mode: Literal["text", "voice"] | None = None
    goal_count: int | None = Field(default=None, ge=0, le=12)
    safety_flag_count: int | None = Field(default=None, ge=0, le=20)
    score_bucket: Literal["low", "medium", "high"] | None = None
    feature_flag: str | None = None
    preference: str | None = None


class AnalyticsEventRequest(CamelModel):
    name: Literal[
        "onboarding_saved",
        "baseline_assessment_submitted",
        "coach_rewrite_requested",
        "role_play_turn_submitted",
        "privacy_export_requested",
        "privacy_deletion_requested",
        "moderation_report_submitted",
        "accessibility_preference_changed",
    ]
    source: Literal["web", "mobile", "api"]
    properties: AnalyticsProperties | None = None


class AnalyticsEventResponse(CamelModel):
    accepted: bool
    event_id: str
    received_at: datetime


def utcnow() -> datetime:
    return datetime.now(timezone.utc)
