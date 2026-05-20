from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Protocol
from uuid import UUID, uuid4

from fastapi import Depends
from supabase import Client, create_client

from app.core.auth import CurrentUser
from app.core.config import Settings, get_settings
from app.core.recommendation_store import RECOMMENDATIONS
from app.core.scenario_store import SCENARIOS
from app.core.schemas import (
    AnalyticsEventRequest,
    AnalyticsEventResponse,
    BaselineAssessmentRequest,
    BaselineAssessmentResponse,
    CoachRewriteRequest,
    CoachRewriteResponse,
    ModerationReportRequest,
    ModerationReportResponse,
    OnboardingRequest,
    OnboardingResponse,
    PracticeAttemptResponse,
    PrivacyControls,
    PrivacyDeletionRequest,
    PrivacyDeletionResponse,
    PrivacyExportResponse,
    ProgressSummary,
    RolePlayRequest,
    RolePlayResponse,
    utcnow,
)


EXPORT_INCLUDES = [
    "profile",
    "privacyControls",
    "assessmentSummary",
    "coachSessions",
    "rolePlaySessions",
    "privacyRequests",
    "reports",
]

DEFAULT_PRIVACY_CONTROLS = PrivacyControls(
    save_practice_history=True,
    allow_personalized_recommendations=True,
    allow_deidentified_product_analytics=False,
)


class PersistenceStore(Protocol):
    def save_onboarding(
        self, user: CurrentUser, payload: OnboardingRequest, response: OnboardingResponse
    ) -> None:
        ...

    def save_assessment(
        self,
        user: CurrentUser,
        payload: BaselineAssessmentRequest,
        response: BaselineAssessmentResponse,
    ) -> None:
        ...

    def save_rewrite(
        self, user: CurrentUser, payload: CoachRewriteRequest, response: CoachRewriteResponse
    ) -> None:
        ...

    def save_practice_attempt(
        self, user: CurrentUser, response: PracticeAttemptResponse
    ) -> None:
        ...

    def save_role_play(
        self, user: CurrentUser, payload: RolePlayRequest, response: RolePlayResponse
    ) -> None:
        ...

    def get_progress(self, user: CurrentUser) -> ProgressSummary:
        ...

    def create_report(
        self, user: CurrentUser, payload: ModerationReportRequest
    ) -> ModerationReportResponse:
        ...

    def track_event(
        self, user: CurrentUser, payload: AnalyticsEventRequest
    ) -> AnalyticsEventResponse:
        ...

    def create_privacy_export(self, user: CurrentUser) -> PrivacyExportResponse:
        ...

    def request_privacy_deletion(
        self, user: CurrentUser, payload: PrivacyDeletionRequest
    ) -> PrivacyDeletionResponse:
        ...


@dataclass
class _UserState:
    profile: dict[str, Any] = field(default_factory=dict)
    privacy_controls: PrivacyControls = field(
        default_factory=lambda: DEFAULT_PRIVACY_CONTROLS.model_copy()
    )
    assessments: list[dict[str, Any]] = field(default_factory=list)
    rewrites: list[dict[str, Any]] = field(default_factory=list)
    practice_attempts: list[dict[str, Any]] = field(default_factory=list)
    role_plays: list[dict[str, Any]] = field(default_factory=list)
    reports: list[dict[str, Any]] = field(default_factory=list)
    analytics_events: list[dict[str, Any]] = field(default_factory=list)
    privacy_requests: list[dict[str, Any]] = field(default_factory=list)


