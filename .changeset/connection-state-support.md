---
"zero-svelte": minor
---

Update to Zero 0.25

- Update to `@rocicorp/zero` 0.25 which removes the need for explicit schema types
- Add `connectionState` getter exposing rich connection status (`connecting`, `connected`, `disconnected`, `needs-auth`, `error`, `closed`)
- Add `connection` getter for manual connection control (e.g., `z.connection.connect()` for auth retry)
- Re-export `Connection` and `ConnectionState` types from package
- Deprecate `online` getter in favor of `connectionState`
- Remove internal `onOnline` callback usage, now deriving online state from `connection.state`

This aligns with React Zero's `useConnectionState()` hook API.
