# AGENTS.md

This repository is a greenfield monorepo for SpeakAble.

## Setup

Install JavaScript dependencies:

```bash
npm ci
```

Install Playwright Chromium for e2e tests:

```bash
npx playwright install chromium
```

Copy environment templates:

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env
cp services/api-node/.env.example services/api-node/.env
cp database/.env.example database/.env
```

On Windows PowerShell, use `Copy-Item` instead of `cp` if needed.

## Run Locally

Run the web app:

```bash
npm run dev:web
```

Run the API:

```bash
npm run dev:api
```

Run the legacy Python API only when explicitly needed:

```bash
npm run dev:api:python
```

Run the mobile app:

```bash
npm run dev:mobile
```

Run Mongo-backed API locally by setting `DATA_STORE=mongo` and `MONGODB_URI`.
The default `DATA_STORE=memory` is for local development and tests.

Run legacy AWS RDS/Postgres migrations and seed data only when maintaining the
old Python/Postgres path:

```bash
npm run db:migrate
npm run db:seed
```

Generate OpenAPI docs:

```bash
npm run openapi
```

## Lint

```bash
npm run lint
```

## Typecheck

```bash
npm run typecheck
```

## Test

Run all configured tests:

```bash
npm test
```

Run API unit tests:

```bash
npm run test:unit
```

Run API integration tests:

```bash
npm run test:integration
```

Run web end-to-end tests:

```bash
npm run test:e2e
```

## Build

```bash
npm run build
```

## Notes For Agents

- Do not log raw user coaching text, role-play text, assessment answers, or exported user data.
- Analytics event names must stay privacy-safe and must not include free-form user text.
- The default backend is `services/api-node` using Express and MongoDB.
- Keep backend/provider/platform notes out of user-facing UI copy and API error messages.
- Keep voice role-play behind `VOICE_ROLE_PLAY_ENABLED`.
- Keep external sharing behind `EXTERNAL_SHARING_ENABLED`.
- Keep local demo fallback disabled in production; use `NEXT_PUBLIC_ALLOW_LOCAL_DEMO_FALLBACK=true` only for development without an API.
- Store Expo/AWS Cognito mobile auth sessions through secure device storage.
- Treat MongoDB user documents as user-owned records; API auth checks are the production boundary.
- If `npm` is blocked by PowerShell execution policy, use `npm.cmd`.
