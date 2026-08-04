#!/usr/bin/env node
// Emit the `deckfile` Rust crate from the same `src/index.tish` the JS bundle is built from.
//
// Mirrors what append-exports.mjs does for the JS build: run the compiler, then post-process. The
// generated `src/lib.rs` is fully overwritten every time, so anything hand-written (the typed facade,
// the conformance test) is copied in here rather than living inside the generated file.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { execFileSync } from "node:child_process"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const out = path.join(root, "crate")
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"))

// `deck-core` is taken on crates.io; `deckfile` is free and matches this repo's own src/deckfile/.
const CRATE_NAME = "deckfile"

fs.rmSync(out, { recursive: true, force: true })

// `--target rust-lib` needs @tishlang/tish >= 3.2 (tishlang/tish#588), which is the package's own
// dependency floor — so the dev-dependency binary on PATH is the right one by default. TISH_BIN
// stays available for testing an unreleased compiler build.
const tish = process.env.TISH_BIN ?? "tish"
try {
  // `--feature ""` = no runtime capabilities. Omitting it inherits whatever the tish BINARY was
  // built with (fs/http/process/regex/tty/ws), which drags tokio + reqwest + rustls into what is a
  // pure text parser — a very expensive transitive dependency for a build-time proc-macro consumer.
  // The empty set is also what keeps codegen from emitting feature-gated prelude imports.
  execFileSync(tish, ["build", "src/index.tish", "--target", "rust-lib", "--feature", "", "-o", out], {
    cwd: root,
    stdio: "inherit"
  })
} catch (e) {
  console.error(
    `\n\`${tish} build --target rust-lib\` failed.\n` +
      `Requires @tishlang/tish >= 3.2 (the rust-lib emit, tishlang/tish#588).\n` +
      `Run \`npm ci\` so the dev dependency is on PATH, or point TISH_BIN at a build that has it:\n` +
      `  TISH_BIN=../tish/target/release/tish npm run build:rust\n`
  )
  process.exit(1)
}

const libPath = path.join(out, "src/lib.rs")
if (!fs.existsSync(libPath)) {
  console.error("tish did not emit src/lib.rs")
  process.exit(1)
}

// The facade is the only hand-written Rust in the crate. It reads `Value` into structs and must
// never grow parsing logic — see rust/facade.rs.
fs.copyFileSync(path.join(root, "rust/facade.rs"), path.join(out, "src/facade.rs"))
fs.appendFileSync(
  libPath,
  "\n// ── Typed facade (hand-written; see the deck repo's rust/facade.rs) ───────────\npub mod facade;\npub use facade::{parse, BarSelector, BodyRow, Clip, DeckProgram, Directive, GenBlock, Params, ParseError, Track};\n"
)


/// Rust-facing README. Deliberately not the npm one: a Rust consumer needs `parse()` and the typed
/// rows, not `npm install` and the Tish import path.
function crateReadme() {
  return `# deckfile

Parser for the **\`.deck\`** patch language — the Rust target of [@spacedevin/deck][npm].

\`\`\`toml
[dependencies]
deckfile = "${CRATE_VERSION}"
\`\`\`

\`\`\`rust
let program = deckfile::parse(source);

println!("{:?} bpm", program.bpm);
for track in &program.tracks {
    println!("{} ({}) — {} bars", track.name, track.generator_id, track.loop_bars.unwrap_or(1));
    for row in &track.body {
        match row {
            deckfile::BodyRow::Note { midi, start_beat, dur_beats, .. } => { /* … */ }
            deckfile::BodyRow::Steps { on, .. } => { /* … */ }
            _ => {}
        }
    }
}
\`\`\`

\`parse\` never fails: malformed lines land in \`program.errors\`, because a streaming host has to be
able to parse a partial program.

## Generated — one source, three targets

Everything here except the typed facade is **generated** from the same \`src/index.tish\` that
produces the npm package, using \`tish build --target rust-lib\`. Rust, JavaScript and Tish consumers
therefore parse \`.deck\` identically by construction rather than by discipline, and a
[shared conformance corpus][conf] — the same \`.deck\` inputs with the same expected parses — is run
against every target on every change.

Don't send patches here; fix the language upstream in [spacedevin/deck][repo].

## Scope

Tokenize · parse to an AST · track/clip body lines as typed rows · format helpers · scale vocabulary ·
bar selectors · Euclidean fill · highlight classification · host registries.

**Not** included, by design: applying the AST to a project model, emitting \`.deck\` text, audio
engines, instrument catalogs. Those belong to the host — see [HOST.md][host].

Hosts extend the language through registries rather than forking it:
\`registerTopLevelStatement\`, \`registerBodyLineDialect\`, \`registerGenBlockDialect\`,
\`registerGeneratorIdAliases\`, \`registerBuiltinMacros\`.

## Docs

- [Language grammar][grammar] — the canonical \`.deck\` surface
- [Host integration][host] — boot order and what a host implements
- [gen_block extensions][ext] — dialect registration

## License

Pay It Forward (PIF) — see LICENSE. Same license as [tish][tish].

[npm]: https://www.npmjs.com/package/@spacedevin/deck
[repo]: https://github.com/spacedevin/deck
[conf]: https://github.com/spacedevin/deck/tree/main/conformance
[grammar]: https://github.com/spacedevin/deck/blob/main/docs/DECK_GRAMMAR.md
[host]: https://github.com/spacedevin/deck/blob/main/docs/HOST.md
[ext]: https://github.com/spacedevin/deck/blob/main/docs/DECK_EXTENSION.md
[tish]: https://github.com/tishlang/tish
`
}

