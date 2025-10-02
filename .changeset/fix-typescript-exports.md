---
'zero-svelte': patch
---

Fix TypeScript type declaration generation for Z class exports

Added explicit return type annotations to all getters and methods in the Z class to resolve TypeScript's inability to generate portable type declarations. This fixes the "zero-svelte has no exported member 'Z'" error when importing the package.
