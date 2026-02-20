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

Without these variables, the app automatically uses an in-memory fallback store suitable for local development only.

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
