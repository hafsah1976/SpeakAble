# Testing and Deployment Plan

## Testing

### Unit

- Coaching transformation rules.
- Safety flag detection and pre-display output blocking.
- Provider interface behavior and structured feedback schemas.
- API validation and error mapping.
- Baseline assessment scoring and six-dimension feedback scoring.
- Privacy export and deletion request creation.

### Integration

- FastAPI route tests with local auth disabled.
- Cognito JWT verification tests with mocked JWKS.
- RDS/Postgres migrations applied in a disposable database.
- RLS policy tests for owner, moderator, and admin access.

### Frontend

- Auth gates for demo fallback, sign-up, sign-in, confirmation, and sign-out.
- Accessibility checks for keyboard navigation, labels, focus, contrast, reduced motion, and adjustable type.
- Mobile viewport checks for the web app.
- Expo smoke test for startup, session restore, and core screen rendering.

### End-to-End

Critical path:

1. Sign up or log in with Cognito.
2. Confirm the workspace is protected by session state.
3. Complete onboarding and baseline assessment.
4. Generate an assertive rewrite.
5. Review structured feedback scores.
6. Open a guided lesson and exercise.
7. Run a text role-play simulation.
8. Submit a moderation report.
9. Export data.
10. Delete saved sensitive text.

## CI

The GitHub Actions `CI` workflow runs npm install, TypeScript typecheck,
Next.js build, Python dependency install, pytest, Playwright e2e tests, and
OpenAPI generation drift checks.

The `Deploy` workflow runs Vercel web deployment, AWS App Runner API
deployment, AWS RDS migrations, and EAS mobile builds. Each job skips cleanly
until matching secrets are configured. The EAS job uses
`expo/expo-github-action@v8` with `eas-version: latest`.

## Deployment

### Web

- Deploy `apps/web` to Vercel.
- Configure `NEXT_PUBLIC_AWS_REGION`,
  `NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID`,
  `NEXT_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID`, and `NEXT_PUBLIC_API_URL`.
- Set `NEXT_PUBLIC_ALLOW_LOCAL_DEMO_FALLBACK=false` outside development.
- Verify sign-up, sign-in, confirmation, sign-out, and session refresh.

### Mobile

- Build with EAS for iOS and Android.
- Configure `EXPO_PUBLIC_AWS_REGION`,
  `EXPO_PUBLIC_AWS_COGNITO_USER_POOL_ID`,
  `EXPO_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID`, and `EXPO_PUBLIC_API_URL`.
- Store Cognito tokens through SecureStore-backed Amplify storage.
- Verify sign-up, sign-in, sign-out, and session restore on a real device or simulator.

### API

- Deploy `services/api` to AWS App Runner from an ECR image.
- Set `REQUIRE_AUTH=true`, `AUTH_PROVIDER=cognito`, and Cognito environment variables.
- Set `DATABASE_URL` to the RDS Postgres connection string.
- Set `VOICE_ROLE_PLAY_ENABLED=false` and `EXTERNAL_SHARING_ENABLED=false` until launch review.
- Limit CORS to production web and mobile origins.

### Database

- Apply migrations through `npm run db:migrate`.
- Enable point-in-time recovery for production RDS.
- Validate RLS before launch.
- Rotate database credentials after incident response or staff access changes.

## Release Gates

- No unauthenticated access to private user data.
- RLS tests pass for all private tables.
- Raw user text excluded from logs.
- Report flow works.
- Delete/export data flows tested.
- Admin actions create audit events.
- Voice role-play remains disabled unless the explicit feature flag is enabled.
- External sharing remains disabled unless the explicit feature flag is enabled.
- Local demo fallback is disabled in production builds.
- Captions, keyboard navigation, screen-reader labels, reduced motion, and adjustable type controls are verified.
- GitHub Actions `CI` and `Deploy` are green on `main`.
- Production deploy secrets are configured before claiming the app is live on hosted providers.
