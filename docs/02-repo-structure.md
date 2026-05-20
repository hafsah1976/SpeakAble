# Repo Structure Plan

The monorepo uses npm workspaces for TypeScript packages and a separate Python
service directory for FastAPI.

```text
speakable/
  apps/
    web/
      src/app/                 Next.js App Router routes
      src/components/          Web-only interactive components
      src/lib/                 Web client helpers, including Cognito auth
    mobile/
      src/screens/             Mobile screens
      src/lib/                 Mobile API and Cognito helpers
  packages/
    ui/
      src/tokens.ts            Cross-platform design tokens
    types/
      src/contracts.ts         Shared API contract types
      src/client.ts            Typed fetch client
  services/
    api/
      app/
        core/                  Settings, auth, persistence, coaching, moderation
        routers/               FastAPI route modules
      tests/                   Pytest coverage
  database/
    migrations/                AWS RDS/Postgres SQL migrations
    scripts/                   SQL runner for migrations and seeds
  infra/
    aws/                       Cognito, RDS, and App Runner deployment notes
  docs/                        Planning artifacts
  .github/workflows/           CI and deploy workflows
```

## Ownership Rules

- Shared contracts live in `packages/types`.
- Visual primitives and colors live in `packages/ui`.
- Business and safety logic lives in `services/api`, not UI components.
- Database authorization is enforced in SQL RLS and repeated in API route checks.
- Generated concept assets live in `assets/concepts` and are documentation inputs, not runtime dependencies.

## Growth Paths

- Add `services/worker` for async model calls, export jobs, notifications, and deletion verification.
- Add `apps/admin` only after admin workflows outgrow protected web routes.
- Add S3 export storage for privacy exports when background jobs are introduced.
