---
"zero-svelte": major
---

Breaking API changes:

- **BREAKING**: Renamed `.current` to `.data` on both Query and Z instances
- **BREAKING**: Moved ViewStore from global singleton into Zero instance
- **BREAKING**: Removed Query's dependency on Svelte context - Query instances now manage their own state internally

Migration guide:
- Replace `query.current` with `query.data` throughout your codebase
- Replace `z.current` with `z.data` when accessing the Zero instance
