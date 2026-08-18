# Trumpet Section Snipe Bot

A GroupMe bot + leaderboard website for the trumpet section's photo "sniping"
game. Members secretly photograph each other; a message with a **photo**, an
**@ mention of the victim**, and the word **"sniped"** is automatically
recorded, and a public leaderboard tracks kills, deaths, and K/D per season.

```
[photo] @John sniped
```
→ sender = sniper, @John = victim, bot posts one confirmation, stats update.

---

## 1. What this project does

- Watches the trumpet section's GroupMe chat via a webhook bot.
- Detects valid snipes (photo + @mention + "sniped", sender ≠ victim).
- Auto-enrolls players by their permanent GroupMe user ID (display-name
  changes never create duplicate players).
- Records every snipe as an individual, immutable-by-default record — kills,
  deaths, and K/D are always *calculated* from those records, never stored as
  counters that could drift out of sync.
- Posts exactly one confirmation message per valid snipe, and stays silent
  otherwise (no leaderboard/help commands cluttering the chat).
- Serves a small public leaderboard website, backed by a small REST API.
- Provides admin-only endpoints to undo a snipe, correct a player's name, or
  start a new season — all without touching the GroupMe chat.

---

## 2. Architecture overview

```
groupme-snipe-bot/
├── backend/                 Node.js + Express API and GroupMe webhook
│   ├── src/
│   │   ├── db/               SQLite access layer (schema + repositories)
│   │   ├── services/         Business logic (detection, players, games, snipes)
│   │   ├── routes/           HTTP routes (webhook, leaderboard, admin)
│   │   ├── middleware/       Admin auth, rate limiting
│   │   ├── app.js            Wires everything into an Express app
│   │   └── server.js         Starts the HTTP server
│   └── __tests__/            Jest test suite
└── frontend/
    └── index.html            Single static file — the leaderboard website
```

