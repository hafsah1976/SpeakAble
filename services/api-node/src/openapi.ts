export function buildOpenApiDocument() {
  return {
    openapi: "3.1.0",
    info: {
      title: "SpeakAble API",
      version: "0.1.0",
      description: "Coaching, practice, progress, privacy, and moderation API for SpeakAble."
    },
    paths: {
      "/health": { get: { summary: "Health check", responses: { "200": { description: "OK" } } } },
      "/ready": { get: { summary: "Readiness check", responses: { "200": { description: "Ready" } } } },
      "/v1/onboarding": { post: { summary: "Save onboarding and privacy controls" } },
      "/v1/assessment/baseline": { post: { summary: "Submit baseline communication assessment" } },
      "/v1/coach/rewrite": { post: { summary: "Rewrite a message into polite assertive language" } },
      "/v1/scenarios": { get: { summary: "List role-play scenarios" } },
      "/v1/progress": { get: { summary: "Get user progress summary" } },
      "/v1/lessons": { get: { summary: "List guided lessons" } },
      "/v1/role-play": { post: { summary: "Run text-first role-play feedback" } },
      "/v1/recommendations": { get: { summary: "Get personalized recommendations" } },
      "/v1/moderation/reports": { post: { summary: "Submit a moderation report" } },
      "/v1/privacy/export": { post: { summary: "Prepare a privacy export" } },
      "/v1/privacy/delete": { post: { summary: "Queue privacy deletion" } },
      "/v1/analytics/events": { post: { summary: "Accept privacy-safe analytics events" } }
    }
  };
}
