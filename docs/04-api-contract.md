# API Contract Plan

Base path: `/v1`

All authenticated endpoints accept:

```http
Authorization: Bearer <aws_cognito_access_token>
Content-Type: application/json
```

Unauthenticated local development is allowed only when `REQUIRE_AUTH=false`.

## Error Shape

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request could not be processed.",
    "details": {}
  }
}
```

## Endpoints

- `POST /v1/onboarding`: stores age gate result, consent, goals, privacy controls, and accessibility preferences.
- `GET /v1/assessment/baseline/questions`: returns baseline communication-style questions.
- `POST /v1/assessment/baseline`: scores the baseline assessment and returns style, six-dimension score, and recommended lessons.
- `POST /v1/coach/rewrite`: creates a polite, assertive rewrite after input/output moderation.
- `GET /v1/scenarios`: returns curated practice scenarios.
- `POST /v1/practice-attempts`: stores a user attempt and returns coaching feedback.
- `GET /v1/lessons`: returns guided lessons.
- `POST /v1/role-play`: runs a text role-play turn; voice remains feature-flagged.
- `GET /v1/progress`: returns recent practice metrics and streak information.
- `GET /v1/recommendations`: returns personalized next actions.
- `POST /v1/privacy/export`: queues or returns a JSON export descriptor.
- `POST /v1/privacy/delete`: queues deletion of practice, assessment, or account data.
- `POST /v1/moderation/reports`: creates a content/safety report.
- `GET /v1/admin/moderation/reports`: moderator/admin report queue.
- `PATCH /v1/admin/moderation/reports/{id}`: moderator/admin report update.

## Contract Rules

- API never accepts `userId` from the client for ownership-sensitive mutations.
- Auth failures use `401`; permission failures use `403`.
- Rate limits should be applied to rewrite, role-play, and report endpoints.
- Coaching responses must include structured notes and safety flags.
- Unsafe input or generated output is blocked before display.
- Production clients must configure `NEXT_PUBLIC_API_URL` or `EXPO_PUBLIC_API_URL`; local demo fallback is development-only.
