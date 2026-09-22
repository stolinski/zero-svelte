# AGENTS.md

## Commands

- `pnpm run check` - TypeScript/Svelte type checking
- `pnpm run lint` - ESLint
- `pnpm run format` - Prettier formatting
- `pnpm run test` - Runtime regressions against the packaged library
- `pnpm run test:types` - Consumer TypeScript compatibility (requires fresh `dist/`)
- `pnpm run test:compat` - Packed-library Zero/Svelte compatibility matrix
- `pnpm run test:live` - Real browser + Docker/Postgres/Zero tests (see `tests/README.md`)
- `pnpm run verify` - Format + lint + check + runtime/type tests + build + package
- `pnpm run dev` - Start dev server
- `pnpm run dev:zero-cache` - Run Zero cache server

## Code Style

- **Tabs** for indentation, **single quotes**, **no trailing commas**, 100 char line width
- Imports auto-organized by `prettier-plugin-organize-imports`
- TypeScript strict mode; use explicit types for function params and return types
- Svelte 5 runes: `$state`, `$derived`, `$effect` (no legacy reactive statements)
- File naming: `*.svelte.ts` for Svelte-aware TS files with runes

## Architecture

- `src/lib/` - Library code (Z, Query, ViewStore, ViewWrapper classes)
- `src/routes/` - Demo app routes
- `src/schema.ts` - Zero schema with `defineQuery` and ArkType/Zod validators
- Queries use `defineQuery(validator, queryFn)` pattern with Standard Schema validators

## Contributing

- Run `pnpm run verify` before pushing
- PRs changing `src/lib/**` or `package.json` require changeset: `pnpm run changeset`
