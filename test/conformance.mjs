#!/usr/bin/env node
// Conformance corpus runner (JS / `dist/deck.js`).
//
// The corpus is the cross-implementation contract for the `.deck` language. Every implementation —
// this package's Tish source, its JS build, and the Rust crate emitted from the same source — runs
// the SAME `conformance/*.deck` inputs and must produce the SAME parse. That is what makes drift a
// test failure instead of something you discover when two hosts play the same file differently.
//
//   node test/conformance.mjs            # verify
//   node test/conformance.mjs --update   # regenerate the expected files
//
// A restricted implementation (see conformance/profiles.json) may REJECT a listed case, but any case
// it does not reject must match exactly. Rejecting is the honest option; parsing it differently is
// not.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { parseProgram, parseTrackBody } from "../dist/deck.js"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const dir = path.join(root, "conformance")
const update = process.argv.includes("--update")

/// The observable parse of one source: the program AST plus each track's parsed body, since body
/// rows are package-owned now and are where the implementations diverged most.
function snapshot(src) {
  const program = parseProgram(src)
  const trackBodies = program.tracks.map((t) => ({
    id: t.id,
    ...parseTrackBody(t.body)
  }))
  const clipBodies = program.clipBlocks.map((c) => ({
    clipId: c.clipId,
    ...parseTrackBody(c.body)
  }))
  return { program, trackBodies, clipBodies }
}

const cases = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(".deck"))
  .sort()

let failed = 0
let updated = 0

for (const file of cases) {
  const name = file.replace(/\.deck$/, "")
  const src = fs.readFileSync(path.join(dir, file), "utf8")
  const expectedPath = path.join(dir, `${name}.expected.json`)
  const actual = JSON.stringify(snapshot(src), null, 2) + "\n"

  if (update) {
    const prev = fs.existsSync(expectedPath) ? fs.readFileSync(expectedPath, "utf8") : null
    if (prev !== actual) {
      fs.writeFileSync(expectedPath, actual)
      updated++
      console.log(`updated ${name}`)
    }
    continue
  }

  if (!fs.existsSync(expectedPath)) {
    console.log(`FAIL ${name} — no expected file (run: node test/conformance.mjs --update)`)
    failed++
    continue
  }
  const expected = fs.readFileSync(expectedPath, "utf8")
  if (expected === actual) {
    console.log(`ok   ${name}`)
  } else {
    failed++
    console.log(`FAIL ${name}`)
    const a = expected.split("\n")
    const b = actual.split("\n")
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (a[i] !== b[i]) {
        console.log(`  line ${i + 1}\n    expected: ${a[i] ?? "<eof>"}\n    actual:   ${b[i] ?? "<eof>"}`)
        break
      }
    }
  }
}

// The profile manifest is part of the contract: a restricted implementation must account for every
// case, either by accepting it or by declaring (with a reason) that it rejects it. An unlisted case
// is the failure mode this catches — a subset silently growing a divergence.
if (!update) {
  const profiles = JSON.parse(fs.readFileSync(path.join(dir, "profiles.json"), "utf8")).profiles
  const names = cases.map((f) => f.replace(/\.deck$/, ""))
  for (const [profile, spec] of Object.entries(profiles)) {
    const accounted = new Set([...Object.keys(spec.mayReject ?? {}), ...(spec.mustAccept ?? [])])
    const missing = names.filter((n) => !accounted.has(n))
    if (missing.length) {
      failed++
      console.log(
        `FAIL profile "${profile}" — unaccounted case(s): ${missing.join(", ")}\n` +
          `  add each to mustAccept, or to mayReject with a reason`
      )
    } else {
      console.log(`ok   profile ${profile} (${names.length} cases accounted)`)
    }
  }
}

if (update) {
  console.log(updated ? `${updated} updated` : "already up to date")
  process.exit(0)
}
if (failed) {
  console.log(`\n${failed} FAILED`)
  process.exit(1)
}
console.log(`\nCONFORMANCE_OK — ${cases.length} cases`)
