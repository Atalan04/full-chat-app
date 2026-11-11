# done — Completed Work Log

Append-only. One entry per finished feature, newest at the top. Format:

```
## YYYY-MM-DD — F# Feature name
- What shipped (1-3 bullets)
- Deviations from the spec, if any, and where the docs were updated
```

---

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
