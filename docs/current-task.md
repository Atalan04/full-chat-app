# current-task — The Single Active Task

**Task:** F1 — Auth
**Status:** not started
**Spec:** see `features.md` → F1. Read `architecture.md` API contract before starting.

## Scope

- Server: `POST /api/auth/signup`, `POST /api/auth/login` (bcrypt, JWT 7-day
  expiry), `requireAuth` middleware (valid JWT and active user), and protected
  `GET /api/me` returning the caller's `UserProfile`.
- Client: `/signup` and `/login` pages with inline errors; store token and user
  in localStorage; API fetch wrapper attaches the bearer token; root redirects
  to `/chat` when signed in and `/login` otherwise; logout clears storage.

## Out of scope

Profile editing, people search, conversations, messaging, and account deletion
are later features.

## Checklist (verify before marking done)

- [ ] Sign up, log out, and log back in from the browser.
- [ ] Duplicate username and wrong password show friendly errors.
- [ ] `GET /api/me` returns 401 without a token and the profile with a token.
- [ ] Reload keeps the user logged in.
- [ ] Server type-check and client build pass.

## On completion

Append an entry to `done.md`, load F2 into this file, and commit.
