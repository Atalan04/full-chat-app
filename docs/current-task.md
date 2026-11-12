# current-task — The Single Active Task

**Task:** F5 — Delete account
**Status:** ready
**Spec:** see `features.md` → F5 and `architecture.md` API contract.

## Scope

- Server: `DELETE /api/me` requiring password confirmation; atomically
  anonymize the user, clear profile/password fields, set `deleted_at`, then
  disconnect that user's sockets. Reject messages to a deleted peer.
- Client: add a password-confirmation danger zone to `/profile`; clear the
  session and redirect after deletion; show deleted peers as “Deleted User”
  and disable message sending.

## Out of scope

Empty states, connection status, auto-scroll, and responsive polish are F6.

## Checklist (verify before marking done)

- [ ] Deleted account cannot log in; its existing JWT receives 401.
- [ ] Peer retains full history, sees “Deleted User”, and cannot message the account.
- [ ] Database retains no deleted user's original profile or password data.
- [ ] Server type-check and client build pass.

## F4 completion

F4 implementation is complete and verified. See `done.md`; commit the feature
before starting F5.
