# SpeakAble

SpeakAble is a greenfield coaching app for people who want to express needs,
boundaries, and feedback with clarity and warmth. The production slice includes
a Next.js web app, an Expo mobile app, a MERN-style Node/Express API, shared
TypeScript contracts, shared design tokens, Cognito-compatible JWT auth,
MongoDB persistence, and CI/CD scaffolding.

## Monorepo

```text
apps/
  mobile/          Expo React Native app
  web/             Next.js App Router app
packages/
  types/           Shared TypeScript contracts and API client
  ui/              Shared design tokens
services/
  api-node/        Express/Mongo coaching and moderation API
  api/             Legacy FastAPI coaching and moderation API
database/
  migrations/      Legacy AWS RDS/Postgres SQL migrations and RLS policies
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
- `services/api-node/.env`
- `database/.env`

AWS Cognito is the shared identity provider for web, mobile, and API
authorization. Local development can render without Cognito keys through the
explicit demo fallback, but production should set Cognito variables, set
`AUTH_REQUIRED=true`, configure `AUTH_ISSUER` and `AUTH_AUDIENCE`, and set
`NEXT_PUBLIC_ALLOW_LOCAL_DEMO_FALLBACK=false`.
For a time-boxed review, `NEXT_PUBLIC_ENABLE_SUBMISSION_DEMO=true` enables a
clearly labeled hosted demo without pretending AWS production auth is live.

The mobile app stores Cognito tokens through a SecureStore-backed Amplify token
storage adapter. Keep `VOICE_ROLE_PLAY_ENABLED=false` and
`EXTERNAL_SHARING_ENABLED=false` until those flows pass safety review.

## Local Setup

```bash
npm ci
npx playwright install chromium
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env
cp services/api-node/.env.example services/api-node/.env
cp database/.env.example database/.env
```

Start local services:

```bash
npm run dev:api
npm run dev:web
npm run dev:mobile
```

The Node API defaults to `DATA_STORE=memory` so it runs immediately for local
development. For MongoDB persistence, set `DATA_STORE=mongo` and `MONGODB_URI`.
Seed the Mongo demo state with `npm --workspace @speakable/api run seed`.

Run legacy Postgres migrations only when maintaining the old FastAPI/Postgres
path:

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
npm --workspace @speakable/api run build
npm --workspace @speakable/web run build
npm run openapi
```

## Production Deployment

GitHub Actions has two workflows:

- `CI` runs linting, typechecking, unit tests, integration tests, Playwright e2e
  tests, web build, and OpenAPI drift checks.
- `Deploy` runs web deploy, API deploy, and EAS mobile builds. Jobs skip
  cleanly until matching secrets are configured.

Required GitHub repository secrets for full deployment:

- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
- `AWS_ECR_REPOSITORY`, `AWS_APP_RUNNER_SERVICE_ARN`, `AWS_DATABASE_URL`
- `EXPO_TOKEN`
- Optional: `EAS_SUBMIT_ON_DEPLOY=true`

Web on Netlify:

Production demo: https://speakable-app.netlify.app/

1. Add a new Netlify site from the GitHub repo.
2. Use the root `netlify.toml`.
3. Confirm the build command is `npm ci && npm --workspace @speakable/web run build`.
4. Confirm the publish directory is `apps/web/out`.
5. Use `NEXT_PRIVATE_TARGET=netlify-static` for static export on Netlify.
6. Set `NEXT_PUBLIC_ENABLE_SUBMISSION_DEMO=false` and point
   `NEXT_PUBLIC_API_URL` at the live Node API URL for production.

Web on Vercel:

1. Create a Vercel project rooted at the repository root.
2. Set the build command to `npm --workspace @speakable/web run build`.
3. Set the output directory to `apps/web/.next`.
4. Configure `NEXT_PUBLIC_AWS_REGION`,
   `NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID`,
   `NEXT_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID`, and `NEXT_PUBLIC_API_URL`.
5. Set `NEXT_PUBLIC_ALLOW_LOCAL_DEMO_FALLBACK=false`.

MERN API:

1. Deploy `services/api-node` to a Node host such as Render, Fly.io, Railway,
   or AWS App Runner.
2. Set `DATA_STORE=mongo` and `MONGODB_URI` to a production MongoDB database.
3. Set `AUTH_REQUIRED=true`, `AUTH_ISSUER`, and `AUTH_AUDIENCE` to match the
   identity provider used by web and mobile.
4. Keep `VOICE_ROLE_PLAY_ENABLED=false` and `EXTERNAL_SHARING_ENABLED=false`
   until those surfaces pass safety review.
5. Verify `/health`, `/ready`, and `/openapi.json`.
6. Point `NEXT_PUBLIC_API_URL` and `EXPO_PUBLIC_API_URL` to the deployed Node
   API.

Legacy API on AWS Lambda/API Gateway:

1. Build `services/api/Dockerfile.lambda` and push to ECR repo
   `speakable-api-lambda`.
2. Run Lambda function `speakable-api` in the default VPC with security group
   `sg-0990408ed92f67a4d`.
3. Expose it through HTTP API Gateway `speakable-api-http`.
4. Set `TRUST_GATEWAY_AUTH=true` so FastAPI trusts API Gateway JWT authorizer
   claims.
5. Production API URL:
   `https://cl539orkch.execute-api.us-east-1.amazonaws.com`.

API on AWS App Runner:

1. Create an ECR repository and an App Runner service for `services/api/Dockerfile`.
2. Configure API env vars from `services/api/.env.example`.
3. Set `REQUIRE_AUTH=true`, `AUTH_PROVIDER=cognito`, and `DATABASE_URL`.
4. Push to `main` or run the `Deploy` workflow.
5. Verify `/health` for platform health and `/ready` for Cognito/database readiness.
6. App Runner is optional after launch; the current live API uses Lambda/API
   Gateway because App Runner requires account enablement.

AWS production preflight:

```powershell
powershell -ExecutionPolicy Bypass -File infra/aws/preflight.ps1
```

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
