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
