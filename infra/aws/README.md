# AWS Deployment

SpeakAble uses AWS Cognito for shared web/mobile/API identity, Amazon RDS for
PostgreSQL with `pgvector`, and AWS App Runner for the FastAPI Docker service.

## Cognito

1. Create a Cognito user pool with email sign-in enabled.
2. Create a public app client without a client secret for web/mobile.
3. Add callback/logout URLs for local, preview, and production environments.
4. Create optional `admin` and `moderator` groups. The API maps these groups to
   authorization roles.

Required client variables:

- `NEXT_PUBLIC_AWS_REGION`
- `NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID`
- `NEXT_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID`
- `EXPO_PUBLIC_AWS_REGION`
- `EXPO_PUBLIC_AWS_COGNITO_USER_POOL_ID`
- `EXPO_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID`

Required API variables:

- `AUTH_PROVIDER=cognito`
- `AWS_REGION`
- `AWS_COGNITO_USER_POOL_ID`
- `AWS_COGNITO_USER_POOL_CLIENT_ID`
- `REQUIRE_AUTH=true`

## RDS PostgreSQL

1. Create an RDS PostgreSQL instance.
2. Enable the `pgvector` extension by running the migration in
   `database/migrations/0001_initial_schema.sql`.
3. Store the app database URL in `DATABASE_URL`.
4. Run `npm run db:migrate` and intentionally run `npm run db:seed` only for
   non-production/demo environments.

The schema uses application-set session variables for RLS:

- `app.current_user_id`
- `app.current_user_role`

The FastAPI persistence layer sets those variables before user-owned queries.

Production readiness is exposed by the API at `/ready`. Keep App Runner health
checks pointed at `/health`, then use `/ready` during cutover to confirm Cognito
and database connectivity before disabling web/mobile demo mode.

## App Runner API

1. Create an ECR repository for the API image.
2. Create an App Runner service from that ECR image using port `8000`.
3. Configure API environment variables from `services/api/.env.example`.
4. Set the GitHub secrets listed in the root `README.md`.

The deploy workflow builds `services/api/Dockerfile`, pushes both `latest` and
the commit SHA tag to ECR, and starts an App Runner deployment when AWS secrets
are configured.

If `aws apprunner list-services` returns `SubscriptionRequiredException`, enable
AWS App Runner for the account in the AWS console before creating the service.
If local `docker info` cannot connect to Docker Desktop, either start Docker
Desktop locally or let GitHub Actions build and push the image after AWS secrets
are configured.

## Production Cutover Checklist

Current reusable resources:

- Region: `us-east-1`
- AWS account: `611931653709`
- Cognito user pool: `us-east-1_Elr16XsoJ`
- Cognito web/mobile app client: `737qee90btb50j0cks8mk1qu40`
- ECR repository: `611931653709.dkr.ecr.us-east-1.amazonaws.com/speakable-api`

Cutover order:

1. Confirm paid AWS resource creation is approved.
2. Create the RDS PostgreSQL database and capture its `DATABASE_URL`.
3. Run `DATABASE_URL="<rds-url>" npm run db:migrate`.
4. Enable App Runner for the account if needed.
5. Create an App Runner service from the ECR image using `infra/aws/apprunner.example.json`.
6. Configure App Runner runtime variables:
   `APP_ENV=production`, `AUTH_PROVIDER=cognito`, `REQUIRE_AUTH=true`,
   `AWS_REGION=us-east-1`, `AWS_COGNITO_USER_POOL_ID=us-east-1_Elr16XsoJ`,
   `AWS_COGNITO_USER_POOL_CLIENT_ID=737qee90btb50j0cks8mk1qu40`,
   `DATABASE_URL=<rds-url>`, `API_CORS_ORIGINS=https://speakable-app.netlify.app`.
7. Verify `https://<app-runner-url>/health` returns `ok`.
8. Verify `https://<app-runner-url>/ready` returns `ready`.
9. Set Netlify `NEXT_PUBLIC_API_URL=https://<app-runner-url>`.
10. Set Netlify `NEXT_PUBLIC_ENABLE_SUBMISSION_DEMO=false`.
11. Redeploy Netlify and rerun the reviewer flow.
