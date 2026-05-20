# SpeakAble Submission Checklist

Use this when the review deadline is today.

## Fastest Hosted Demo

Deploy the web app on Vercel with a clearly labeled demo mode:

- Framework: Next.js
- Install command: `npm ci`
- Build command: `npm --workspace @speakable/web run build`
- Output directory: `apps/web/.next`

Set these Vercel environment variables:

```text
NEXT_PUBLIC_ENABLE_SUBMISSION_DEMO=true
NEXT_PUBLIC_ALLOW_LOCAL_DEMO_FALLBACK=false
NEXT_PUBLIC_API_URL=
```

This makes the hosted app usable without AWS resources. The UI labels the state
as `Submission demo`, uses deterministic local coaching logic, and does not
claim production AWS auth/database persistence is live.

## Full AWS Live Path

Create these resources before calling the app fully live:

1. AWS Cognito user pool with email sign-up and a public web/mobile app client.
2. AWS RDS PostgreSQL database with `pgcrypto` and `pgvector` enabled.
3. AWS ECR repository for the FastAPI Docker image.
4. AWS App Runner service using the ECR image and port `8000`.
5. Vercel project connected to the GitHub repo.
6. Expo/EAS project for mobile builds.

Required GitHub secrets:

```text
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
AWS_ECR_REPOSITORY
AWS_APP_RUNNER_SERVICE_ARN
AWS_DATABASE_URL
EXPO_TOKEN
```

Required production app env vars:

```text
NEXT_PUBLIC_AWS_REGION
NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID
NEXT_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID
NEXT_PUBLIC_API_URL
EXPO_PUBLIC_AWS_REGION
EXPO_PUBLIC_AWS_COGNITO_USER_POOL_ID
EXPO_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID
EXPO_PUBLIC_API_URL
AUTH_PROVIDER=cognito
REQUIRE_AUTH=true
DATABASE_URL
VOICE_ROLE_PLAY_ENABLED=false
EXTERNAL_SHARING_ENABLED=false
```

Run after resources exist:

```bash
npm run db:migrate
npm run db:seed
```

Use seed data only for demo/non-production targets.

## Reviewer Demo Script

1. Open the hosted web app.
2. Confirm the account badge says `Submission demo` or sign in with Cognito if AWS is configured.
3. Save onboarding with the 18+ age gate and consent checked.
4. Update the baseline assessment.
5. Generate an assertive rewrite from the sample deadline message.
6. Run the text role-play.
7. Prepare privacy export.
8. Queue deletion.
9. Point reviewers to `docs/06-risk-register.md` for safety/privacy/moderation coverage.
