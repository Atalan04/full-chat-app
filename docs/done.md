# done — Completed Work Log

Append-only. One entry per finished feature, newest at the top. Format:

```
## YYYY-MM-DD — F# Feature name
- What shipped (1-3 bullets)
- Deviations from the spec, if any, and where the docs were updated
```

---

## 2026-11-12 — F5 Delete account
- Added password-confirmed account deletion that atomically anonymizes the
  account, clears profile/password fields, and disconnects its active sockets.
- Added the profile danger-zone confirmation dialog and made deleted-peer
  conversations readable but non-sendable.
- Prevented locale-dependent message times from differing during hydration by
  rendering a stable UTC time first and switching to local time after mount.
- Verified server type-check and client production build; wrong-password
  rejection, account deletion, JWT/login invalidation, socket disconnect,
  retained peer history, deleted-peer send rejection, and DB anonymization all
  passed. Temporary test accounts and conversation were removed.
- Chrome control could not start in this sandbox, so the profile dialog was
  not click-tested and the hydration fix was not inspected in the browser.
- No deviations from the feature contract.

## 2026-11-12 — F4 Realtime messaging
- Added JWT-authenticated Socket.IO connections, personal user rooms, validated
  message persistence and delivery, and participant-only history limited to the
  latest 50 messages in chronological order.
- Added the chat message pane, send form, live sidebar ordering, new-conversation
  refresh, and history recovery after reconnect.
- Verified server type-check and client production build; two authenticated
  sockets exchanged messages, invalid JWT and nonparticipant history were
  rejected, recipient sidebar visibility updated, latest-50 ordering passed,
  and history survived a server restart. Temporary test accounts were removed.
- No deviations from the feature contract.

## 2026-11-12 — F3 Find people & conversations
- Added authenticated username-prefix search, idempotent get-or-create
  conversations, and activity-ordered conversation summaries.
- Added the chat sidebar/search experience and an empty selected-conversation
  pane; empty conversations are listed only for their creator until messaged.
- Verified server type-check, client production build, search validation,
  conversation reuse, creator/peer visibility, and visibility after a message.
- Existing databases gain `conversations.created_by` on startup; legacy rows
  are attributed to `user_a` because their creator was not previously stored.

## 2026-11-11 — F2 Profile
- Added validated profile editing through `PATCH /api/me`, a signed-in `/profile`
  page, and shared display-name and deterministic initials-avatar helpers.
- Verified server type-check, client production build, trimmed profile updates,
  persistence after reloading from the API, and server rejection of over-long fields.
- No deviations from the feature spec.

## 2026-11-11 — F1 Auth
- Added bcrypt signup/login, seven-day JWTs, active-account auth middleware,
  and protected `GET /api/me`; added client auth pages, API/session helpers,
  root redirects, and logout.
- Verified server type-check, client production build, signup, duplicate
  rejection, wrong-password rejection, token-protected profile access, and login.
- The browser-control runtime could not start in this sandbox, so clicking
  through the UI, reload persistence, and logout were not manually observed.

## 2026-11-11 — F0 Scaffolding
- Added the Next.js client, strict TypeScript Express server, SQLite schema,
  health endpoint, environment examples, ignore rules, and root run instructions.
- Verified the server type-check, schema creation, health response, missing
  `JWT_SECRET` refusal, client production build, and client dev page (HTTP 200).
- Added a server-side Node preload that lets `tsx watch` use an OS username
  fallback when `os.userInfo()` fails in restricted Windows environments.

## 2026-07-09 — Context designed
- Project defined: DM messenger (instant DMs, initials avatars, anonymize on
  delete). Seven context docs written; no code yet.
