**Render deployment guide (minimal)**

1) Push `render.yaml` to your repo root (already added) and commit the backup script:

   - `git add render.yaml scripts/backup_db.sh`
   - `git commit -m "Add Render service template and DB backup script"`
   - `git push`

2) Create the service in Render (UI)
   - New → Web Service → Connect your GitHub repo → select branch `main`.
   - Render will detect `render.yaml` and propose the service defined there.

3) Create and attach the persistent disk
   - If Render didn't auto-create the disk from `render.yaml`, go to Render Dashboard → Disks → New Disk → choose size and region.
   - Attach it to the service and set mount path to `/data`.

4) Set environment variables (Service → Environment)
   - `DATABASE_PATH` = `/data/dev.db`
   - `ADMIN_API_TOKEN` = (generate a secure token)
   - `GROUPME_BOT_ID` and `GROUPME_GROUP_ID` as needed (optional for now)
   - `CORS_ORIGIN` = `https://<username>.github.io` (or your Pages/custom domain)

5) Deploy
   - Trigger a manual deploy (Deploys → Manual deploy) or push to the branch.
   - The build will run `cd backend && npm install` and start with `cd backend && npm run db:init && npm start`.

6) Verify
   - Visit `https://<your-service>.onrender.com/health` → should return `{ "ok": true }`.
   - `https://<your-service>.onrender.com/api/leaderboard` → JSON leaderboard.
   - Check Logs in Render for any errors.

7) Backups
   - The `render.yaml` defines a cron job `db-backup` that runs `scripts/backup_db.sh` daily.
   - You can adjust schedule or add an upload-to-S3 step if you want off-host backups.

Notes
   - Do NOT put secrets in the repo; set them in Render's environment settings.
   - If you later want to migrate to Postgres, I can prepare migrations and `pg`-backed repositories.