class InMemoryPersistenceStore:
    """Development/test persistence. Production uses Supabase when auth is required."""

    def __init__(self) -> None:
        self._users: defaultdict[str, _UserState] = defaultdict(_UserState)

    def reset(self) -> None:
        self._users.clear()

    def _state(self, user: CurrentUser) -> _UserState:
        return self._users[user.id]

    def save_onboarding(
        self, user: CurrentUser, payload: OnboardingRequest, response: OnboardingResponse
    ) -> None:
        state = self._state(user)
        state.privacy_controls = payload.privacy_controls
        state.profile = {
            "userId": user.id,
            "ageRange": payload.age_range,
            "goals": payload.goals,
            "consentAccepted": payload.consent_accepted,
            "consentAcceptedAt": utcnow() if response.completed else None,
            "accessibility": payload.accessibility.model_dump(mode="json", by_alias=True),
            "completed": response.completed,
        }

    def save_assessment(
        self,
        user: CurrentUser,
        payload: BaselineAssessmentRequest,
        response: BaselineAssessmentResponse,
    ) -> None:
        self._state(user).assessments.append(
            {
                "id": str(uuid4()),
                "answers": payload.model_dump(mode="json", by_alias=True)["answers"],
                "style": response.style,
                "score": response.score.model_dump(mode="json", by_alias=True),
                "recommendedLessonIds": response.recommended_lesson_ids,
                "createdAt": utcnow(),
            }
        )

    def save_rewrite(
        self, user: CurrentUser, payload: CoachRewriteRequest, response: CoachRewriteResponse
    ) -> None:
        state = self._state(user)
        should_save_raw_text = state.privacy_controls.save_practice_history
        state.rewrites.append(
            {
                "id": response.id,
                "inputText": payload.input_text if should_save_raw_text else None,
                "context": payload.context if should_save_raw_text else None,
                "assertiveText": response.assertive_text if should_save_raw_text else None,
                "relationship": payload.relationship,
                "tone": payload.tone,
                "goal": payload.goal,
                "score": response.feedback_score.model_dump(mode="json", by_alias=True),
                "safetyFlags": response.safety_flags,
                "createdAt": response.created_at,
            }
        )

    def save_practice_attempt(
        self, user: CurrentUser, response: PracticeAttemptResponse
    ) -> None:
        self._state(user).practice_attempts.append(
            {
                "id": response.id,
                "score": response.score.model_dump(mode="json", by_alias=True),
                "createdAt": response.created_at,
            }
        )

    def save_role_play(
        self, user: CurrentUser, payload: RolePlayRequest, response: RolePlayResponse
    ) -> None:
        state = self._state(user)
        should_save_raw_text = state.privacy_controls.save_practice_history
        state.role_plays.append(
            {
                "id": response.id,
                "scenarioId": payload.scenario_id,
                "mode": payload.mode,
                "userMessage": payload.user_message if should_save_raw_text else None,
                "coachReply": response.coach_reply if should_save_raw_text else None,
                "score": response.score.model_dump(mode="json", by_alias=True),
                "safetyFlags": response.safety_flags,
                "createdAt": response.created_at,
            }
        )

    def get_progress(self, user: CurrentUser) -> ProgressSummary:
        state = self._state(user)
        practice_events = state.rewrites + state.practice_attempts + state.role_plays
        week_ago = utcnow() - timedelta(days=7)
        recent_rewrites = [
            item for item in state.rewrites if _as_datetime(item["createdAt"]) >= week_ago
        ]
        saved_phrases = sum(1 for item in state.rewrites if item.get("assertiveText"))
        streak_days = len({_as_datetime(item["createdAt"]).date() for item in practice_events})
        strongest_skill, next_skill = _skill_summary([item["score"] for item in practice_events])

        return ProgressSummary(
            streak_days=streak_days,
            rewrites_this_week=len(recent_rewrites),
            saved_phrases=saved_phrases,
            strongest_skill=strongest_skill,
            next_skill=next_skill,
            recommendations=RECOMMENDATIONS,
        )

    def create_report(
        self, user: CurrentUser, payload: ModerationReportRequest
    ) -> ModerationReportResponse:
        created_at = utcnow()
        response = ModerationReportResponse(id=str(uuid4()), status="open", created_at=created_at)
        self._state(user).reports.append(
            {
                "id": response.id,
                "subjectType": payload.subject_type,
                "subjectId": payload.subject_id,
                "reason": payload.reason,
                "details": payload.details,
                "status": response.status,
                "createdAt": created_at,
            }
        )
        return response

    def track_event(
        self, user: CurrentUser, payload: AnalyticsEventRequest
    ) -> AnalyticsEventResponse:
        received_at = utcnow()
        response = AnalyticsEventResponse(
            accepted=True,
            event_id=str(uuid4()),
            received_at=received_at,
        )
        self._state(user).analytics_events.append(
            {
                "id": response.event_id,
                "name": payload.name,
                "source": payload.source,
                "properties": payload.properties.model_dump(mode="json", by_alias=True)
                if payload.properties
                else {},
                "receivedAt": received_at,
            }
        )
        return response

    def create_privacy_export(self, user: CurrentUser) -> PrivacyExportResponse:
        generated_at = utcnow()
        response = PrivacyExportResponse(
            id=str(uuid4()),
            generated_at=generated_at,
            format="json",
            includes=EXPORT_INCLUDES,
        )
        self._state(user).privacy_requests.append(
            {
                "id": response.id,
                "requestType": "export",
                "status": "completed",
                "createdAt": generated_at,
            }
        )
        return response

    def request_privacy_deletion(
        self, user: CurrentUser, payload: PrivacyDeletionRequest
    ) -> PrivacyDeletionResponse:
        created_at = utcnow()
        response = PrivacyDeletionResponse(
            id=str(uuid4()),
            status="queued",
            created_at=created_at,
            estimated_completion=created_at + timedelta(days=7),
        )
        state = self._state(user)
        state.privacy_requests.append(
            {
                "id": response.id,
                "requestType": "delete",
                "status": response.status,
                "payload": payload.model_dump(mode="json", by_alias=True),
                "createdAt": created_at,
            }
        )
        if payload.delete_practice_history:
            state.rewrites.clear()
            state.practice_attempts.clear()
            state.role_plays.clear()
        if payload.delete_assessment:
            state.assessments.clear()
        if payload.delete_account:
            state.profile.clear()
        return response