// The crate runs the SAME corpus as the JS build — that is the whole point of emitting it from one
// source. Ship the fixtures inside the crate so `cargo test` works from a published copy too.
fs.mkdirSync(path.join(out, "tests"), { recursive: true })
fs.copyFileSync(path.join(root, "rust/conformance.rs"), path.join(out, "tests/conformance.rs"))
fs.cpSync(path.join(root, "conformance"), path.join(out, "conformance"), { recursive: true })

// Expose the corpus as embedded data, not just files on disk.
//
// A restricted implementation — tish-gba bakes a subset of the language — has to be able to run the
// same corpus and prove its `profiles.json` entry is honest: that it accepts everything it does not
// declare it rejects. It cannot read this crate's files (a dependency's data is not reachable from a
// consumer), so `include_str!` them and hand them over.
{
  const dir = path.join(root, "conformance")
  const names = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".deck"))
    .map((f) => f.replace(/\.deck$/, ""))
    .sort()
  const rows = names
    .map(
      (n) =>
        `    Case { name: ${JSON.stringify(n)}, ` +
        `source: include_str!("../conformance/${n}.deck"), ` +
        `expected: include_str!("../conformance/${n}.expected.json") },`
    )
    .join("\n")
  fs.writeFileSync(
    path.join(out, "src/corpus.rs"),
    `//! The conformance corpus, embedded.
//!
//! GENERATED — see the deck repo's scripts/build-rust.mjs.
//!
//! Every implementation of the \`.deck\` language runs these same inputs. A consumer that supports a
//! SUBSET (tish-gba bakes to two sound chips) uses [\`profiles\`] to declare which cases it may reject
//! and why; anything it does not declare, it must accept and parse identically.

/// One corpus case: the source, and the expected parse as JSON.
pub struct Case {
    pub name: &'static str,
    pub source: &'static str,
    pub expected: &'static str,
}

/// Every case, sorted by name.
pub fn cases() -> &'static [Case] {
    &CASES
}

/// \`profiles.json\` verbatim — which cases a restricted profile may reject, and why.
pub fn profiles() -> &'static str {
    include_str!("../conformance/profiles.json")
}

static CASES: [Case; ${names.length}] = [
${rows}
];
`
  )
  fs.appendFileSync(libPath, "pub mod corpus;\n")
}

// Rewrite the generated manifest: real crate name, version tracking the npm package, and the
// metadata crates.io needs.
//
// The runtime dep is rewritten to VERSION-ONLY. The emitter writes an absolute `path` to whichever
// tish checkout produced the crate (`/Users/…/node_modules/@tishlang/tish/crates/tish_runtime`),
// which resolves on exactly one machine — the same sibling-checkout trap that made tish-apple
// unbuildable from a clone. A published crate cannot carry a path at all.
//
// The version must match the tish that GENERATED this crate, since the emitted code targets that
// runtime's API. Override with DECKFILE_RUNTIME_VERSION when generating with a different tish.
const RUNTIME_VERSION = process.env.DECKFILE_RUNTIME_VERSION ?? "3.2"
// package.json's version is a placeholder that release CI overwrites from the tag, so the crate
// takes its version from the same place — DECKFILE_VERSION — keeping the npm package and the crate
// on one number per release.
const CRATE_VERSION = process.env.DECKFILE_VERSION ?? pkg.version
const manifestPath = path.join(out, "Cargo.toml")
let manifest = fs.readFileSync(manifestPath, "utf8")
const deps = `[dependencies]\ntishlang_runtime = "${RUNTIME_VERSION}"\n`
// `license-file`, not `license`: PIF is not an SPDX identifier, so an SPDX field would either be
// rejected or misreport the terms. Same approach tish itself uses.
manifest = `[package]
name = "${CRATE_NAME}"
version = "${CRATE_VERSION}"
edition = "2021"
license-file = "LICENSE"
readme = "README.md"
description = "${pkg.description}"
repository = "${pkg.repository.url}"
keywords = ["deck", "tish", "parser", "music"]
categories = ["parser-implementations"]

# GENERATED from https://github.com/spacedevin/deck — do not edit by hand.
# Everything except src/facade.rs is emitted from src/index.tish by \`npm run build:rust\`,
# so this crate and the npm package @spacedevin/deck parse .deck identically by construction.

[lib]
name = "${CRATE_NAME}"
crate-type = ["rlib"]
path = "src/lib.rs"

${deps}`
fs.writeFileSync(manifestPath, manifest)

// A published crate needs its own LICENSE and README in the package — crates.io renders the README
// on the crate page and cannot reach back into the repo for either.
fs.copyFileSync(path.join(root, "LICENSE"), path.join(out, "LICENSE"))
fs.writeFileSync(path.join(out, "README.md"), crateReadme())

const pubFns = (fs.readFileSync(libPath, "utf8").match(/^pub fn /gm) ?? []).length
console.log(`crate: ${CRATE_NAME} v${CRATE_VERSION} — ${pubFns} exported fns + typed facade`)
