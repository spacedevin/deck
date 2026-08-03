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

// `--target rust-lib` needs a tish that has it (tishlang/tish#588). Point TISH_BIN at a local build
// while that is still unreleased.
const tish = process.env.TISH_BIN ?? "tish"
try {
  execFileSync(tish, ["build", "src/index.tish", "--target", "rust-lib", "-o", out], {
    cwd: root,
    stdio: "inherit"
  })
} catch (e) {
  console.error(
    `\n\`${tish} build --target rust-lib\` failed.\n` +
      `Requires @tishlang/tish with the rust-lib emit (tishlang/tish#588).\n` +
      `Set TISH_BIN to a build that has it, e.g.\n` +
      `  TISH_BIN=../tish/target/debug/tish npm run build:rust\n`
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

// The crate runs the SAME corpus as the JS build — that is the whole point of emitting it from one
// source. Ship the fixtures inside the crate so `cargo test` works from a published copy too.
fs.mkdirSync(path.join(out, "tests"), { recursive: true })
fs.copyFileSync(path.join(root, "rust/conformance.rs"), path.join(out, "tests/conformance.rs"))
fs.cpSync(path.join(root, "conformance"), path.join(out, "conformance"), { recursive: true })

// Rewrite the generated manifest: real crate name, version tracking the npm package, and the
// metadata crates.io needs. The emitter's `tishlang_runtime` dep line (path + version) is kept.
const manifestPath = path.join(out, "Cargo.toml")
let manifest = fs.readFileSync(manifestPath, "utf8")
const deps = manifest.slice(manifest.indexOf("[dependencies]"))
manifest = `[package]
name = "${CRATE_NAME}"
version = "${pkg.version}"
edition = "2021"
license = "${pkg.license}"
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

const pubFns = (fs.readFileSync(libPath, "utf8").match(/^pub fn /gm) ?? []).length
console.log(`crate: ${CRATE_NAME} v${pkg.version} — ${pubFns} exported fns + typed facade`)
