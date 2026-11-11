# current-task — The Single Active Task

**Task:** F2 — Profile
**Status:** not started
**Spec:** see `features.md` → F2. Read `architecture.md` API contract before starting.

## Scope

- Server: `PATCH /api/me` for `first_name`, `last_name`, and `bio`, with
  server-side validation; `GET /api/me` was shipped in F1.
- Client: `/profile` page to view and edit the profile with save feedback;
  `Avatar` uses initials and a deterministic username-based color. Display name
  uses the first and last name when set, otherwise the username.

## Out of scope

People search, conversations, messaging, and account deletion are later features.

## Checklist (verify before marking done)

- [ ] Profile edits survive reload.
- [ ] Over-long fields are rejected with the server's message.
- [ ] Avatar initials and color are consistent wherever a user appears.
- [ ] Server type-check and client build pass.

## On completion

Append an entry to `done.md`, load F3 into this file, and commit.
