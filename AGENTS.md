# @spacedevin/deck — agent notes

This package is the **source of truth** for the `.deck` language (parse / apply / emit / stream / co-DJ skills+merge).

- Grammar: `docs/DECK_GRAMMAR.md`
- Agent subset: `docs/DECK_AGENT_GRAMMAR.md`
- Skills: `docs/DJ_SKILLS.md` + `skills/*.md`
- Public entry: `src/index.tish`

Deckard (`tish-midi`) should depend on this package rather than maintaining a parallel `src/deckfile/` copy.
