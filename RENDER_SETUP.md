Render deployment guide (Postgres-first, minimal)

1) Prepare a managed Postgres (recommended)
   - Create a Supabase/Neon/Postgres instance and copy the connection string (`DATABASE_URL`). Keep it secret.

2) Push `render.yaml` and scripts
   - `git add render.yaml scripts/backup_db.sh`
   - `git commit -m "Render template + backup script"`
   - `git push`

3) Create the service in Render (UI)
   - New → Web Service → Connect your GitHub repo → select branch `main`.
   - Render will detect `render.yaml` and propose the service defined there.

4) Environment variables (Service → Environment)
   - `DATABASE_URL` = your Postgres connection string (preferred for persistence)
   - `ADMIN_API_TOKEN` = (generate a secure token)
   - `GROUPME_BOT_ID`, `GROUPME_GROUP_ID`, `CORS_ORIGIN`, `PORT` as required
   - If you prefer SQLite with a disk: attach a Persistent Disk and set `DATABASE_PATH` = `/data/dev.db`.

5) Build & start commands
   - Build: `cd backend && npm install`
   - Start: `cd backend && npm run db:init && npm start`
   - Note: `db:init` applies the schema. With `DATABASE_URL` set it will apply `schema_postgres.sql`.

6) Backups
   - Cron job `db-backup` runs `scripts/backup_db.sh`. It supports Postgres via `pg_dump` when `DATABASE_URL` is set, and SQLite file copy otherwise.
   - For durable off-host backups, upload dumps to S3 or another blob store (not included by default).

7) Verify endpoints
   - `GET /health` → 200 and `{ "ok": true }`
   - `GET /api/leaderboard` → 200 and JSON leaderboard

Local testing
- Postgres (recommended):

```powershell
$env:DATABASE_URL = "postgres://..."
npm run db:init
npm start
```

- SQLite (default/local):

```powershell
npm run db:init
npm start
```

If you'd like, I can also run a local test against a test Postgres instance (you can provide a `DATABASE_URL`), or prepare Render secrets programmatically (Render API) — tell me which next step you want me to run.
