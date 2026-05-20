# System Architecture Plan

SpeakAble is a privacy-conscious coaching product with shared Supabase Auth, a typed web and mobile client, a FastAPI application service, and Supabase Postgres as the source of truth.

## Goals

- Help users convert vague, apologetic, aggressive, or avoidant wording into polite, assertive communication.
- Guide users through onboarding, consent, privacy controls, goal selection, baseline assessment, lessons, role-play, and progress recommendations.
- Keep sensitive personal text private by default, minimize retention, and make deletion straightforward.
- Support web and mobile from the first architecture slice.
- Leave a controlled path for future model-backed coaching without coupling core product logic to one vendor.

## High-Level Components

```text
Expo Mobile App         Next.js Web App
      |                       |
      | Supabase Auth JWT     |
      v                       v
        FastAPI Application Service
          | auth verification
          | coaching orchestration
          | safety and moderation checks
          | progress and scenario APIs
          v
        Supabase Postgres
          | RLS policies
          | pgvector scenario/rewrite search
          | audit logs
          v
        Supabase Storage, Edge Functions, and managed backups
```

## Runtime Responsibilities

- `apps/web`: App Router UI, authenticated dashboard, client-side coaching interactions, route-level metadata, and responsive desktop/mobile web layout.
- `apps/mobile`: Expo React Native app for the same core coaching flow with mobile-first ergonomics.
- `services/api`: FastAPI service for onboarding, assessment, lessons, role-play, coaching rewrites, scoring, scenario recommendations, progress summaries, privacy workflows, reports, admin review, auth verification, and policy enforcement.
- `packages/types`: Shared TypeScript request/response contracts and API client helpers.
- `packages/ui`: Shared design tokens used by web and mobile implementations.
- `database`: Supabase SQL migrations, extensions, tables, functions, RLS policies, indexes, and seed content.
- `infra`: CI, deployment templates, and environment documentation.

## Data Flow

1. User authenticates through Supabase Auth on web or mobile.
2. Client sends the Supabase access token to the FastAPI service.
3. API verifies token with Supabase, checks rate limits, and applies input safety checks.
4. Coaching service produces a rewrite and structured coaching notes.
5. API scores clarity, politeness, assertiveness, empathy, boundary specificity, and emotional regulation.
6. API stores the practice item, moderation outcome, progress metadata, and analytics-safe event metadata when retention is enabled.
7. Client renders the rewrite, notes, scoring, lessons, role-play prompts, recommendations, and privacy controls.
8. User can save, rate, export, delete, or report the generated result.

## Product Modules

- Onboarding: age gate, consent capture, privacy controls, accessibility preferences, and communication goals.
- Baseline assessment: short self-report style assessment used to personalize lesson recommendations.
- Guided lessons: curated examples and exercises for I statements, boundaries, repair, feedback, and regulation.
- Role-play: text-first simulations; voice remains behind `VOICE_ROLE_PLAY_ENABLED`.
- External sharing: disabled by default and remains behind `EXTERNAL_SHARING_ENABLED`.
- Feedback scoring: six structured dimensions returned for rewrites, practice attempts, and role-play turns.
- Progress: streaks, saved phrases, skill strengths, and personalized recommendations.
- Safety and moderation: user input and generated output filtering, reporting, moderation queue, and audited admin access.
- Privacy center: export and deletion workflows backed by `privacy_requests`.
- Accessibility: captions, keyboard-first controls, screen-reader labels, reduced motion, and adjustable type.

## Coaching Engine

The first implementation includes a deterministic coaching provider so the app is useful in local development and safe to test. Model-backed coaching must be added behind the `CoachModelProvider` interface, and every feedback response must validate against structured JSON schemas before it leaves the API. A future LLM provider can be added with:

- prompt templates reviewed for safety,
- output schema validation,
- redaction before provider calls when possible,
- content moderation before and after generation, with unsafe outputs blocked before display,
- rate limiting and abuse controls,
- model response audit sampling without storing raw sensitive text by default.

## Security Boundaries

- Supabase Auth owns identity.
- FastAPI validates JWTs and never trusts client-supplied user IDs.
- Supabase RLS enforces per-user data access for direct client reads.
- Service role keys are used only server-side.
- Admin routes require an explicit admin role, logged access, and least privilege.
- Raw user text is treated as sensitive data and excluded from logs.
- Web and mobile demo fallbacks are explicit development-only flags; production paths require a configured API.
- Expo stores Supabase session tokens in secure storage.

## Observability

- Structured API logs with request IDs and redaction.
- Health endpoint for uptime checks.
- Error tracking hook points for web, mobile, and API.
- Audit logs for admin access, moderation decisions, deletion requests, and data export.
- Metrics for latency, rewrite acceptance, report rate, safety flag rate, and deletion success.
