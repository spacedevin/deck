## What

<!-- One or two sentences. The PR title becomes the squash commit, so write it as a Conventional
     Commit: feat(synths): …, fix(player): …, docs: …  -->

## Why

## Which package

- [ ] `@spacedevin/deck` (language)
- [ ] `@spacedevin/deck-synths` (voices)
- [ ] `@spacedevin/deck-player` (host)
- [ ] docs / site / CI only

## Checklist

- [ ] `npm test` passes (and `npm test -w @spacedevin/deck-player` if the player changed)
- [ ] If the parser changed: `npm run conformance:update` and I reviewed the diff
- [ ] If a voice was added: it's in `Registry.tish`, `Dispatch.tish`, the synths README table, and has a song in `docs/EXAMPLES.md`
- [ ] Docs say what the code now does
