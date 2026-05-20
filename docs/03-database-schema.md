# Database Schema Plan

AWS RDS PostgreSQL is the system of record. AWS Cognito owns authentication;
the application stores Cognito subjects in `app_users` and uses Postgres RLS
for user-owned data.

## Extensions

- `pgcrypto` for UUID generation.
- `vector` for embeddings and future semantic recommendation matching.

## Core Tables

- `app_users`: Cognito user subject, email, and app role.
- `profiles`: age gate outcome, goals, consent timestamp, privacy controls, and accessibility preferences.
- `communication_assessments`: baseline answers, style label, scores, and recommended lessons.
- `lessons` and `lesson_progress`: curriculum content and per-user completion state.
- `coach_sessions` and `coach_messages`: coaching rewrites with user-controlled raw text retention.
- `practice_scenarios` and `practice_attempts`: guided scenarios and draft practice scoring.
- `role_play_sessions` and `role_play_turns`: text-first simulations; voice remains feature-flagged.
- `feedback_scores`: clarity, politeness, assertiveness, empathy, boundary specificity, and emotional regulation.
- `user_recommendations`: personalized next actions.
- `privacy_requests`: export and deletion workflow queue.
- `moderation_reports`: user/system reports for unsafe or policy-violating content.
- `audit_logs`: privileged operation trail.

## RLS Model

- FastAPI sets `app.current_user_id` and `app.current_user_role` per database transaction.
- Users can read/update only their own profile and user-owned practice data.
- Authenticated users can read static scenarios and lessons.
- Users can create and read their own reports.
- Moderators/admins can read moderation queues.
- Admins can read audit logs and manage static content.

## Indexing

- `coach_sessions(user_id, created_at desc)`
- `coach_messages(user_id, created_at desc)`
- `practice_attempts(user_id, created_at desc)`
- `role_play_turns(user_id, created_at desc)`
- `moderation_reports(status, created_at desc)`
- `practice_scenarios using ivfflat (embedding vector_cosine_ops)`

## Retention

- Default raw-text retention should be short and controlled by privacy settings.
- Saved practice items remain until user deletion.
- Reports and audit logs follow policy-defined retention.
- Deletion jobs should scrub raw text first, then remove or anonymize remaining user-owned records.
