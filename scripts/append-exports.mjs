#!/usr/bin/env node
// Replace any trailing export {…} with the public API surface (tish may emit one;
// a stale append must never leave duplicate/undefined names).
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const p = path.join(root, "dist/deck.js")
if (!fs.existsSync(p)) {
  console.error("missing dist/deck.js")
  process.exit(1)
}

// The public surface is `src/index.tish` — read it, don't restate it. A second hand-maintained copy
// of the export list drifts: an export added to the barrel would silently not reach `dist/deck.js`.
const PUBLIC = readPublicExports(path.join(root, "src/index.tish"))

/// Collect the names from every `export { a, b } from "./x.tish"` in the barrel module.
function readPublicExports(indexPath) {
  const src = fs.readFileSync(indexPath, "utf8")
  const names = []
  for (const block of src.matchAll(/export\s*\{([^}]*)\}\s*from/g)) {
    for (const spec of block[1].split(",")) {
      // `a as b` re-exports under `b`; a bare name exports itself.
      const name = spec.trim().split(/\s+as\s+/).pop().trim()
      if (name) names.push(name)
    }
  }
  if (!names.length) {
    console.error(`no exports found in ${indexPath}`)
    process.exit(1)
  }
  return names
}

let src = fs.readFileSync(p, "utf8")
// Drop trailing export lines (tish + any prior append).
while (/\nexport\s*\{[^}]*\}\s*;?\s*$/.test(src)) {
  src = src.replace(/\nexport\s*\{[^}]*\}\s*;?\s*$/, "\n")
}
src = src.replace(/\s+$/, "\n")
src += `\nexport { ${PUBLIC.join(", ")} };\n`
fs.writeFileSync(p, src)

// Sanity: every public name must be defined as a function in the bundle.
let missing = []
for (const name of PUBLIC) {
  if (!new RegExp(`function\\s+${name}\\s*\\(`).test(src)) {
    missing.push(name)
  }
}
if (missing.length) {
  console.error("build missing functions:", missing.join(", "))
  process.exit(1)
}
console.log("exports:", PUBLIC.length, "ok")
