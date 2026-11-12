# current-task — The Single Active Task

**Task:** F4 — Realtime messaging
**Status:** not started
**Spec:** see `features.md` → F4. Read `architecture.md` API contract before starting.

## Scope

- Server: JWT-authenticated Socket.IO handshake; personal `user:<id>` rooms;
  `message:send` validation, storage, acknowledgement, and `message:new`
  delivery; `GET /api/conversations/:id/messages` with participant checks and
  the latest 50 messages in chronological order.
- Client: socket connection after login, disconnection on logout, history and
  live message rendering, send form, conversation sidebar updates, and history
  recovery after reconnect.

## Out of scope

Account deletion is F5. Empty states and responsive polish are F6.

## Checklist (verify before marking done)

- [ ] Two accounts see new messages arrive in real time.
- [ ] Message history survives a server restart and is limited to the latest 50.
- [ ] A bad token cannot connect a socket; non-participants cannot read history.
- [ ] New conversations appear in the recipient's sidebar after its first message.
- [ ] Server type-check and client build pass.

## On completion

Append an entry to `done.md`, load F5 into this file, and commit.
