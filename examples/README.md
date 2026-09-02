# Examples

Runnable `.tish` demos of the `@spacedevin/deck` **API** — parsing, host boot, helpers. Looking for
`.deck` **songs** instead? Those are in [docs/EXAMPLES.md](../docs/EXAMPLES.md), one per voice, each
playable on the site.

From the package root:

```bash
npm run examples
```

Or one at a time:

```bash
tish build --target js examples/01-parse.tish -o /tmp/deck-ex01.js && node /tmp/deck-ex01.js
```

| File | Shows |
|------|--------|
| [01-parse.tish](01-parse.tish) | `tokenize` / `parseProgram` on a small song |
| [02-host-boot.tish](02-host-boot.tish) | Registries, dialect, highlight keywords, macros (HOST.md boot order) |
| [03-helpers.tish](03-helpers.tish) | Format, scale, bar selectors, Euclidean, classify |

These import from `../src/index.tish` (same as tests). Published apps should import `@spacedevin/deck`.
