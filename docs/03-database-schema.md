# Database Schema Plan

Supabase Postgres is the system of record. The schema uses `auth.users` for identity, public application tables for user data, pgvector for future semantic scenario matching, and RLS for per-user isolation.

## Extensions

- `pgcrypto` for UUID generation.
- `vector` for embeddings.

## Tables

### `profiles`

Application profile linked to `auth.users`.

- `id uuid primary key references auth.users(id)`
- `display_name text`
- `role text check in ('member', 'moderator', 'admin')`
- `communication_goal text`
- `age_range text`
- `consent_accepted_at timestamptz`
- `goals text[]`
- `privacy_controls jsonb`
- `accessibility_preferences jsonb`
- timestamps

### `communication_assessments`

Baseline communication-style assessment.

- `id uuid primary key`
- `user_id uuid references auth.users(id)`
- `answers jsonb`
- `style text`
- `score jsonb`
- `recommended_lesson_ids text[]`
- `created_at timestamptz`

### `lessons` and `lesson_progress`

Curated lesson content and per-user completion state.

- `lessons`: title, objective, examples, exercises, estimated minutes
- `lesson_progress`: user, lesson, status, completion timestamp

### `coach_sessions`

One user coaching interaction.

- `id uuid primary key`
- `user_id uuid references auth.users(id)`
- `title text`
- `relationship text`
- `tone text`
- `goal text`
- `status text check in ('draft', 'completed', 'deleted')`
- timestamps

### `coach_messages`

Sensitive user inputs and generated rewrites. Retention should be user-controlled.

- `id uuid primary key`
- `session_id uuid references coach_sessions(id)`
- `user_id uuid references auth.users(id)`
- `input_text text`
- `rewritten_text text`
- `coaching_notes jsonb`
- `safety_flags text[]`
- `user_rating int`
- `retention_expires_at timestamptz`
- timestamps

### `practice_scenarios`

Curated practice prompts.

- `id uuid primary key`
- `slug text unique`
- `title text`
- `description text`
- `difficulty text`
- `category text`
- `prompt text`
- `embedding vector(1536)`
- timestamps

### `practice_attempts`

User attempts against curated or generated scenarios.

- `id uuid primary key`
- `user_id uuid references auth.users(id)`
- `scenario_id uuid references practice_scenarios(id)`
- `draft_text text`
- `score jsonb`
- timestamps

### `role_play_sessions` and `role_play_turns`

Text-first simulations, with voice behind a feature flag.

- `role_play_sessions`: user, scenario, mode, voice flag
- `role_play_turns`: user message, coach reply, captions, score, safety flags

### `feedback_scores`

Structured scoring for rewrites, attempts, and role-play turns.

- clarity
- politeness
- assertiveness
- empathy
- boundary specificity
- emotional regulation

### `user_recommendations`

Personalized next actions generated from assessment, progress, and scoring trends.

### `privacy_requests`

Export and deletion workflow queue.

- `request_type`
- `status`
- `requested_payload`
- `export_storage_key`
- completion timestamps

### `moderation_reports`

User and system reports for harmful, unsafe, or policy-violating content.

- `id uuid primary key`
- `reporter_id uuid references auth.users(id)`
- `subject_type text`
- `subject_id uuid`
- `reason text`
- `details text`
- `status text check in ('open', 'triaged', 'resolved', 'dismissed')`
- `reviewer_id uuid references auth.users(id)`
- timestamps

### `audit_logs`

Immutable log of privileged operations.

- `id uuid primary key`
- `actor_id uuid references auth.users(id)`
- `action text`
- `target_type text`
- `target_id uuid`
- `metadata jsonb`
- `created_at timestamptz`

## RLS Model

- Users can read and update their own `profiles`.
- Users can CRUD only their own sessions, messages, and attempts.
- Users can manage only their own onboarding preferences, assessments, lesson progress, role-play turns, feedback scores, recommendations, and privacy requests.
- Users can create reports and read their own reports.
- Moderators and admins can read reports and moderate subjects.
- Admins can read audit logs.
- Service role bypass remains server-only for maintenance jobs.

## Indexing

- `coach_sessions(user_id, created_at desc)`
- `coach_messages(user_id, created_at desc)`
- `practice_attempts(user_id, created_at desc)`
- `moderation_reports(status, created_at desc)`
- `practice_scenarios using ivfflat (embedding vector_cosine_ops)` after enough rows exist

## Retention

- Default retention can be short, for example 30 days for raw inputs.
- Saved practice items remain until user deletion.
- Reports and audit logs follow policy-defined retention.
- Deletion jobs should scrub raw text first, then remove orphaned records.
