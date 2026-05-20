# Repo Structure Plan

The monorepo uses npm workspaces for TypeScript packages and a separate Python service directory for FastAPI.

```text
assertive-coach/
  apps/
    web/
      src/app/                 Next.js App Router routes
      src/components/          Web-only interactive components
      src/lib/                 Web client helpers
    mobile/
      src/components/          React Native UI components
      src/screens/             Mobile screens
  packages/
    ui/
      src/tokens.ts            Cross-platform design tokens
    types/
      src/contracts.ts         Shared API contract types
      src/client.ts            Typed fetch client
  services/
    api/
      app/
        core/                  Settings, auth, coaching, moderation
        routers/               FastAPI route modules
        main.py                App factory and middleware
      tests/                   Pytest coverage
      pyproject.toml           Python package metadata
  database/
    migrations/                Supabase SQL migrations
  infra/
    render/                    Example API deploy config
  docs/                        Planning artifacts
  .github/workflows/           CI
```

## Ownership Rules

- Shared contracts live in `packages/types`; API and clients should conform to the same shapes.
- Visual primitives and colors live in `packages/ui`; platform-specific components can adapt them.
- Business and safety logic lives in `services/api`, not in client-only code.
- Database authorization is enforced in SQL RLS and repeated in API route checks.
- Generated concept assets live in `assets/concepts` and are documentation inputs, not runtime dependencies.

## Growth Paths

- Add `services/worker` for async model calls, notifications, summaries, and deletion jobs.
- Add `packages/config` if lint, test, or TypeScript config becomes repetitive.
- Add `apps/admin` only after admin workflows outgrow the protected web route.
- Add `database/functions` if Supabase Edge Functions are needed for webhook-style workloads.
