# SpeakAble

SpeakAble is a greenfield coaching app for people who want to express needs, boundaries, and feedback with clarity and warmth. The first production slice includes a Next.js web app, an Expo mobile app, a FastAPI service, shared TypeScript types, shared design tokens, Supabase Postgres schema with RLS, and CI/deployment scaffolding.

## Monorepo

```text
apps/
  mobile/          Expo React Native app
  web/             Next.js App Router app
packages/
  types/           Shared TypeScript contracts and API client
  ui/              Shared design tokens
services/
  api/             FastAPI coaching and moderation API
database/
  migrations/      Supabase SQL migrations and RLS policies
infra/
  render/          Example API deployment config
.github/
  workflows/       CI
docs/              Architecture, schema, API, test, deployment, and risk plans
```

## Quick Start

```bash
npm install
python -m pip install -e services/api[dev]
npm run dev:web
npm run dev:api
```

PowerShell users may need `npm.cmd` instead of `npm` if script execution policy blocks `npm.ps1`.

## Environment

Copy `.env.example` to the environment files used by each app:

- `apps/web/.env.local`
- `apps/mobile/.env`
- `services/api/.env`

Supabase Auth is the shared identity provider for web, mobile, and API authorization. The local app can render without Supabase keys, but production should set every required variable and enable `REQUIRE_AUTH=true` for the API.

Local demo fallback is explicitly development-only. Keep `NEXT_PUBLIC_ALLOW_LOCAL_DEMO_FALLBACK=false` in production, leave `EXPO_PUBLIC_ALLOW_LOCAL_DEMO_FALLBACK=false` unless testing mobile without an API, and set `EXTERNAL_SHARING_ENABLED=false` until the sharing workflow has a moderation review.

The web and mobile apps include visible sign-up, sign-in, sign-out, and protected-session states. If Supabase public keys are missing, web can still run in development demo mode; production waits for Supabase credentials instead of silently using mock auth.

## Local Setup

```bash
npm ci
python -m pip install -e "services/api[dev]"
npx playwright install chromium
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env
cp services/api/.env.example services/api/.env
```

Start local services:

```bash
npm run dev:api
npm run dev:web
npm run dev:mobile
```

Run Supabase locally:

```bash
supabase start
supabase db reset
```

Supabase-compatible migrations live in `supabase/migrations`; the same migration is also kept under `database/migrations` with the broader database planning artifacts.

The seed script creates demo scenarios, lessons, recommendations, reports, and demo auth users:

- `alex@example.test`
- `sam@example.test`
- `moderator@example.test`

All demo passwords are `Password123!`.

## Quality Gates

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run test:e2e
npm --workspace @speakable/web run build
npm run openapi
```

## Production Deployment

GitHub Actions is configured with two workflows:

- `CI` runs linting, typechecking, unit tests, integration tests, Playwright e2e tests, build, and OpenAPI drift checks.
- `Deploy` runs Vercel, Render, Supabase, and EAS deployment jobs. Jobs skip cleanly until their provider secrets are configured.

The mobile deployment job intentionally uses `expo/expo-github-action@v8`, which is the current resolvable Expo GitHub Action wrapper. It still installs the latest EAS CLI through `eas-version: latest`.

Required GitHub repository secrets for full production deployment:

- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- `RENDER_DEPLOY_HOOK_URL`
- `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`
- `EXPO_TOKEN`
- Optional: `EAS_SUBMIT_ON_DEPLOY=true` to submit mobile builds after EAS production builds start.

Web on Vercel:

1. Create a Vercel project rooted at the repository root.
2. Set the build command to `npm --workspace @speakable/web run build`.
3. Set the output directory to `apps/web/.next`.
4. Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_API_URL`.
5. Set `NEXT_PUBLIC_ALLOW_LOCAL_DEMO_FALLBACK=false` for production.

API on Render:

1. Use `infra/render/render.yaml`.
2. Set `REQUIRE_AUTH=true`.
3. Configure `API_CORS_ORIGINS`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VOICE_ROLE_PLAY_ENABLED=false`, and `EXTERNAL_SHARING_ENABLED=false`.
4. Deploy with the Dockerfile at `services/api/Dockerfile`.

Supabase:

1. Link the project with `supabase link --project-ref <project-ref>`.
2. Apply migrations with `supabase db push`.
3. For non-production demo data, run `database/seed.sql` against the target database intentionally.
4. Push config with `supabase config push` after reviewing auth redirect URLs.

Mobile with EAS:

1. Configure `apps/mobile/eas.json`.
2. Set Expo secrets for `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and `EXPO_PUBLIC_API_URL`.
3. Set `EXPO_PUBLIC_ALLOW_LOCAL_DEMO_FALLBACK=false`; Supabase mobile sessions are stored through `expo-secure-store`.
4. Build with `eas build --platform all --profile production`.
5. Submit with `eas submit --platform all --profile production`.

## Planning Artifacts

- [System Architecture](docs/01-system-architecture.md)
- [Repo Structure](docs/02-repo-structure.md)
- [Database Schema](docs/03-database-schema.md)
- [API Contract](docs/04-api-contract.md)
- [Testing and Deployment](docs/05-testing-deployment.md)
- [Risk Register](docs/06-risk-register.md)
- [Final Implementation Report](docs/final-implementation-report.md)
