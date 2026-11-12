# Project status

Updated: 2026-11-12

## Project

A learning project for a one-to-one realtime messenger. The repository has a
Next.js client in `client/` and a TypeScript/Express API with SQLite in
`server/`. Run them in separate terminals from the repository root:

```powershell
npm run dev --prefix server
npm run dev --prefix client
```

Open the client at `http://localhost:3000`; the API listens on port 4000. The
root has no `npm run dev` script.

## Completed

- **F0 — Scaffolding:** app structure, SQLite schema, health endpoint,
  environment examples, and run instructions. Added a Node preload workaround
  for `os.userInfo()` failing under the Windows sandbox.
- **F1 — Auth:** signup/login with bcrypt and seven-day JWTs, protected
  `GET /api/me`, client auth pages, localStorage session handling, root
  redirects, and logout.
- **F2 — Profile:** validated `PATCH /api/me`, profile editor at `/profile`,
  shared display-name and deterministic initials-avatar helpers, and a profile
  link from `/chat`.
- **F3 — Find people & conversations:** authenticated username-prefix search,
  get-or-create conversations, activity-ordered summaries, and the chat
  sidebar/search UI. Empty chats are listed for their creator until messaged.

F2 verification passed: server TypeScript check, client production build,
trimmed profile updates, persisted profile readback, and over-limit validation.
F3 verification passed: server TypeScript check, client production build,
search validation, conversation reuse, and creator/peer visibility before and
after a message is stored.
F1's browser click-through was not manually verified because the browser-control
runtime could not start in that sandbox; this limitation is in `docs/done.md`.

## Current work

**F4 — Realtime messaging** is next. The active scope is recorded in
`docs/current-task.md`: authenticated Socket.IO, message persistence/history,
live delivery, and reconnection recovery. Re-read
`docs/architecture.md` before implementation; it defines the API contract.

## Git

- Remote: `https://github.com/Atalan04/full-chat-app.git`
- Branch: `main`
- F2 (`e189d68`) is pushed to `origin/main`.
- F3 is local work on `main`; `origin/main` was last confirmed at F2.
