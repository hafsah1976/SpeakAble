# Testing and Deployment Plan

## Testing

### Unit

- Coaching transformation rules.
- Safety flag detection.
- Provider interface behavior and structured feedback schemas.
- Pre-display blocking for unsafe model output.
- API validation and error mapping.
- Shared TypeScript API client behavior.
- Baseline assessment scoring.
- Six-dimension feedback scoring.
- Privacy export and deletion request creation.

### Integration

- FastAPI route tests with auth disabled and mocked Supabase.
- Supabase migrations applied in a disposable database.
- RLS policy tests for owner and moderator access.

### Frontend

- Component tests for coaching form states.
- Accessibility checks for keyboard navigation, labels, focus, and contrast.
- Mobile viewport checks for the web app.
- Expo smoke test for startup and core screen rendering.

### End-to-End

Critical path:

1. Sign up or log in.
2. Enter a difficult message.
3. Select relationship, tone, and goal.
4. Generate an assertive rewrite.
5. Review structured feedback scores.
6. Complete baseline assessment.
7. Open a guided lesson and exercise.
8. Run a text role-play simulation.
9. Submit a report.
10. Export data.
11. Delete saved sensitive text.

## CI

The GitHub Actions `CI` workflow runs:

- npm install,
- TypeScript typecheck,
- Next.js build,
- Python dependency install,
- pytest,
- Playwright e2e tests,
- OpenAPI generation drift checks.

The GitHub Actions `Deploy` workflow runs provider-specific deploy jobs for Vercel, Render, Supabase, and EAS. Each job skips cleanly until the matching repository secrets are configured. The EAS job uses `expo/expo-github-action@v8`, the current resolvable Expo GitHub Action wrapper, with `eas-version: latest`.

## Deployment

### Web

- Deploy `apps/web` to Vercel or any Next.js capable platform.
- Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_API_URL`.
- Set `NEXT_PUBLIC_ALLOW_LOCAL_DEMO_FALLBACK=false` outside development.
- Enforce auth in server-side route logic, not only proxy/middleware.

### Mobile

- Build with EAS for iOS and Android.
- Configure `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and `EXPO_PUBLIC_API_URL`.
- Store Supabase sessions through `expo-secure-store`; set `EXPO_PUBLIC_ALLOW_LOCAL_DEMO_FALLBACK=false` outside intentional demos.
- Use separate Supabase redirect URLs for development, preview, and production.

### API

- Deploy `services/api` to Render, Fly.io, Railway, or a container platform.
- Set `REQUIRE_AUTH=true`.
- Set `VOICE_ROLE_PLAY_ENABLED=false` and `EXTERNAL_SHARING_ENABLED=false` until launch review.
- Store `SUPABASE_SERVICE_ROLE_KEY` only in server secrets.
- Limit CORS to production web and mobile origins.

### Database

- Apply migrations through Supabase CLI.
- Enable point-in-time recovery for production.
- Validate RLS before launch.
- Rotate service role keys after incident response or staff access changes.

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
