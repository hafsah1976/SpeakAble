from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Protocol
from uuid import UUID, uuid4

from fastapi import Depends
import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

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
    """Development/test persistence. Production uses Postgres when auth is required."""

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


class PostgresPersistenceStore:
    def __init__(self, settings: Settings) -> None:
        if not settings.database_url:
            raise ValueError("Postgres persistence requires DATABASE_URL.")
        self._database_url = settings.database_url

    def save_onboarding(
        self, user: CurrentUser, payload: OnboardingRequest, response: OnboardingResponse
    ) -> None:
        with self._connect(user) as connection:
            self._ensure_user(connection, user)
            connection.execute(
                """
                insert into public.profiles (
                  id,
                  age_range,
                  goals,
                  consent_accepted_at,
                  privacy_controls,
                  accessibility_preferences
                )
                values (%s, %s, %s, %s, %s, %s)
                on conflict (id) do update set
                  age_range = excluded.age_range,
                  goals = excluded.goals,
                  consent_accepted_at = excluded.consent_accepted_at,
                  privacy_controls = excluded.privacy_controls,
                  accessibility_preferences = excluded.accessibility_preferences,
                  updated_at = now()
                """,
                (
                    user.id,
                    payload.age_range,
                    list(payload.goals),
                    utcnow() if response.completed else None,
                    Jsonb(payload.privacy_controls.model_dump(mode="json", by_alias=True)),
                    Jsonb(payload.accessibility.model_dump(mode="json", by_alias=True)),
                ),
            )

    def save_assessment(
        self,
        user: CurrentUser,
        payload: BaselineAssessmentRequest,
        response: BaselineAssessmentResponse,
    ) -> None:
        with self._connect(user) as connection:
            self._ensure_user(connection, user)
            connection.execute(
                """
                insert into public.communication_assessments (
                  user_id,
                  answers,
                  style,
                  score,
                  recommended_lesson_ids
                )
                values (%s, %s, %s, %s, %s)
                """,
                (
                    user.id,
                    Jsonb(payload.model_dump(mode="json", by_alias=True)["answers"]),
                    response.style,
                    Jsonb(response.score.model_dump(mode="json", by_alias=True)),
                    response.recommended_lesson_ids,
                ),
            )

    def save_rewrite(
        self, user: CurrentUser, payload: CoachRewriteRequest, response: CoachRewriteResponse
    ) -> None:
        with self._connect(user) as connection:
            self._ensure_user(connection, user)
            privacy_controls = self._privacy_controls(connection, user)
            should_save_raw_text = privacy_controls.save_practice_history
            session = self._insert_returning(
                connection,
                """
                insert into public.coach_sessions (
                  user_id,
                  title,
                  relationship,
                  tone,
                  goal,
                  status
                )
                values (%s, %s, %s, %s, %s, 'completed')
                returning id
                """,
                (
                    user.id,
                    payload.goal[:80],
                    payload.relationship,
                    payload.tone,
                    payload.goal,
                ),
            )
            connection.execute(
                """
                insert into public.coach_messages (
                  id,
                  session_id,
                  user_id,
                  input_text,
                  rewritten_text,
                  coaching_notes,
                  safety_flags
                )
                values (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    response.id,
                    session["id"],
                    user.id,
                    payload.input_text if should_save_raw_text else None,
                    response.assertive_text if should_save_raw_text else None,
                    Jsonb(
                        [
                            note.model_dump(mode="json", by_alias=True)
                            for note in response.coaching_notes
                        ]
                    ),
                    response.safety_flags,
                ),
            )
            self._insert_feedback_score(
                connection, user, "coach_message", response.id, response.feedback_score
            )

    def save_practice_attempt(
        self, user: CurrentUser, response: PracticeAttemptResponse
    ) -> None:
        with self._connect(user) as connection:
            self._ensure_user(connection, user)
            connection.execute(
                """
                insert into public.practice_attempts (id, user_id, score)
                values (%s, %s, %s)
                """,
                (
                    response.id,
                    user.id,
                    Jsonb(response.score.model_dump(mode="json", by_alias=True)),
                ),
            )
            self._insert_feedback_score(
                connection, user, "practice_attempt", response.id, response.score
            )

    def save_role_play(
        self, user: CurrentUser, payload: RolePlayRequest, response: RolePlayResponse
    ) -> None:
        with self._connect(user) as connection:
            self._ensure_user(connection, user)
            privacy_controls = self._privacy_controls(connection, user)
            should_save_raw_text = privacy_controls.save_practice_history
            session = self._insert_returning(
                connection,
                """
                insert into public.role_play_sessions (
                  user_id,
                  scenario_id,
                  mode,
                  voice_enabled
                )
                values (%s, %s, %s, %s)
                returning id
                """,
                (
                    user.id,
                    self._scenario_uuid(connection, payload.scenario_id),
                    payload.mode,
                    response.voice_enabled,
                ),
            )
            connection.execute(
                """
                insert into public.role_play_turns (
                  id,
                  session_id,
                  user_id,
                  user_message,
                  coach_reply,
                  captions,
                  score,
                  safety_flags
                )
                values (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    response.id,
                    session["id"],
                    user.id,
                    payload.user_message if should_save_raw_text else None,
                    response.coach_reply if should_save_raw_text else None,
                    response.captions,
                    Jsonb(response.score.model_dump(mode="json", by_alias=True)),
                    response.safety_flags,
                ),
            )
            self._insert_feedback_score(
                connection, user, "role_play_turn", response.id, response.score
            )

    def get_progress(self, user: CurrentUser) -> ProgressSummary:
        with self._connect(user) as connection:
            self._ensure_user(connection, user)
            week_ago = utcnow() - timedelta(days=7)
            rewrite_count = self._count_since(connection, "coach_messages", user.id, week_ago)
            saved_phrases = self._count_all(connection, "coach_messages", user.id)
            role_play_count = self._count_all(connection, "role_play_turns", user.id)
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
        with self._connect(user) as connection:
            self._ensure_user(connection, user)
            subject_id = _uuid_or_none(payload.subject_id)
            row = self._insert_returning(
                connection,
                """
                insert into public.moderation_reports (
                  reporter_id,
                  subject_type,
                  subject_id,
                  reason,
                  details,
                  status
                )
                values (%s, %s, %s, %s, %s, 'open')
                returning id, status, created_at
                """,
                (
                    user.id,
                    payload.subject_type,
                    str(subject_id) if subject_id else None,
                    payload.reason,
                    payload.details,
                ),
            )
            return ModerationReportResponse(
                id=str(row["id"]),
                status=row["status"],
                created_at=_as_datetime(row["created_at"]),
            )

    def track_event(
        self, user: CurrentUser, payload: AnalyticsEventRequest
    ) -> AnalyticsEventResponse:
        with self._connect(user) as connection:
            self._ensure_user(connection, user)
            row = self._insert_returning(
                connection,
                """
                insert into public.analytics_events (user_id, name, source, properties)
                values (%s, %s, %s, %s)
                returning id, created_at
                """,
                (
                    user.id,
                    payload.name,
                    payload.source,
                    Jsonb(
                        payload.properties.model_dump(mode="json", by_alias=True)
                        if payload.properties
                        else {}
                    ),
                ),
            )
            return AnalyticsEventResponse(
                accepted=True,
                event_id=str(row["id"]),
                received_at=_as_datetime(row["created_at"]),
            )

    def create_privacy_export(self, user: CurrentUser) -> PrivacyExportResponse:
        with self._connect(user) as connection:
            self._ensure_user(connection, user)
            row = self._insert_returning(
                connection,
                """
                insert into public.privacy_requests (
                  user_id,
                  request_type,
                  status,
                  requested_payload,
                  completed_at
                )
                values (%s, 'export', 'completed', %s, %s)
                returning id, created_at
                """,
                (user.id, Jsonb({"includes": EXPORT_INCLUDES}), utcnow()),
            )
            return PrivacyExportResponse(
                id=str(row["id"]),
                generated_at=_as_datetime(row["created_at"]),
                format="json",
                includes=EXPORT_INCLUDES,
            )

    def request_privacy_deletion(
        self, user: CurrentUser, payload: PrivacyDeletionRequest
    ) -> PrivacyDeletionResponse:
        with self._connect(user) as connection:
            self._ensure_user(connection, user)
            estimated_completion = utcnow() + timedelta(days=7)
            row = self._insert_returning(
                connection,
                """
                insert into public.privacy_requests (
                  user_id,
                  request_type,
                  status,
                  requested_payload,
                  estimated_completion
                )
                values (%s, 'delete', 'queued', %s, %s)
                returning id, created_at
                """,
                (
                    user.id,
                    Jsonb(payload.model_dump(mode="json", by_alias=True)),
                    estimated_completion,
                ),
            )
            return PrivacyDeletionResponse(
                id=str(row["id"]),
                status="queued",
                created_at=_as_datetime(row["created_at"]),
                estimated_completion=estimated_completion,
            )

    def _connect(self, user: CurrentUser) -> psycopg.Connection[Any]:
        connection = psycopg.connect(self._database_url, row_factory=dict_row)
        connection.execute("select set_config('app.current_user_id', %s, true)", (user.id,))
        connection.execute("select set_config('app.current_user_role', %s, true)", (user.role,))
        return connection

    def _ensure_user(
        self, connection: psycopg.Connection[Any], user: CurrentUser
    ) -> None:
        connection.execute(
            """
            insert into public.app_users (id, email, role)
            values (%s, %s, %s)
            on conflict (id) do update set
              email = coalesce(excluded.email, public.app_users.email),
              role = excluded.role,
              updated_at = now()
            """,
            (user.id, user.email, user.role),
        )
        connection.execute(
            """
            insert into public.profiles (id, display_name, role)
            values (%s, %s, %s)
            on conflict (id) do nothing
            """,
            (user.id, user.email.split("@", 1)[0] if user.email else None, user.role),
        )

    def _privacy_controls(
        self, connection: psycopg.Connection[Any], user: CurrentUser
    ) -> PrivacyControls:
        row = connection.execute(
            "select privacy_controls from public.profiles where id = %s limit 1",
            (user.id,),
        ).fetchone()
        if not row:
            return DEFAULT_PRIVACY_CONTROLS
        return PrivacyControls.model_validate(row.get("privacy_controls") or {})

    def _scenario_uuid(
        self, connection: psycopg.Connection[Any], scenario_id: str
    ) -> str | None:
        scenario = next((item for item in SCENARIOS if item.id == scenario_id), None)
        if not scenario:
            return None
        row = connection.execute(
            "select id from public.practice_scenarios where slug = %s limit 1",
            (scenario.slug,),
        ).fetchone()
        return str(row["id"]) if row else None

    def _insert_returning(
        self,
        connection: psycopg.Connection[Any],
        sql: str,
        parameters: tuple[Any, ...],
    ) -> dict[str, Any]:
        row = connection.execute(sql, parameters).fetchone()
        if not row:
            raise RuntimeError("Postgres insert returned no rows.")
        return dict(row)

    def _insert_feedback_score(
        self,
        connection: psycopg.Connection[Any],
        user: CurrentUser,
        subject_type: str,
        subject_id: str,
        score: Any,
    ) -> None:
        connection.execute(
            """
            insert into public.feedback_scores (
              user_id,
              subject_type,
              subject_id,
              clarity,
              politeness,
              assertiveness,
              empathy,
              boundary_specificity,
              emotional_regulation
            )
            values (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                user.id,
                subject_type,
                subject_id,
                score.clarity,
                score.politeness,
                score.assertiveness,
                score.empathy,
                score.boundary_specificity,
                score.emotional_regulation,
            ),
        )

    def _count_since(
        self,
        connection: psycopg.Connection[Any],
        table: str,
        user_id: str,
        since: datetime,
    ) -> int:
        row = connection.execute(
            f"select count(*) as count from public.{table} where user_id = %s and created_at >= %s",
            (user_id, since),
        ).fetchone()
        return int(row["count"]) if row else 0

    def _count_all(
        self, connection: psycopg.Connection[Any], table: str, user_id: str
    ) -> int:
        row = connection.execute(
            f"select count(*) as count from public.{table} where user_id = %s",
            (user_id,),
        ).fetchone()
        return int(row["count"]) if row else 0


_local_store = InMemoryPersistenceStore()


def get_persistence_store(settings: Settings = Depends(get_settings)) -> PersistenceStore:
    resolved_settings = settings
    if resolved_settings.require_auth and resolved_settings.database_url:
        return PostgresPersistenceStore(resolved_settings)
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
