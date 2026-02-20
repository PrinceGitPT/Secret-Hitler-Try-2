# Secret Hitler MVP (Vercel-ready)

A modular Next.js MVP for Secret Hitler with:

- Room size selection (5-10)
- Multi-human rooms with bot autofill
- Server-authoritative vote + policy draw/discard/enact flow
- Tabletop-style lobby and game room
- Themeable board/card assets
- Real game-room text chat + placeholder executive powers

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

If you ever see a runtime chunk error like `Cannot find module './331.js'`, run:

```bash
npm run clean:next
npm run dev
```

## Environment

For production on Vercel, configure Vercel KV env vars.

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

In production, KV is required. If KV is missing or unavailable, the API returns explicit `503` errors (`KV_NOT_CONFIGURED` or `KV_UNAVAILABLE`) instead of silently using memory.

In local development, the app still falls back to an in-memory store when KV variables are not set.

## Vercel deployment checklist

1. Attach a Vercel KV database to the project.
2. Confirm env vars are present in your target environment (Production and/or Preview):
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
3. Redeploy after adding or changing env vars.
4. Verify storage mode with:
   - `GET /api/health/storage`
   - Expect `{"ok":true,"storage":{"mode":"vercel-kv",...}}`
5. Smoke test:
   - create room
   - refresh lobby
   - join from second tab
   - confirm no room-loss between requests

## Testing

```bash
npm test
```

## API endpoints

- `POST /api/rooms`
- `POST /api/rooms/[roomCode]/join`
- `POST /api/rooms/[roomCode]/start`
- `GET /api/rooms/[roomCode]/state`
- `POST /api/rooms/[roomCode]/actions`
- `GET /api/rooms/[roomCode]/chat`
- `POST /api/rooms/[roomCode]/chat`
- `PATCH /api/rooms/[roomCode]` (host-only room config update in lobby)
- `GET /api/health/storage` (storage diagnostics)
