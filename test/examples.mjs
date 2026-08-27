// Verify every ```deck block in a docs page actually plays
//
// Every block on the examples page renders a Play button, so a block that parses but does not SOUND
// right is worse than one that fails: the reader hears a plain oscillator and believes it is the
// instrument. Substitutions and ignored features are therefore failures here, not warnings.: no parse errors, no generator quietly
// substituted for a plain oscillator, no language feature the player ignores, no silent track.
import { parseSong } from "../packages/player/dist/deck-player.js"
import fs from "node:fs"

const file = process.argv[2]
const src = fs.readFileSync(file, "utf8")
const re = /```deck\n([\s\S]*?)```/g
let m,
  n = 0,
  bad = 0
while ((m = re.exec(src))) {
  n++
  const line = src.slice(0, m.index).split("\n").length
  const song = parseSong(m[1])
  const probs = []
  for (const e of song.errors) probs.push(`ERROR line ${e.line}: ${e.msg}`)
  for (const s of song.substitutions) probs.push(`SUBSTITUTED ${s.trackId} (${s.generatorId}): ${s.reason}`)
  for (const i of song.ignored) probs.push(`IGNORED: ${i}`)
  for (const c of song.channels) {
    const cnt = c.pianoNotes.length || (c.steps ? c.steps.filter((s) => s.on).length : 0)
    if (cnt === 0) probs.push(`track ${c.id} has no notes/steps`)
  }
  const beats = song.totalBeats ?? song.loopBeats
  if (probs.length) bad++
  console.log(
    `${probs.length ? "FAIL" : "ok  "} block ${String(n).padStart(2)} (line ${String(line).padStart(4)})  ` +
      `${song.channels.length} trk  ${song.bpm}bpm  ${beats}beats  waves=${song.channels.filter((c) => c.waveTable).length}`
  )
  for (const p of probs) console.log("       " + p)
}
console.log(bad ? `\n${bad}/${n} blocks have problems` : `\nall ${n} blocks clean`)
process.exit(bad ? 1 : 0)