class SupabasePersistenceStore:
    def __init__(self, settings: Settings) -> None:
        if not settings.supabase_url or not settings.supabase_service_role_key:
            raise ValueError("Supabase persistence requires URL and service role key.")
        self._client: Client = create_client(
            settings.supabase_url, settings.supabase_service_role_key
        )

    def save_onboarding(
        self, user: CurrentUser, payload: OnboardingRequest, response: OnboardingResponse
    ) -> None:
        self._client.table("profiles").upsert(
            {
                "id": user.id,
                "age_range": payload.age_range,
                "goals": payload.goals,
                "consent_accepted_at": utcnow().isoformat() if response.completed else None,
                "privacy_controls": payload.privacy_controls.model_dump(
                    mode="json", by_alias=True
                ),
                "accessibility_preferences": payload.accessibility.model_dump(
                    mode="json", by_alias=True
                ),
            }
        ).execute()

    def save_assessment(
        self,
        user: CurrentUser,
        payload: BaselineAssessmentRequest,
        response: BaselineAssessmentResponse,
    ) -> None:
        self._client.table("communication_assessments").insert(
            {
                "user_id": user.id,
                "answers": payload.model_dump(mode="json", by_alias=True)["answers"],
                "style": response.style,
                "score": response.score.model_dump(mode="json", by_alias=True),
                "recommended_lesson_ids": response.recommended_lesson_ids,
            }
        ).execute()

    def save_rewrite(
        self, user: CurrentUser, payload: CoachRewriteRequest, response: CoachRewriteResponse
    ) -> None:
        privacy_controls = self._privacy_controls(user)
        should_save_raw_text = privacy_controls.save_practice_history
        session = self._insert(
            "coach_sessions",
            {
                "user_id": user.id,
                "title": payload.goal[:80],
                "relationship": payload.relationship,
                "tone": payload.tone,
                "goal": payload.goal,
                "status": "completed",
            },
        )
        session_id = session["id"]
        self._client.table("coach_messages").insert(
            {
                "id": response.id,
                "session_id": session_id,
                "user_id": user.id,
                "input_text": payload.input_text if should_save_raw_text else None,
                "rewritten_text": response.assertive_text if should_save_raw_text else None,
                "coaching_notes": [
                    note.model_dump(mode="json", by_alias=True) for note in response.coaching_notes
                ],
                "safety_flags": response.safety_flags,
            }
        ).execute()
        self._insert_feedback_score(user, "coach_message", response.id, response.feedback_score)

    def save_practice_attempt(
        self, user: CurrentUser, response: PracticeAttemptResponse
    ) -> None:
        self._client.table("practice_attempts").insert(
            {
                "id": response.id,
                "user_id": user.id,
                "score": response.score.model_dump(mode="json", by_alias=True),
            }
        ).execute()
        self._insert_feedback_score(user, "practice_attempt", response.id, response.score)

    def save_role_play(
        self, user: CurrentUser, payload: RolePlayRequest, response: RolePlayResponse
    ) -> None:
        privacy_controls = self._privacy_controls(user)
        should_save_raw_text = privacy_controls.save_practice_history
        session = self._insert(
            "role_play_sessions",
            {
                "user_id": user.id,
                "scenario_id": self._scenario_uuid(payload.scenario_id),
                "mode": payload.mode,
                "voice_enabled": response.voice_enabled,
            },
        )
        self._client.table("role_play_turns").insert(
            {
                "id": response.id,
                "session_id": session["id"],
                "user_id": user.id,
                "user_message": payload.user_message if should_save_raw_text else None,
                "coach_reply": response.coach_reply if should_save_raw_text else None,
                "captions": response.captions,
                "score": response.score.model_dump(mode="json", by_alias=True),
                "safety_flags": response.safety_flags,
            }
        ).execute()
        self._insert_feedback_score(user, "role_play_turn", response.id, response.score)

    def get_progress(self, user: CurrentUser) -> ProgressSummary:
        week_ago = (utcnow() - timedelta(days=7)).isoformat()
        rewrite_count = self._count_since("coach_messages", user.id, week_ago)
        saved_phrases = self._count_all("coach_messages", user.id)
        role_play_count = self._count_all("role_play_turns", user.id)
        return ProgressSummary(
            streak_days=min(7, rewrite_count + role_play_count),
            rewrites_this_week=rewrite_count,
            saved_phrases=saved_phrases,
            strongest_skill="Clear asks",
            next_skill="Shorter boundaries",
            recommendations=RECOMMENDATIONS,
        )

    def create_report(
        self, user: CurrentUser, payload: ModerationReportRequest
    ) -> ModerationReportResponse:
        subject_id = _uuid_or_none(payload.subject_id)
        row = self._insert(
            "moderation_reports",
            {
                "reporter_id": user.id,
                "subject_type": payload.subject_type,
                "subject_id": str(subject_id) if subject_id else None,
                "reason": payload.reason,
                "details": payload.details,
                "status": "open",
            },
        )
        return ModerationReportResponse(
            id=row["id"],
            status=row["status"],
            created_at=_as_datetime(row["created_at"]),
        )

    def track_event(
        self, user: CurrentUser, payload: AnalyticsEventRequest
    ) -> AnalyticsEventResponse:
        row = self._insert(
            "analytics_events",
            {
                "user_id": user.id,
                "name": payload.name,
                "source": payload.source,
                "properties": payload.properties.model_dump(mode="json", by_alias=True)
                if payload.properties
                else {},
            },
        )
        return AnalyticsEventResponse(
            accepted=True,
            event_id=row["id"],
            received_at=_as_datetime(row["created_at"]),
        )

    def create_privacy_export(self, user: CurrentUser) -> PrivacyExportResponse:
        row = self._insert(
            "privacy_requests",
            {
                "user_id": user.id,
                "request_type": "export",
                "status": "completed",
                "requested_payload": {"includes": EXPORT_INCLUDES},
                "completed_at": utcnow().isoformat(),
            },
        )
        return PrivacyExportResponse(
            id=row["id"],
            generated_at=_as_datetime(row["created_at"]),
            format="json",
            includes=EXPORT_INCLUDES,
        )

    def request_privacy_deletion(
        self, user: CurrentUser, payload: PrivacyDeletionRequest
    ) -> PrivacyDeletionResponse:
        estimated_completion = utcnow() + timedelta(days=7)
        row = self._insert(
            "privacy_requests",
            {
                "user_id": user.id,
                "request_type": "delete",
                "status": "queued",
                "requested_payload": payload.model_dump(mode="json", by_alias=True),
                "estimated_completion": estimated_completion.isoformat(),
            },
        )
        return PrivacyDeletionResponse(
            id=row["id"],
            status="queued",
            created_at=_as_datetime(row["created_at"]),
            estimated_completion=estimated_completion,
        )

    def _privacy_controls(self, user: CurrentUser) -> PrivacyControls:
        response = (
            self._client.table("profiles")
            .select("privacy_controls")
            .eq("id", user.id)
            .limit(1)
            .execute()
        )
        rows = response.data or []
        if not rows:
            return DEFAULT_PRIVACY_CONTROLS
        return PrivacyControls.model_validate(rows[0].get("privacy_controls") or {})

    def _scenario_uuid(self, scenario_id: str) -> str | None:
        scenario = next((item for item in SCENARIOS if item.id == scenario_id), None)
        if not scenario:
            return None
        response = (
            self._client.table("practice_scenarios")
            .select("id")
            .eq("slug", scenario.slug)
            .limit(1)
            .execute()
        )
        rows = response.data or []
        return str(rows[0]["id"]) if rows else None

    def _insert(self, table: str, payload: dict[str, Any]) -> dict[str, Any]:
        response = self._client.table(table).insert(payload).execute()
        rows = response.data or []
        if not rows:
            raise RuntimeError(f"Supabase insert into {table} returned no rows.")
        return dict(rows[0])

    def _insert_feedback_score(
        self, user: CurrentUser, subject_type: str, subject_id: str, score: Any
    ) -> None:
        self._client.table("feedback_scores").insert(
            {
                "user_id": user.id,
                "subject_type": subject_type,
                "subject_id": subject_id,
                "clarity": score.clarity,
                "politeness": score.politeness,
                "assertiveness": score.assertiveness,
                "empathy": score.empathy,
                "boundary_specificity": score.boundary_specificity,
                "emotional_regulation": score.emotional_regulation,
            }
        ).execute()

    def _count_since(self, table: str, user_id: str, iso_timestamp: str) -> int:
        response = (
            self._client.table(table)
            .select("id")
            .eq("user_id", user_id)
            .gte("created_at", iso_timestamp)
            .execute()
        )
        return len(response.data or [])

    def _count_all(self, table: str, user_id: str) -> int:
        response = self._client.table(table).select("id").eq("user_id", user_id).execute()
        return len(response.data or [])


