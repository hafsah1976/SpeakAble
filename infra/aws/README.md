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

## App Runner API

1. Create an ECR repository for the API image.
2. Create an App Runner service from that ECR image using port `8000`.
3. Configure API environment variables from `services/api/.env.example`.
4. Set the GitHub secrets listed in the root `README.md`.

The deploy workflow builds `services/api/Dockerfile`, pushes both `latest` and
the commit SHA tag to ECR, and starts an App Runner deployment when AWS secrets
are configured.
