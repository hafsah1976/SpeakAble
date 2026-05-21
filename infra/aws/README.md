# AWS Deployment

SpeakAble uses AWS Cognito for shared web/mobile/API identity, Amazon RDS for
PostgreSQL with `pgvector`, and AWS-hosted FastAPI. The launch API is deployed
through Lambda plus API Gateway because App Runner is blocked on this AWS
account until the service subscription is enabled.

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

Current production database:

- DB instance: `speakable-prod-postgres`
- Endpoint: `speakable-prod-postgres.cchio2a2ewwk.us-east-1.rds.amazonaws.com`
- Engine: PostgreSQL `18.3`
- Instance class: `db.t4g.micro`
- Security group: `sg-0ce71c01d76ccfbd5`
- App Runner connector security group: `sg-0990408ed92f67a4d`
- DB URL secret: `arn:aws:secretsmanager:us-east-1:611931653709:secret:speakable/prod/database-url-5zxWro`

The migration in `database/migrations/0001_initial_schema.sql` has been applied.
The database has `pgcrypto`, `pgvector`, 17 public tables, 4 starter scenarios,
and 3 starter lessons.

Do not run `npm run db:seed` against production unless intentionally creating a
demo database. The seed file inserts fixed demo users that will not match real
Cognito user IDs.

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

Current API image:

- ECR repository: `611931653709.dkr.ecr.us-east-1.amazonaws.com/speakable-api`
- Image tags: `latest`, `ba9f7cdf2fb7`
- Build project used for AWS-side image push: `speakable-api-image-build`
- ECR access role: `arn:aws:iam::611931653709:role/speakable-apprunner-ecr-access-role`
- Runtime instance role: `arn:aws:iam::611931653709:role/speakable-apprunner-instance-role`

The deploy workflow can build `services/api/Dockerfile`, push both `latest` and
the commit SHA tag to ECR, and start an App Runner deployment when AWS secrets
are configured. A one-time AWS CodeBuild project is also available for image
builds if local Docker push fails.

If `aws apprunner list-services` returns `SubscriptionRequiredException`, enable
AWS App Runner for the account in the AWS console before creating the service.
If local `docker info` cannot connect to Docker Desktop, either start Docker
Desktop locally or let GitHub Actions build and push the image after AWS secrets
are configured.

## Lambda API Gateway Launch Path

Current launch API:

- HTTPS endpoint: `https://cl539orkch.execute-api.us-east-1.amazonaws.com`
- HTTP API name: `speakable-api-http`
- HTTP API id: `cl539orkch`
- Lambda function: `speakable-api`
- Lambda image repo: `611931653709.dkr.ecr.us-east-1.amazonaws.com/speakable-api-lambda`
- Lambda image tags: `latest`, `150f1ae8efb4`
- Lambda security group: `sg-0990408ed92f67a4d`
- Lambda image build project: `speakable-api-lambda-image-build`

API Gateway routes:

- `GET /health`: public platform health check.
- `GET /ready`: public readiness check for config and database connectivity.
- `OPTIONS /{proxy+}`: public browser CORS preflight.
- `ANY /{proxy+}`: Cognito JWT-protected app API.

The Lambda runtime sets `TRUST_GATEWAY_AUTH=true`. API Gateway validates the
Cognito JWT, then the FastAPI dependency reads the trusted authorizer claims from
the Lambda event instead of making outbound JWKS calls from inside the VPC. This
keeps the Lambda private to the VPC for RDS access without requiring a NAT
gateway.

## Production Cutover Checklist

Current reusable resources:

- Region: `us-east-1`
- AWS account: `611931653709`
- Cognito user pool: `us-east-1_Elr16XsoJ`
- Cognito web/mobile app client: `737qee90btb50j0cks8mk1qu40`
- ECR repository: `611931653709.dkr.ecr.us-east-1.amazonaws.com/speakable-api`
- Lambda ECR repository: `611931653709.dkr.ecr.us-east-1.amazonaws.com/speakable-api-lambda`
- Lambda/API Gateway endpoint: `https://cl539orkch.execute-api.us-east-1.amazonaws.com`
- RDS DB instance: `speakable-prod-postgres`
- RDS security group: `sg-0ce71c01d76ccfbd5`
- App Runner connector security group: `sg-0990408ed92f67a4d`
- App Runner ECR access role: `arn:aws:iam::611931653709:role/speakable-apprunner-ecr-access-role`
- App Runner runtime role: `arn:aws:iam::611931653709:role/speakable-apprunner-instance-role`
- Database URL secret: `arn:aws:secretsmanager:us-east-1:611931653709:secret:speakable/prod/database-url-5zxWro`

App Runner cutover order, if/when App Runner is enabled:

1. Enable App Runner for the account if `aws apprunner list-services` returns
   `SubscriptionRequiredException`.
2. Create an App Runner VPC connector using the default VPC subnets and
   `sg-0990408ed92f67a4d`.
3. Create an App Runner service from the ECR image using port `8000`.
4. Configure App Runner runtime variables:
   `APP_ENV=production`, `AUTH_PROVIDER=cognito`, `REQUIRE_AUTH=true`,
   `AWS_REGION=us-east-1`, `AWS_COGNITO_USER_POOL_ID=us-east-1_Elr16XsoJ`,
   `AWS_COGNITO_USER_POOL_CLIENT_ID=737qee90btb50j0cks8mk1qu40`,
   `DATABASE_URL=<database-url-secret>`,
   `API_CORS_ORIGINS=https://speakable-app.netlify.app`.
5. Verify `https://<app-runner-url>/health` returns `ok`.
6. Verify `https://<app-runner-url>/ready` returns `ready`.
7. Set Netlify `NEXT_PUBLIC_API_URL=https://<app-runner-url>`.
8. Set Netlify `NEXT_PUBLIC_ENABLE_SUBMISSION_DEMO=false`.
9. Redeploy Netlify and rerun the reviewer flow.

Current Netlify production cutover already points to the Lambda/API Gateway URL:

```text
NEXT_PRIVATE_TARGET=netlify-static
NEXT_PUBLIC_ENABLE_SUBMISSION_DEMO=false
NEXT_PUBLIC_API_URL=https://cl539orkch.execute-api.us-east-1.amazonaws.com
```