_local_store = InMemoryPersistenceStore()


def get_persistence_store(settings: Settings = Depends(get_settings)) -> PersistenceStore:
    resolved_settings = settings
    if (
        resolved_settings.require_auth
        and resolved_settings.supabase_url
        and resolved_settings.supabase_service_role_key
    ):
        return SupabasePersistenceStore(resolved_settings)
    return _local_store


def reset_local_persistence_store() -> None:
    _local_store.reset()


def _as_datetime(value: datetime | str) -> datetime:
    if isinstance(value, datetime):
        return value
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _uuid_or_none(value: str | None) -> UUID | None:
    if not value:
        return None
    try:
        return UUID(value)
    except ValueError:
        return None


def _skill_summary(scores: list[dict[str, int]]) -> tuple[str, str]:
    if not scores:
        return ("Clear asks", "Shorter boundaries")

    labels = {
        "clarity": "Clarity",
        "politeness": "Politeness",
        "assertiveness": "Assertiveness",
        "empathy": "Empathy",
        "boundarySpecificity": "Boundary specificity",
        "emotionalRegulation": "Emotional regulation",
    }
    averages: dict[str, float] = {}
    for key in labels:
        averages[key] = sum(score.get(key, 0) for score in scores) / len(scores)

    strongest = max(averages, key=averages.get)
    weakest = min(averages, key=averages.get)
    return labels[strongest], labels[weakest]
