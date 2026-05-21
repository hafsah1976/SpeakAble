# SpeakAble Submission Checklist

Use this when the review deadline is today.

## Hosted App: Netlify

Stable production URL: https://speakable-app.netlify.app/

Deploy the web app on Netlify with the AWS API URL configured. The repo has a
root `netlify.toml`, so Netlify can detect the build settings automatically.

In Netlify:

1. Add new site from Git.
2. Choose `hafsah1976/SpeakAble`.
3. Leave build settings from `netlify.toml` unless Netlify asks you to confirm them.
4. Deploy.

Expected build settings:

- Base directory: repository root
- Build command: `npm ci && npm --workspace @speakable/web run build`
- Publish directory: `apps/web/out`

The `netlify.toml` file sets:

```text
NEXT_PRIVATE_TARGET=netlify-static
NEXT_PUBLIC_ENABLE_SUBMISSION_DEMO=false
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID=us-east-1_Elr16XsoJ
NEXT_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID=737qee90btb50j0cks8mk1qu40
NEXT_PUBLIC_API_URL=https://cl539orkch.execute-api.us-east-1.amazonaws.com
```

This makes the hosted app use Cognito plus the live AWS API/RDS path. For
Netlify static export, keep `NEXT_PRIVATE_TARGET=netlify-static`.

## Alternate Hosted Demo: Vercel

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

This makes the hosted app usable without AWS API/RDS resources. The UI labels
the state as `Submission demo`, uses deterministic local coaching logic, and
does not claim production database persistence is live.

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

1. Open https://speakable-app.netlify.app/.
2. Sign in with `alex@example.test` and `Password123!`.
3. Save onboarding with the 18+ age gate and consent checked.
4. Update the baseline assessment.
5. Generate an assertive rewrite from the sample deadline message.
6. Run the text role-play.
7. Prepare privacy export.
8. Queue deletion.
9. Point reviewers to `docs/06-risk-register.md` for safety/privacy/moderation coverage.
