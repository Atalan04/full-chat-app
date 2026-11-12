# Project status

Updated: 2026-11-12

## Project

A one-to-one realtime messenger with a Next.js client and TypeScript/Express
API backed by SQLite. Run each app from the repository root in its own terminal:

```powershell
npm run dev --prefix server
npm run dev --prefix client
```

Client: `http://localhost:3000`; API and Socket.IO: `http://localhost:4000`.
There is no root `npm run dev` script.

## Completed

- F0: app scaffolding, SQLite schema, health endpoint, environment examples,
  run instructions, and Windows `os.userInfo()` workaround for `tsx watch`.
- F1: signup/login, bcrypt password hashes, seven-day JWT auth, and auth UI.
- F2: validated profile editing, name/avatar helpers, and `/profile`.
- F3: username search, get-or-create conversations, ordered sidebar, and
  creator-only visibility for empty conversations.
- F4: authenticated Socket.IO messaging, persisted messages and protected
  latest-50 history, live chat UI, sidebar updates, and reconnect recovery.
- F5: password-confirmed account deletion, database anonymization, socket
  disconnect, profile confirmation dialog, and read-only deleted-peer chats.

See `docs/done.md` for verification notes and `docs/architecture.md` for the
API contract. F4 and F5 server type-checks and client production builds passed.
Realtime delivery/history and account deletion security flows passed API/socket
integration checks; temporary integration-test records were removed. The
hydration timestamp now has a deterministic first render and switches to local
time after mount; Chrome was unavailable for visual console verification.

## Next

F6 — Polish. Scope and acceptance checklist are in
`docs/current-task.md` and `docs/features.md`.

## Git

- Remote: `https://github.com/Atalan04/full-chat-app.git`
- Branch: `main`
- F0–F4 are pushed to `origin/main`; F4 is `6ac0a61`.
- F5 (`981ec50`) is committed locally and pending the requested push.
