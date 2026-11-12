# current-task — The Single Active Task

**Task:** F6 — Polish
**Status:** ready
**Spec:** see `features.md` → F6.

## Scope

- Add auto-scroll only when a user is already at the bottom of the message pane.
- Make empty and loading states clear across conversations, messages, and search.
- Show connection status; keep failed sends visible and actionable.
- Polish Tailwind styling and verify the layout at 375px wide.

## Out of scope

Typing indicators, presence, unread badges, history pagination, avatar uploads,
blocking, rate limiting, group chats, and httpOnly-cookie auth remain later work.

## Checklist (verify before marking done)

- [ ] Empty/loading states work for no conversations, messages, and search results.
- [ ] Auto-scroll occurs only when already at the bottom.
- [ ] Disconnect status appears when the server stops; reconnect recovers state.
- [ ] Layout is usable at 375px with no layout jumps or unstyled flashes.
- [ ] Server type-check and client build pass.

## F5 completion

F5 is complete and verified in commit `87838b3`; F6 is ready.
