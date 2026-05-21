import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.core.persistence import reset_local_persistence_store
from app.main import app


client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_persistence() -> None:
    reset_local_persistence_store()


def test_health() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_readiness_skips_database_for_local_development() -> None:
    get_settings.cache_clear()

    response = client.get("/ready")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ready"
    assert body["checks"]["database"] == "skipped"


def test_readiness_reports_missing_production_dependencies(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("REQUIRE_AUTH", "true")
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("AWS_REGION", raising=False)
    monkeypatch.delenv("AWS_COGNITO_USER_POOL_ID", raising=False)
    monkeypatch.delenv("AWS_COGNITO_USER_POOL_CLIENT_ID", raising=False)
    get_settings.cache_clear()

    response = client.get("/ready")

    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "not_ready"
    assert body["checks"]["auth"] == "missing_config"
    assert body["checks"]["database"] == "missing_config"

    get_settings.cache_clear()


def test_rewrite_returns_assertive_text() -> None:
    response = client.post(
        "/v1/coach/rewrite",
        json={
            "inputText": "I guess it is fine if you move the deadline again.",
            "relationship": "coworker",
            "tone": "warm-direct",
            "goal": "agree on a final deadline",
            "context": "The project deadline has moved three times.",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert "assertiveText" in body
    assert "My request is: agree on a final deadline." in body["assertiveText"]
    assert "feedbackScore" in body
    assert body["feedbackScore"]["clarity"] >= 80
    assert body["safetyFlags"] == []


def test_rewrite_detects_safety_flags() -> None:
    response = client.post(
        "/v1/coach/rewrite",
        json={
            "inputText": "I am afraid of them and feel unsafe at home.",
            "relationship": "partner",
            "tone": "firm-boundary",
            "goal": "get support",
            "context": "I feel unsafe at home.",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert "personal-safety" in body["safetyFlags"]
    assert "cannot provide a polished message" in body["assertiveText"]


def test_scenarios_can_filter() -> None:
    response = client.get("/v1/scenarios?category=work")

    assert response.status_code == 200
    assert all(item["category"] == "work" for item in response.json())


def test_report_endpoint() -> None:
    response = client.post(
        "/v1/moderation/reports",
        json={"subjectType": "coach_message", "subjectId": "rewrite-1", "reason": "Needs review"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "open"


def test_onboarding_and_assessment() -> None:
    onboarding = client.post(
        "/v1/onboarding",
        json={
            "ageRange": "18-plus",
            "consentAccepted": True,
            "goals": ["boundaries", "workplace-confidence"],
            "privacyControls": {
                "savePracticeHistory": True,
                "allowPersonalizedRecommendations": True,
                "allowDeidentifiedProductAnalytics": False,
            },
            "accessibility": {
                "captions": True,
                "reducedMotion": True,
                "adjustableType": "large",
            },
        },
    )

    assert onboarding.status_code == 200
    assert onboarding.json()["completed"] is True

    assessment = client.post(
        "/v1/assessment/baseline",
        json={
            "answers": [
                {"questionId": "ask-directly", "value": 3},
                {"questionId": "stay-kind", "value": 4},
                {"questionId": "hold-boundary", "value": 2},
                {"questionId": "regulate", "value": 3},
            ]
        },
    )

    assert assessment.status_code == 200
    assert assessment.json()["style"] == "accommodating"


def test_lessons_roleplay_and_privacy() -> None:
    lessons = client.get("/v1/lessons")

    assert lessons.status_code == 200
    assert len(lessons.json()) >= 3

    roleplay = client.post(
        "/v1/role-play",
        json={
            "scenarioId": "scenario-deadline",
            "userMessage": "I need one final deadline so I can plan my work.",
            "mode": "text",
        },
    )

    assert roleplay.status_code == 200
    assert roleplay.json()["voiceEnabled"] is False
    assert roleplay.json()["score"]["boundarySpecificity"] >= 80

    export = client.post("/v1/privacy/export")
    deletion = client.post(
        "/v1/privacy/delete",
        json={"deletePracticeHistory": True, "deleteAssessment": True, "deleteAccount": False},
    )

    assert export.status_code == 200
    assert "coachSessions" in export.json()["includes"]
    assert deletion.status_code == 200
    assert deletion.json()["status"] == "queued"


def test_privacy_safe_analytics_endpoint() -> None:
    response = client.post(
        "/v1/analytics/events",
        json={
            "name": "coach_rewrite_requested",
            "source": "web",
            "properties": {
                "surface": "coach",
                "goalCount": 2,
                "safetyFlagCount": 0,
                "scoreBucket": "high",
            },
        },
    )

    assert response.status_code == 200
    assert response.json()["accepted"] is True


def test_demo_journey_persists_progress_and_privacy_deletion() -> None:
    onboarding = client.post(
        "/v1/onboarding",
        json={
            "ageRange": "18-plus",
            "consentAccepted": True,
            "goals": ["boundaries", "workplace-confidence"],
            "privacyControls": {
                "savePracticeHistory": True,
                "allowPersonalizedRecommendations": True,
                "allowDeidentifiedProductAnalytics": False,
            },
            "accessibility": {
                "captions": True,
                "reducedMotion": False,
                "adjustableType": "standard",
            },
        },
    )
    assert onboarding.status_code == 200

    assessment = client.post(
        "/v1/assessment/baseline",
        json={
            "answers": [
                {"questionId": "ask-directly", "value": 3},
                {"questionId": "stay-kind", "value": 4},
                {"questionId": "hold-boundary", "value": 2},
                {"questionId": "regulate", "value": 3},
            ]
        },
    )
    assert assessment.status_code == 200

    rewrite = client.post(
        "/v1/coach/rewrite",
        json={
            "inputText": "I guess it is okay if you keep changing the deadline.",
            "relationship": "coworker",
            "tone": "warm-direct",
            "goal": "agree on a final deadline",
            "context": "The project deadline has moved three times.",
        },
    )
    assert rewrite.status_code == 200

    roleplay = client.post(
        "/v1/role-play",
        json={
            "scenarioId": "scenario-deadline",
            "userMessage": "I need one final deadline so I can plan my work.",
            "mode": "text",
        },
    )
    assert roleplay.status_code == 200

    progress = client.get("/v1/progress")
    assert progress.status_code == 200
    assert progress.json()["rewritesThisWeek"] == 1
    assert progress.json()["savedPhrases"] == 1
    assert progress.json()["streakDays"] == 1

    export = client.post("/v1/privacy/export")
    assert export.status_code == 200
    assert "rolePlaySessions" in export.json()["includes"]

    deletion = client.post(
        "/v1/privacy/delete",
        json={"deletePracticeHistory": True, "deleteAssessment": True, "deleteAccount": False},
    )
    assert deletion.status_code == 200
    assert deletion.json()["status"] == "queued"

    progress_after_delete = client.get("/v1/progress")
    assert progress_after_delete.status_code == 200
    assert progress_after_delete.json()["rewritesThisWeek"] == 0
    assert progress_after_delete.json()["savedPhrases"] == 0
