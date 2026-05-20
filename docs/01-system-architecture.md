# System Architecture Plan

SpeakAble is a privacy-conscious coaching product with AWS Cognito identity,
typed web and mobile clients, a FastAPI application service, and AWS RDS
PostgreSQL as the source of truth.

## Goals

- Help users convert vague, apologetic, aggressive, or avoidant wording into polite, assertive communication.
- Guide users through onboarding, consent, privacy controls, goal selection, assessment, lessons, role-play, and progress.
- Minimize sensitive text retention and make export/deletion self-serve.
- Keep model calls behind provider interfaces and validate structured JSON feedback.
- Support web and mobile from the first production slice.

## High-Level Components

```text
Expo Mobile App         Next.js Web App
      |                       |
      | AWS Cognito JWT       |
      v                       v
        FastAPI Application Service
          | Cognito JWT verification
          | coaching orchestration
          | safety and moderation checks
          | progress and scenario APIs
          v
        AWS RDS PostgreSQL
          | RLS policies
          | pgvector scenario/rewrite search
          | audit logs
          v
        AWS App Runner, ECR, S3-ready export storage, and managed backups
```

## Runtime Responsibilities

- `apps/web`: Next.js App Router UI, authenticated dashboard, coaching interactions, and responsive web layout.
- `apps/mobile`: Expo React Native app for the same core coaching flow with mobile-first ergonomics.
- `services/api`: FastAPI service for auth verification, onboarding, assessment, lessons, role-play, scoring, recommendations, privacy, reports, and moderation.
- `packages/types`: Shared TypeScript request/response contracts and API client helpers.
- `packages/ui`: Shared design tokens used by web and mobile implementations.
- `database`: Postgres migrations, extensions, RLS policies, indexes, and seed content.
- `infra/aws`: Cognito, RDS, and App Runner deployment documentation.

## Data Flow

1. User authenticates through AWS Cognito on web or mobile.
2. Client sends a Cognito access token to FastAPI.
3. API verifies the token with Cognito JWKS, checks rate limits, and applies input safety checks.
4. Coaching service produces structured feedback through the provider interface.
5. API scores clarity, politeness, assertiveness, empathy, boundary specificity, and emotional regulation.
6. API stores the practice item, moderation outcome, progress metadata, and privacy-safe analytics when retention is enabled.
7. Client renders only moderated output.
8. User can save, rate, export, delete, or report the result.

## Security Boundaries

- AWS Cognito owns identity.
- FastAPI validates JWTs and never trusts client-supplied user IDs.
- Postgres RLS enforces per-user data access through application-set session variables.
- Raw user text is treated as sensitive data and excluded from logs.
- Admin routes require moderator/admin groups.
- Web and mobile demo fallbacks are explicit development-only flags.
- Expo stores Cognito tokens through SecureStore-backed Amplify storage.