**Backend:** Node.js + Express. No ORM — the database layer uses Node's
**built-in `node:sqlite` module** (stable in Node 22.5+), so there are zero
extra dependencies or native binaries to install just to talk to the
database. All SQL lives behind three small repository modules
(`playerRepository`, `gameRepository`, `snipeRepository`) with a plain
function-based interface. That isolation is deliberate: if you ever need to
move to PostgreSQL (see [Deployment](#6-deployment) for when you'd need to),
you reimplement those three files using a driver like `pg` with the same
function names/shapes — nothing in `services/` or `routes/` has to change.

**Frontend:** A single static `index.html` (HTML + CSS + vanilla JS, no
build step, no framework). It polls the backend's `/api/leaderboard`
endpoint every 20 seconds. Because you said you already have a website/domain,
this was built to be something you can drop directly onto existing static
hosting — no Node runtime needed on the frontend side at all.

**Why not a bigger framework/ORM?** This is a proof of concept for one small
group chat. Express + a couple of SQL files is easy for another developer to
read top-to-bottom in a few minutes, has almost no dependency surface, and
does everything the spec asks for. If the project grows (multiple sections,
more stats, real user accounts), Prisma/Postgres/a proper frontend framework
are all reasonable next steps — the repository-pattern DB layer and the
API-driven frontend are structured so those changes stay localized.

---

## 3. Required software

- **Node.js 22.5 or newer** (needed for the built-in `node:sqlite` module).
  Check with `node --version`.
- npm (ships with Node).
- A GroupMe account with admin rights on the trumpet section group.
- Any static file host for the frontend (can be the same host as everything
  else on your existing domain).

---

## 4. Environment variables

Backend config lives in `backend/.env` (copy from `backend/.env.example`).
**Never commit `.env`.**

| Variable            | Description                                                              |
|----------------------|---------------------------------------------------------------------------|
| `DATABASE_PATH`     | Path to the SQLite file. Defaults to `backend/data/dev.db`.              |
| `GROUPME_BOT_ID`    | Bot ID from dev.groupme.com (used to post confirmation messages).       |
| `GROUPME_GROUP_ID`  | The trumpet section's GroupMe group ID (webhook payloads are checked against this). |
| `ADMIN_API_TOKEN`   | Long random string. Required as a `Bearer` token on all `/api/admin/*` routes. |
| `PORT`              | Port the backend listens on. Defaults to `3000`.                        |
| `CORS_ORIGIN`       | Origin allowed to call the API from a browser (your leaderboard site's URL). |

Generate a strong admin token, e.g.:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 5. Setting up the GroupMe bot

1. Go to <https://dev.groupme.com/bots> and log in.
2. Click **Create Bot**.
3. **Group:** select the trumpet section's GroupMe group.
4. **Name / Avatar:** whatever you like (this is what posts confirmations).
5. **Callback URL:** `https://<your-deployed-backend-domain>/webhook/groupme`
   - This must be a **public**, internet-reachable HTTPS URL. It can't be
     `localhost` — GroupMe's servers need to reach it directly.
   - For local development, use a tunneling tool (e.g. `ngrok http 3000`)
     and put the generated `https://*.ngrok.io/webhook/groupme` URL here
     temporarily.
6. Save. GroupMe shows you a **Bot ID** — put it in `GROUPME_BOT_ID`.
7. Find your **Group ID**: on the bot creation page, or via GroupMe's
   `GET /groups` API — put it in `GROUPME_GROUP_ID`.

**Note on webhook security:** GroupMe does not support signing/verifying
webhook payloads. The backend does the best practical verification
available — it checks the payload shape and that `group_id` matches your
configured group — but this isn't cryptographic proof of authenticity. That's
an inherent GroupMe platform limitation, not something this project can work
around.

---

## 6. How to initialize the database

The schema is applied automatically the first time the app touches the
database (both `npm start` and `npm test` do this for you). To create the
file explicitly ahead of time:

```bash
cd backend
npm run db:init
```

This is idempotent — safe to run again later.

---

## 7. Running the backend locally

```bash
cd backend
cp .env.example .env      # then fill in real values
npm install
npm run db:init
npm start                 # or: npm run dev  (auto-restarts on file changes)
```

The API is now at `http://localhost:3000`. Quick check:
```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/leaderboard
```

---

## 8. Running the frontend locally

It's a static file — no build step. Either:

- Open `frontend/index.html` directly in a browser, or
- Serve it with any static server, e.g. `npx serve frontend`.

By default it points at `http://localhost:3000`. To point it at a different
backend URL, add this **before** the closing `</head>` tag (or edit the
`API_BASE_URL` constant directly in the `<script>` at the bottom of the
file):
```html
<script>window.SNIPE_BOT_API_BASE_URL = 'https://your-backend-domain.com';</script>
```

---

## 9. Running tests

```bash
cd backend
npm test
```

Tests use an in-memory SQLite database (`:memory:`) — nothing touches your
real data, and no external services are called. Coverage includes snipe
detection (valid/invalid cases, case-insensitivity, self-snipe rejection),
player enrollment/no-duplicates, duplicate-webhook prevention, kill/death/K-D
calculation, undo, and the HTTP routes (webhook, leaderboard, admin auth).

---

## 10. Deployment

### Backend

The backend is a plain Node process — deploy it anywhere that gives you a
**persistent filesystem or volume** (a small VPS, or a platform like Fly.io
/ Railway / Render with a persistent volume attached). This matters because
SQLite is a file on disk: on a platform with an *ephemeral* filesystem
(classic serverless functions, many "container that resets on deploy"
platforms), your data would be silently wiped on every restart.

**If your target platform can't give you persistent disk storage:** don't
use SQLite there. Instead, provision a small hosted PostgreSQL instance
(e.g. your platform's managed Postgres, Neon, Supabase, RDS) and reimplement
`src/db/playerRepository.js`, `gameRepository.js`, and `snipeRepository.js`
using the `pg` package, keeping the same exported function names — nothing
in `services/` or `routes/` needs to change. This is called out explicitly
because the spec asked us not to silently assume SQLite works everywhere.

General steps for a VPS-style host:
```bash
git clone <your-repo>
cd groupme-snipe-bot/backend
npm install
cp .env.example .env   # fill in real values; DATABASE_PATH should point
                        # at a path on your persistent volume
npm run db:init
npm start               # in production, run this under pm2 or systemd
                         # so it restarts automatically
```
Point your reverse proxy / load balancer at the backend's `PORT`, and make
sure `https://<domain>/webhook/groupme` reaches it — that's the URL you give
GroupMe in step 5 above.

### Frontend

Upload `frontend/index.html` to your existing website/domain (it's a single
file — literally drag-and-drop onto most static hosts, or `scp` it, or serve
it from the same box as the backend via nginx). Set
`window.SNIPE_BOT_API_BASE_URL` (see [section 8](#8-running-the-frontend-locally))
to your backend's public URL first.

### Checklist
- [ ] Backend deployed somewhere with persistent storage (or Postgres, per above)
- [ ] `.env` configured on the server, **not committed to git**
- [ ] GroupMe bot's callback URL points at `https://<backend>/webhook/groupme`
- [ ] Frontend's `API_BASE_URL` points at the backend's public URL
- [ ] `CORS_ORIGIN` on the backend matches the frontend's real URL

---

## 11. Admin operations

All admin endpoints require `Authorization: Bearer <ADMIN_API_TOKEN>`.

**List recent snipes (to find an ID to undo):**
```bash
curl https://your-backend/api/admin/snipes \
  -H "Authorization: Bearer $ADMIN_API_TOKEN"
```

**Undo a snipe** (soft-deletes it — history is preserved, it just no longer
counts toward the leaderboard):
```bash
curl -X DELETE https://your-backend/api/admin/snipes/42 \
  -H "Authorization: Bearer $ADMIN_API_TOKEN"
```

**Correct a player's display name:**
```bash
curl -X PATCH https://your-backend/api/admin/players/7 \
  -H "Authorization: Bearer $ADMIN_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"displayName": "Corrected Name"}'
```

---

## 12. Starting a new yearly game/season

Starting a new season **does not delete anything** — it deactivates the
current game and creates a new active one. Old seasons and their snipes stay
in the database and can be queried later (`GET /api/leaderboard/games/:id`).

```bash
curl -X POST https://your-backend/api/admin/games \
  -H "Authorization: Bearer $ADMIN_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Season 2027"}'
```

If you omit `"name"`, it defaults to `"Season <current year>"`.

To reactivate a past season instead of creating a new one:
```bash
curl -X PATCH https://your-backend/api/admin/games/3/activate \
  -H "Authorization: Bearer $ADMIN_API_TOKEN"
```

The public leaderboard (`GET /api/leaderboard`) always reflects whichever
game is currently active.

---

## API reference (summary)

| Method | Path                              | Auth   | Purpose                              |
|--------|------------------------------------|--------|----------------------------------------|
| GET    | `/health`                          | none   | Liveness check                        |
| POST   | `/webhook/groupme`                 | none*  | GroupMe message webhook               |
| GET    | `/api/leaderboard`                 | none   | Active season's leaderboard           |
| GET    | `/api/leaderboard/games/:gameId`   | none   | A specific season's leaderboard       |
| GET    | `/api/admin/snipes`                | admin  | List recent snipes                    |
| DELETE | `/api/admin/snipes/:id`            | admin  | Undo a snipe                          |
| POST   | `/api/admin/games`                 | admin  | Start a new season                    |
| GET    | `/api/admin/games`                 | admin  | List all seasons                      |
| PATCH  | `/api/admin/games/:id/activate`    | admin  | Reactivate a past season              |
| PATCH  | `/api/admin/players/:id`           | admin  | Correct a player's display name       |

\* See the webhook security note in section 5 — GroupMe doesn't support
payload signing, so this route relies on payload-shape + group-ID checks
instead of a shared secret.

---

## Known limitations (proof-of-concept scope, by design)

- Admin auth is a single shared bearer token, not per-admin accounts — fine
  for a couple of trusted admins, not meant to scale beyond that.
- GroupMe webhook payloads can't be cryptographically verified (platform
  limitation, documented above).
- If posting the GroupMe confirmation message fails (e.g. GroupMe API is
  briefly down), the snipe is still recorded — the failure is logged
  server-side rather than silently retried or lost. The snipe record is
  always the source of truth.