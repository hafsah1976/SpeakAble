# SpeakAble

SpeakAble is a greenfield coaching app for people who want to express needs,
boundaries, and feedback with clarity and warmth. The production slice includes
a Next.js web app, an Expo mobile app, a FastAPI service, shared TypeScript
contracts, shared design tokens, AWS Cognito auth, AWS RDS PostgreSQL with RLS
and `pgvector`, and CI/CD scaffolding.

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
  migrations/      AWS RDS/Postgres SQL migrations and RLS policies
  scripts/         Cross-platform migration runner
infra/
  aws/             Cognito, RDS, and App Runner deployment notes
.github/
  workflows/       CI and deployment automation
docs/              Architecture, schema, API, test, deployment, and risk plans
```

## Quick Start

```bash
npm ci
python -m pip install -e "services/api[dev]"
npx playwright install chromium
npm run dev:api
npm run dev:web
```

PowerShell users may need `npm.cmd` instead of `npm` if script execution policy
blocks `npm.ps1`.

## Environment

Copy the templates before running production-like flows:

- `apps/web/.env.local`
- `apps/mobile/.env`
- `services/api/.env`
- `database/.env`

AWS Cognito is the shared identity provider for web, mobile, and API
authorization. Local development can render without Cognito keys through the
explicit demo fallback, but production should set Cognito variables, set
`REQUIRE_AUTH=true`, and set `NEXT_PUBLIC_ALLOW_LOCAL_DEMO_FALLBACK=false`.
For a time-boxed review, `NEXT_PUBLIC_ENABLE_SUBMISSION_DEMO=true` enables a
clearly labeled hosted demo without pretending AWS production auth is live.

The mobile app stores Cognito tokens through a SecureStore-backed Amplify token
storage adapter. Keep `VOICE_ROLE_PLAY_ENABLED=false` and
`EXTERNAL_SHARING_ENABLED=false` until those flows pass safety review.

## Local Setup

```bash
npm ci
python -m pip install -e "services/api[dev]"
npx playwright install chromium
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env
cp services/api/.env.example services/api/.env
cp database/.env.example database/.env
```

Start local services:

```bash
npm run dev:api
npm run dev:web
npm run dev:mobile
```

Run database migrations after `DATABASE_URL` points to a local or AWS RDS
Postgres database:

```bash
npm run db:migrate
npm run db:seed
```

Demo Cognito users should be created separately with these emails for end-to-end
auth testing:

- `alex@example.test`
- `sam@example.test`
- `moderator@example.test`

Use `Password123!` for local demo accounts only.

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

GitHub Actions has two workflows:

- `CI` runs linting, typechecking, unit tests, integration tests, Playwright e2e
  tests, web build, and OpenAPI drift checks.
- `Deploy` runs Vercel web deploy, AWS App Runner API deploy, AWS RDS migrations,
  and EAS mobile builds. Jobs skip cleanly until matching secrets are configured.

Required GitHub repository secrets for full deployment:

- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
- `AWS_ECR_REPOSITORY`, `AWS_APP_RUNNER_SERVICE_ARN`, `AWS_DATABASE_URL`
- `EXPO_TOKEN`
- Optional: `EAS_SUBMIT_ON_DEPLOY=true`

Web on Netlify:

1. Add a new Netlify site from the GitHub repo.
2. Use the root `netlify.toml`.
3. Confirm the build command is `npm --workspace @speakable/web run build`.
4. Confirm the publish directory is `apps/web/.next`.
5. For submission mode, keep `NEXT_PUBLIC_ENABLE_SUBMISSION_DEMO=true` until the AWS API/RDS path is live.

Web on Vercel:

1. Create a Vercel project rooted at the repository root.
2. Set the build command to `npm --workspace @speakable/web run build`.
3. Set the output directory to `apps/web/.next`.
4. Configure `NEXT_PUBLIC_AWS_REGION`,
   `NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID`,
   `NEXT_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID`, and `NEXT_PUBLIC_API_URL`.
5. Set `NEXT_PUBLIC_ALLOW_LOCAL_DEMO_FALLBACK=false`.

API on AWS App Runner:

1. Create an ECR repository and an App Runner service for `services/api/Dockerfile`.
2. Configure API env vars from `services/api/.env.example`.
3. Set `REQUIRE_AUTH=true`, `AUTH_PROVIDER=cognito`, and `DATABASE_URL`.
4. Push to `main` or run the `Deploy` workflow.

AWS RDS Postgres:

1. Create an RDS PostgreSQL instance.
2. Ensure `pgcrypto` and `pgvector` can be enabled.
3. Set `AWS_DATABASE_URL` as a GitHub secret and `DATABASE_URL` locally.
4. Run `npm run db:migrate`.
5. Run `npm run db:seed` only for demo/non-production environments.

Mobile with EAS:

1. Configure `apps/mobile/eas.json`.
2. Set Expo secrets for `EXPO_PUBLIC_AWS_REGION`,
   `EXPO_PUBLIC_AWS_COGNITO_USER_POOL_ID`,
   `EXPO_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID`, and `EXPO_PUBLIC_API_URL`.
3. Set `EXPO_PUBLIC_ALLOW_LOCAL_DEMO_FALLBACK=false`.
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
- [Submission Checklist](SUBMISSION.md)
