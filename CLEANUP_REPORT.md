Repository cleanup summary

What I changed
- Added a minimal runnable backend skeleton under `backend/`:
  - `backend/package.json` — scripts and dependencies
  - `backend/.env.example` — env var template
  - `backend/src/app.js` — minimal Express app (health, leaderboard stub, webhook stub)
  - `backend/src/server.js` — starts the app

Missing or inconsistent files I found
- `backend/src/app.js` and `backend/src/server.js` in the repo were empty — they were not populated by the generator.
- Several modules referenced by the README or by internal requires are missing or misplaced:
  - `snipeDetection.js` (missing)
  - `middleware/adminAuth` (missing)
  - `middleware/rateLimiter` (missing)
  - webhook and leaderboard route modules (missing)
  - `backend/.env.example` (missing)
  - The SQL schema appears to be missing or replaced: `schema.sql` in the workspace does not contain SQL.
  - There are duplicated/incorrect repository files: `gamerepository.js` and `sniperepository.js` contents look suspiciously similar.

Why `app` and `server` looked missing
- The generator created many backend modules at the repository root, but the application entrypoints expected under `backend/src` were left empty. Practically that means running `cd backend && npm start` started an empty file, so you saw no app/server code.

Next recommended steps (I can implement any of these):
1. Restore or regenerate the real `schema.sql` (SQL DDL for tables).
2. Move/copy the backend modules into `backend/src/` layout so relative requires resolve correctly, or update module paths to match the current layout.
3. Implement the missing small modules (`snipeDetection`, `middleware/*`, `routes/*`) and ensure `backend/src/app.js` wires them.
4. Run `cd backend && npm install` then `npm run db:init` and `npm start` to smoke-check.

If you want, I can continue and perform steps 1–3 now and make the backend fully functional according to the README.
