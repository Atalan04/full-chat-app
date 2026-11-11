# current-task — The Single Active Task

**Task:** F3 — Find people & conversations
**Status:** not started
**Spec:** see `features.md` → F3. Read `architecture.md` API contract before starting.

## Scope

- Server: `GET /api/users?q=` (username prefix search, maximum 10, excluding
  the caller and deleted users), `POST /api/conversations` (get or create by
  username), and `GET /api/conversations` (peer profile and last message, newest
  activity first).
- Client: `/chat` layout with a user search box, results that open a
  conversation, a conversation list with peer avatar/name and last-message
  preview, and an empty selected-conversation pane for F4.

## Out of scope

Realtime messaging and message history are F4. Account deletion is F5.

## Checklist (verify before marking done)

- [ ] Searching for a username and picking a result opens a conversation.
- [ ] Opening the same person twice reuses one conversation.
- [ ] The sidebar lists the conversation.
- [ ] A second account sees it once a message exists (F4 completes this).
- [ ] Server type-check and client build pass.

## On completion

Append an entry to `done.md`, load F4 into this file, and commit.
