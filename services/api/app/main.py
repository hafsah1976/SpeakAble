from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.routers import (
    admin,
    analytics,
    assessment,
    coach,
    lessons,
    moderation,
    onboarding,
    privacy,
    progress,
    recommendations,
    role_play,
    scenarios,
)


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="SpeakAble API",
        version="0.1.0",
        description="Coaching, practice, progress, and moderation API for SpeakAble.",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "The request could not be processed.",
                    "details": {"errors": exc.errors()},
                }
            },
        )

    @app.get("/health", tags=["health"])
    async def health() -> dict[str, str]:
        return {"status": "ok", "service": "speakable-api", "version": "0.1.0"}

    app.include_router(coach.router, prefix="/v1")
    app.include_router(onboarding.router, prefix="/v1")
    app.include_router(assessment.router, prefix="/v1")
    app.include_router(lessons.router, prefix="/v1")
    app.include_router(role_play.router, prefix="/v1")
    app.include_router(scenarios.router, prefix="/v1")
    app.include_router(progress.router, prefix="/v1")
    app.include_router(recommendations.router, prefix="/v1")
    app.include_router(privacy.router, prefix="/v1")
    app.include_router(analytics.router, prefix="/v1")
    app.include_router(moderation.router, prefix="/v1")
    app.include_router(admin.router, prefix="/v1")

    return app


app = create_app()
