---
'zero-svelte': minor
---

- Fix: cache Svelte `z` context in `Query` constructor to avoid `getContext` usage outside component init (prevents `lifecycle_outside_component` errors).
- Change: `Query.updateQuery(...)` now swaps the active view reactively. Changing the query hash or toggling `enabled` creates a new materialization; the previous one is cleaned up when no longer referenced (via `createSubscriber` cleanup). This yields predictable resubscribe/teardown across updates.
