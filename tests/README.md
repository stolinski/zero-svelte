# Compatibility tests

- `pnpm run test` builds `dist/` and tests the public `zero-svelte` entry point using real Svelte component/effect lifecycles and Zero's in-memory client. No database or Zero cache is required.
- `pnpm run test:types` checks the packaged declarations with `NodeNext` resolution, `DefaultTypes` augmentation, explicit schema generics, ArkType/Zod query arguments, and negative inference assertions. Run `test` or `package` first to refresh `dist/`.
- `pnpm run test:compat` packs the library and installs it into temporary consumer projects for all combinations of Zero 1.8.0/1.9.0 and Svelte 5.15.0/5.57.1. It runs the runtime tests with development and production compilation, both type projects (with and without `DefaultTypes`), and verifies that the app and library resolve the same Zero/Svelte installations. This needs network access on a cold cache and leaves the workspace's dependency versions unchanged.

To run a single combination:

```sh
TEST_ZERO=1.8.0 TEST_SVELTE=5.15.0 pnpm run test:compat
```

The test-only Vite transform uses the installed Svelte compiler directly. This lets us test our oldest supported Svelte without downgrading the demo app's Vite/SvelteKit toolchain. Keep production compilation in the normal SvelteKit/Svelte package pipeline.

## Live browser + Docker tests

`pnpm run test:live` uses Playwright against the actual demo, Zero cache, query/mutation APIs, and Postgres. It reuses running dev services locally, or starts the demo/cache if needed. CI and release workflows run it against the Compose database.

```sh
# First-time setup (do not overwrite an existing .env):
test -f .env || cp .env.example .env
pnpm exec playwright install chromium

# Docker must be running. This preserves the existing database volume:
docker compose --env-file .env -f docker/docker-compose.yml up -d --wait
pnpm run test:live

# Optionally test with an installed Google Chrome:
PLAYWRIGHT_CHANNEL=chrome pnpm run test:live
```

The suite checks cold-load completeness, local/server filtering, UI creation/completion, client deletion and database persistence, direct Postgres replication, multi-tab propagation, duplicate inserts, offline optimistic writes/reconnect, IndexedDB restoration with sync blocked, same-client-group mutation ordering, and client rebuilding. It writes uniquely prefixed records and deletes only those records afterward. The cache uses the `zero_svelte_smoke` app ID to isolate its replication metadata from the normal app. All configured endpoints must be local; the suite refuses remote databases/servers.

Zero persists to IndexedDB during idle time. The persistence test waits for actual IndexedDB records before reloading; a server acknowledgement alone is not a local-durability guarantee. Browser operations use the exact HMR-versioned modules loaded by the demo to avoid accidentally testing a second Zero instance.

Screenshots, browser error logs, and failure traces are saved under `test-results/` (ignored by Git). The demo is anonymous and has no real login/authorization flow, so these tests are **not** a substitute for testing a consuming application's auth/permission rules.
