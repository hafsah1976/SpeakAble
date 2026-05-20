# API Contract Plan

Base path: `/v1`

All authenticated endpoints accept:

```http
Authorization: Bearer <supabase_access_token>
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

### `POST /v1/onboarding`

Stores age gate result, consent, communication goals, privacy controls, and accessibility preferences.

### `GET /v1/assessment/baseline/questions`

Returns baseline communication-style questions.

### `POST /v1/assessment/baseline`

Scores the baseline assessment and returns style, six-dimension score, and recommended lessons.

### `GET /health`

Returns service health and version.

### `POST /v1/coach/rewrite`

Creates a polite, assertive rewrite.

If the input or generated output is safety-sensitive, the API returns safety flags and replaces display text with a safe blocking message before the client renders it. Feedback payloads are structured JSON, not free-form model prose.

Structured output schema:

```json
{
  "assertiveText": "string",
  "coachingNotes": [{ "label": "string", "detail": "string" }],
  "feedbackScore": {
    "clarity": 0,
    "politeness": 0,
    "assertiveness": 0,
    "empathy": 0,
    "boundarySpecificity": 0,
    "emotionalRegulation": 0
  },
  "suggestedPractice": ["string"]
}
```

Request:

```json
{
  "inputText": "I guess it is fine if you keep moving the deadline.",
  "relationship": "coworker",
  "tone": "warm-direct",
  "goal": "set a boundary",
  "context": "Project deadline has moved three times."
}
```

Response:

```json
{
  "id": "local-123",
  "assertiveText": "I can support one more deadline change, but I need the next date to be final so I can plan my work.",
  "feedbackScore": {
    "clarity": 86,
    "politeness": 88,
    "assertiveness": 84,
    "empathy": 82,
    "boundarySpecificity": 80,
    "emotionalRegulation": 90
  },
  "coachingNotes": [
    {
      "label": "Boundary",
      "detail": "Names what you can do and what you need next."
    }
  ],
  "safetyFlags": [],
  "outputSafetyFlags": [],
  "suggestedPractice": [
    "Say the rewritten version out loud once.",
    "Remove one apologetic phrase from your original draft."
  ],
  "createdAt": "2026-05-19T12:00:00Z"
}
```

### `GET /v1/scenarios`

Returns curated practice scenarios. Optional query params:

- `difficulty`
- `category`
- `limit`

### `POST /v1/practice-attempts`

Stores a user attempt and returns coaching feedback.

### `GET /v1/lessons`

Returns guided lessons with examples and exercises.

### `POST /v1/role-play`

Runs a text role-play turn. If `mode` is `voice`, the API returns `voiceEnabled=false` unless the server feature flag enables voice. Captions are always returned. Safety-sensitive turns are blocked before display.

### `GET /v1/progress`

Returns recent practice metrics and streak information.

### `GET /v1/recommendations`

Returns personalized next actions.

### `POST /v1/privacy/export`

Queues or returns a JSON export descriptor for user data.

### `POST /v1/privacy/delete`

Queues deletion of practice history, assessment data, or account data.

### `POST /v1/moderation/reports`

Creates a report for generated content, user content, or an unsafe situation.

### `GET /v1/admin/moderation/reports`

Moderator/admin only. Lists report queue.

### `PATCH /v1/admin/moderation/reports/{id}`

Moderator/admin only. Updates status and reviewer notes.

## Contract Rules

- API never accepts `userId` from the client for ownership-sensitive mutations.
- Validation errors use `422` with the standard error wrapper where possible.
- Auth failures use `401`; permission failures use `403`.
- Rate limits should be applied to rewrite and report endpoints.
- Coaching responses must include structured notes and safety flags, not just prose.
- Production clients must configure `NEXT_PUBLIC_API_URL` or `EXPO_PUBLIC_API_URL`; local demo fallback is development-only and explicitly flag-gated.
