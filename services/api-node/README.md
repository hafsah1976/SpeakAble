# SpeakAble MERN API

Node/Express/MongoDB backend for SpeakAble.

## Local Development

```bash
cp services/api-node/.env.example services/api-node/.env
npm run dev:api
```

By default, local development uses `DATA_STORE=memory` so the backend can run without MongoDB. Set `DATA_STORE=mongo` and `MONGODB_URI` to persist data in MongoDB.

Seed MongoDB demo state after `MONGODB_URI` is set:

```bash
npm --workspace @speakable/api run seed
```

## Checks

```bash
npm --workspace @speakable/api run typecheck
npm --workspace @speakable/api run test
```

## Render Deployment

The repository root `render.yaml` defines the production web service. Create a
Render Blueprint from the GitHub repository and provide `MONGODB_URI` when the
Blueprint prompts for the secret value.

After Render gives the API a public URL, point the web and mobile
`*_PUBLIC_API_URL` variables at that URL.
