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

const PUBLIC = [
  "tokenize",
  "isNumberToken",
  "parseProgram",
  "formatTplBeat",
  "formatTplFloat",
  "normalizeGeneratorId",
  "generatorIdToDeck",
  "registerGeneratorIdAliases",
  "clearGeneratorIdAliases",
  "registerParamKeyAliases",
  "clearParamKeyAliases",
  "camelToSnake",
  "snakeToCamel",
  "paramKeyToCamel",
  "parseBarSelector",
  "barSelectorMatches",
  "euclideanPattern",
  "parseGenBlock",
  "registerGenBlockDialect",
  "clearGenBlockDialects",
  "registerBuiltinMacros",
  "clearBuiltinMacros",
  "builtinMacros",
  "lookupMacro",
  "expandMacroBody",
  "classifyLine",
  "isKeyword",
  "isInlineKeyword",
  "isStepToken",
  "registerHighlightKeywords",
  "parseScaleRoot",
  "scaleRootNames",
  "scaleModeNames",
  "scaleIntervals"
]

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
