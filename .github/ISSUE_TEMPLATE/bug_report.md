---
name: Bug report
about: Something parses, plays, or renders wrong
title: ''
labels: bug
assignees: ''
---

**Which package**

- [ ] `@spacedevin/deck` (parser / language)
- [ ] `@spacedevin/deck-synths` (a voice sounds wrong)
- [ ] `@spacedevin/deck-player` (transport, element, offline render)
- [ ] `deckfile` crate
- [ ] docs site / WAV CLI

**The smallest `.deck` that shows it**

```deck
deck 1
bpm 120

track Lead id lead gen gameBoyDmg
  note 60 0 1 v 100
```

**What you expected**

**What happened instead**

Parse output, `song.errors`, console output, or a description of what you heard.

**Environment**

Package versions, browser or Node version, OS.
