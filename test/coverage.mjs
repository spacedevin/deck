#!/usr/bin/env node
// Full API + grammar coverage against dist/deck.js (run after `npm run build`).
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  tokenize,
  isNumberToken,
  parseProgram,
  formatTplBeat,
  formatTplFloat,
  normalizeGeneratorId,
  generatorIdToDeck,
  registerGeneratorIdAliases,
  clearGeneratorIdAliases,
  registerParamKeyAliases,
  clearParamKeyAliases,
  camelToSnake,
  snakeToCamel,
  paramKeyToCamel,
  parseBarSelector,
  barSelectorMatches,
  euclideanPattern,
  parseGenBlock,
  registerGenBlockDialect,
  clearGenBlockDialects,
  registerBuiltinMacros,
  clearBuiltinMacros,
  builtinMacros,
  lookupMacro,
  expandMacroBody,
  classifyLine,
  isKeyword,
  isInlineKeyword,
  isStepToken,
  registerHighlightKeywords,
  parseScaleRoot,
  scaleRootNames,
  scaleModeNames,
  scaleIntervals,
  parseBodyLine,
  parseTrackBody,
  parseBoolish,
  registerBodyLineDialect,
  clearBodyLineDialects,
  registerTopLevelStatement,
  clearTopLevelStatements,
  harmonicTable,
  decodeWaveHex,
  encodeWaveHex
} from "../dist/deck.js"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
let failed = 0
function check(name, cond) {
  if (cond) {
    console.log("ok  - " + name)
  } else {
    failed += 1
    console.log("FAIL - " + name)
  }
}
function eq(a, b) {
  return a === b
}
function deepEq(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

// —— reset registries ——
clearGeneratorIdAliases()
clearParamKeyAliases()
clearGenBlockDialects()
clearBuiltinMacros()

// —— tokenize / isNumberToken ——
check("tokenize empty-ish", deepEq(tokenize("  "), []))
check("tokenize words", deepEq(tokenize("bpm 120"), ["bpm", "120"]))
check("tokenize tabs", deepEq(tokenize("a\tb"), ["a", "b"]))
check("isNumberToken empty", isNumberToken("") === false)
check("isNumberToken int", isNumberToken("12") === true)
check("isNumberToken float", isNumberToken("1.5") === true)
check("isNumberToken nan", isNumberToken("x") === false)

// —— format ——
check("formatTplBeat nan", formatTplBeat(NaN) === "0")
check("formatTplBeat non-number", formatTplBeat("x") === "0")
check("formatTplBeat zero", formatTplBeat(0) === "0")
check("formatTplBeat quarter", formatTplBeat(0.25) === "0.25")
check("formatTplBeat int strip dot", formatTplBeat(1) === "1")
check("formatTplBeat snap", formatTplBeat(1 / 3).length > 0)
check("formatTplFloat nan", formatTplFloat(NaN) === "0")
check("formatTplFloat non-number", formatTplFloat(null) === "0")
check("formatTplFloat zero", formatTplFloat(0) === "0")
check("formatTplFloat int strip dot", formatTplFloat(2) === "2")
check("formatTplFloat trim", formatTplFloat(1.5) === "1.5")
check("formatTplFloat round", formatTplFloat(0.12345) === "0.1235")

// —— scale ——
check("scaleRootNames len", scaleRootNames().length === 12)
check("scaleModeNames len", scaleModeNames().length === 12)
check("parseScaleRoot null", parseScaleRoot(null) === null)
check("parseScaleRoot undefined", parseScaleRoot(undefined) === null)
check("parseScaleRoot C", parseScaleRoot("C") === 0)
check("parseScaleRoot D", parseScaleRoot("D") === 2)
check("parseScaleRoot E", parseScaleRoot("E") === 4)
check("parseScaleRoot F", parseScaleRoot("F") === 5)
check("parseScaleRoot G", parseScaleRoot("G") === 7)
check("parseScaleRoot A", parseScaleRoot("A") === 9)
check("parseScaleRoot B", parseScaleRoot("B") === 11)
check("parseScaleRoot Bb", parseScaleRoot("Bb") === 10)
check("parseScaleRoot F#", parseScaleRoot("F#") === 6)
check("parseScaleRoot fs", parseScaleRoot("Fs") === 6)
check("parseScaleRoot fs-S", parseScaleRoot("FS") === 6)
check("parseScaleRoot db", parseScaleRoot("Db") === 1)
check("parseScaleRoot pc", parseScaleRoot("0") === 0)
check("parseScaleRoot pc11", parseScaleRoot("11") === 11)
check("parseScaleRoot bad pc", parseScaleRoot("99") === null)
check("parseScaleRoot bad letter", parseScaleRoot("Z") === null)
check("parseScaleRoot empty", parseScaleRoot("") === null)

const modes = [
  ["major", 7],
  ["ionian", 7],
  ["minor", 7],
  ["aeolian", 7],
  ["dorian", 7],
  ["phrygian", 7],
  ["lydian", 7],
  ["mixolydian", 7],
  ["locrian", 7],
  ["harmonic_minor", 7],
  ["harmonicminor", 7],
  ["melodic_minor", 7],
  ["melodicminor", 7],
  ["pentatonic_major", 5],
  ["penta_major", 5],
  ["majpenta", 5],
  ["pentatonic_minor", 5],
  ["penta_minor", 5],
  ["minpenta", 5],
  ["blues", 6],
  ["unknown", 12]
]
for (const [m, n] of modes) {
  check("scaleIntervals " + m, scaleIntervals(m).length === n)
}

// —— registries ——
check("normalize passthrough", normalizeGeneratorId("noise_burst") === "noise_burst")
check("generatorIdToDeck passthrough", generatorIdToDeck("noiseBurst") === "noiseBurst")
registerGeneratorIdAliases(null, null)
registerGeneratorIdAliases(
  { matrix_fm: "matrixFm", Matrix_FM: "matrixFm" },
  { matrixFm: "matrix_fm" }
)
check("normalize case", normalizeGeneratorId("MATRIX_FM") === "matrixFm" || normalizeGeneratorId("matrix_fm") === "matrixFm")
check("normalize exact", normalizeGeneratorId("matrix_fm") === "matrixFm")
check("emit alias", generatorIdToDeck("matrixFm") === "matrix_fm")
clearGeneratorIdAliases()
check("cleared aliases", normalizeGeneratorId("matrix_fm") === "matrix_fm")

registerParamKeyAliases(null)
registerParamKeyAliases({ mod_index: "modIndex", pitch_follow: "pitchFollow" })
check("param alias", paramKeyToCamel("mod_index") === "modIndex")
check("param snake", paramKeyToCamel("filter_cutoff") === "filterCutoff")
check("param plain", paramKeyToCamel("gain") === "gain")
check("snakeToCamel", snakeToCamel("a_b_c") === "aBC")
check("snakeToCamel empty parts", snakeToCamel("a__b") === "aB" || snakeToCamel("a__b").includes("B"))
check("camelToSnake", camelToSnake("modIndex") === "mod_index")
clearParamKeyAliases()
check("param after clear uses snake", paramKeyToCamel("mod_index") === "modIndex")

// —— bar selectors ——
check("bar even", parseBarSelector("even").kind === "mod" && parseBarSelector("even").b === 0)
check("bar odd", parseBarSelector("odd").b === 1)
check("bar all n", parseBarSelector("n").kind === "all")
check("bar all *", parseBarSelector("*").kind === "all")
check("bar all all", parseBarSelector("all").kind === "all")
check("bar all every", parseBarSelector("every").kind === "all")
check("bar list", deepEq(parseBarSelector("0,2,3").list, [0, 2, 3]))
check("bar list skip nan", parseBarSelector("0,x,2").list.includes(0))
check("bar 2n+1", parseBarSelector("2n+1").kind === "mod")
check("bar 4n", parseBarSelector("4n").kind === "mod")
check("bar -n+3", parseBarSelector("-n+3").kind === "first" && parseBarSelector("-n+3").b === 3)
check("bar 0n → all", parseBarSelector("0n").kind === "all")
check("bar eq", parseBarSelector("2").kind === "eq" && parseBarSelector("2").n === 2)
check("bar fallback all", parseBarSelector("??? ").kind === "all" || parseBarSelector("nope").kind === "all")
check("match null desc", barSelectorMatches(null, 0) === true)
check("match all", barSelectorMatches({ kind: "all" }, 9) === true)
check("match eq", barSelectorMatches({ kind: "eq", n: 2 }, 2) === true)
check("match eq miss", barSelectorMatches({ kind: "eq", n: 2 }, 1) === false)
check("match first", barSelectorMatches({ kind: "first", b: 2 }, 1) === true)
check("match first miss", barSelectorMatches({ kind: "first", b: 2 }, 2) === false)
check("match list", barSelectorMatches({ kind: "list", list: [1, 3] }, 3) === true)
check("match list miss", barSelectorMatches({ kind: "list", list: [1, 3] }, 2) === false)
check("match mod", barSelectorMatches({ kind: "mod", a: 2, b: 0 }, 4) === true)
check("match mod a<=0", barSelectorMatches({ kind: "mod", a: 0, b: 0 }, 4) === true)
check("match unknown kind", barSelectorMatches({ kind: "weird" }, 0) === true)

// —— euclidean ——
check("euclid n<=0", deepEq(euclideanPattern(3, 0), []))
check("euclid k<=0", deepEq(euclideanPattern(0, 4), [false, false, false, false]))
check("euclid k>=n", deepEq(euclideanPattern(4, 4), [true, true, true, true]))
check("euclid 5/16 count", euclideanPattern(5, 16).filter(Boolean).length === 5)

// —— gen_block ——
check("parseGenBlock raw", parseGenBlock("patch", ["osc"]).kind === "patch")
registerGenBlockDialect(null, null)
registerGenBlockDialect("solo", null)
registerGenBlockDialect(false, (id, lines) => ({ kind: "nope" }))
registerGenBlockDialect(0, (id, lines) => ({ kind: "nope" }))
registerGenBlockDialect("soloId", (id, lines) => ({ kind: "solo", id, lines }))
check("dialect string id", parseGenBlock("soloId", ["a"]).kind === "solo")
check("dialect false ids ignored", parseGenBlock("nope", ["a"]).kind === "nope" || parseGenBlock("nope", ["a"]).version === 1)
registerGenBlockDialect(["matrixFm", "matrix_fm"], (generatorId, lines) => ({
  kind: "matrixFm",
  tplHeaderId: generatorId,
  version: 2,
  raw: lines,
  graph: { n: lines.length }
}))
registerGeneratorIdAliases({ matrix_fm: "matrixFm" }, { matrixFm: "matrix_fm" })
check("dialect via alias", parseGenBlock("matrix_fm", ["op 1"]).kind === "matrixFm")
check("dialect via raw lower", parseGenBlock("MATRIX_FM", ["op 1"]).kind === "matrixFm" || parseGenBlock("matrixFm", ["op"]).kind === "matrixFm")
clearGenBlockDialects()
check("cleared dialect", parseGenBlock("matrix_fm", ["op"]).version === 1)

// —— macros ——
clearBuiltinMacros()
check("builtinMacros empty", Object.keys(builtinMacros()).length === 0)
registerBuiltinMacros(null)
check("register null builtins", Object.keys(builtinMacros()).length === 0)
registerBuiltinMacros({
  soft: { params: { tone: 0.2, gain: 1 }, body: ["gain a1 $tone", "level $gain"] }
})
check("lookup builtin", lookupMacro("soft", null) !== null)
check("lookup user wins", lookupMacro("soft", { soft: { params: {}, body: ["user"] } }).body[0] === "user")
check("lookup miss", lookupMacro("nope", {}) === null)
let expanded = expandMacroBody(
  { params: { tone: 0.2, gain: 1 }, body: ["g $tone", "l $gain"] },
  { tone: 0.5 }
)
check("expand override", expanded[0] === "g 0.5" && expanded[1] === "l 1")
check("expand no overrides", expandMacroBody({ params: { a: 1 }, body: ["$a"] }, null)[0] === "1")
clearBuiltinMacros()

// —— highlight ——
check("isKeyword top", isKeyword("bpm") === true)
check("isKeyword body", isKeyword("steps") === true)
check("isKeyword miss", isKeyword("conn") === false)
check("isInlineKeyword bar", isInlineKeyword("bar") === true)
check("isInlineKeyword miss", isInlineKeyword("zzz") === false)
check("isStepToken set", isStepToken("x") && isStepToken("X") && isStepToken(".") && isStepToken("1") && isStepToken("0"))
check("isStepToken miss", isStepToken("euclid") === false)
check("classify null", classifyLine(null).kind === "plain")
check("classify undefined", classifyLine(undefined).kind === "plain")
check("classify empty", classifyLine("   ").kind === "plain")
check("classify steps", classifyLine("steps x . x .").kind === "steps")
check("classify note", classifyLine("note 60 0 1 v 80").kind === "note")
check("classify keyword", classifyLine("bpm 120").kind === "keyword")
check("classify plain", classifyLine("foobar 1").kind === "plain")
registerHighlightKeywords(null)
registerHighlightKeywords({})
registerHighlightKeywords({ top: ["weird_top"], body: ["conn", "osc"], inline: ["dur"] })
check("registered top kw", isKeyword("weird_top") === true)
check("registered body kw", isKeyword("conn") === true)
check("registered inline", isInlineKeyword("dur") === true)

// —— parseProgram: empty / null ——
check("parse nullish", parseProgram(null).tracks.length === 0)
check("parse undefined", parseProgram(undefined).tplVersion === 0)
check("comment strip", parseProgram("bpm 100 # tempo\n").bpm === 100)
check("trailing cr whitespace", parseProgram("bpm 99  \r\n").bpm === 99)
check("trailing tab whitespace", parseProgram("track t id c0 gen g\n  mix gain 1\t\n").tracks[0].body.length === 1)

// —— parseProgram: golden fixture ——
const golden = fs.readFileSync(path.join(root, "fixtures/golden.deck"), "utf8")
registerGeneratorIdAliases({ noise_burst: "noiseBurst", fm: "fmTone", patch: "patch" }, {})
let g = parseProgram(golden)
check("golden version", g.tplVersion === 1)
check("golden bpm", g.bpm === 118)
check("golden swing", g.swing === 0.08)
check("golden scale", g.scaleRoot === 0 && g.scaleMode === "minor")
check("golden xfade", g.xfade && g.xfade.x === 0.5 && g.xfade.y === 0.5)
check("golden mainDeck", g.mainDeck === "live")
check("golden launchQuant", g.launchQuant === 1)
check("golden songSeed", g.songSeed === 42)
check("golden deckMix A", g.deckMix && g.deckMix.A && g.deckMix.A.hi === 0)
check("golden tracks", g.tracks.length >= 3)
check("golden kick *", g.tracks[0].id === "c0")
check("golden bass *2", g.tracks[1].loopBars === 2)
check("golden genBlocks", g.tracks[2].genBlocks.length === 1)
check("golden macros", g.macros.soft_lead !== undefined)
check("golden session", g.sessionSceneCount === 4 && g.sessionSlots.length >= 2)
check("golden clip", g.clipBlocks.length === 1 && g.clipBlocks[0].displayName === "Kick A")
check("golden song", Array.isArray(g.song) && g.song.length >= 3)
check("golden follow", Array.isArray(g.follow) && g.follow.length >= 2)
check("golden autos", g.autos.length >= 2)
check("golden masterMix", Array.isArray(g.masterMixTokens))
check("golden actorMix", g.actorMixRows.length >= 1)
check("golden remove_track", g.removeTrackIds.includes("obsolete"))

// —— parseProgram: individual statement edges ——
check("tpl alias", parseProgram("tpl 2\n").tplVersion === 2)
check("deck alone", parseProgram("deck\n").tplVersion === 0)
check("bpm alone", parseProgram("bpm\n").bpm === null)
check("xfade one", parseProgram("xfade 0.2\n").xfade.y === 0.5)
check("main_deck local", parseProgram("main_deck local\n").mainDeck === "local")
check("main_deck other → live", parseProgram("main_deck cue\n").mainDeck === "live")
check("scale off", parseProgram("scale off\n").scaleRoot === -1)
check("scale none", parseProgram("scale none\n").scaleMode === "off")
check("scale chromatic", parseProgram("scale chromatic\n").scaleRoot === -1)
check("scale incomplete", parseProgram("scale C\n").scaleRoot === null)
check("deck_mix skip bad", parseProgram("deck_mix X hi 1\n").deckMix === null)
check("remove_track err", parseProgram("remove_track\n").errors.length >= 1)
check("track multiword", parseProgram("track MOS 6581 id c9 gen fm\n").tracks[0].name === "MOS 6581")
check("track * inf", parseProgram("track t id c1 gen fm * inf\n").tracks[0].loopBars === null)
check("track * infinite", parseProgram("track t id c1 gen fm * infinite\n").tracks[0].loopBars === null)
check("track * bad n", parseProgram("track t id c1 gen fm * 0\n").errors.length >= 1)
check("track * bad tok", parseProgram("track t id c1 gen fm * nope\n").errors.length >= 1)
check("track gen params", parseProgram("track t id c1 gen mac a 1 b two\n").tracks[0].genParams.a === 1)
check("track missing header", parseProgram("track alone\n").errors.some((e) => e.msg.includes("track:")))
check("clip bars fix", parseProgram("clip c channel x bars 0\n").clipBlocks[0].bars === 1)
check("session clear -", parseProgram("session_slot a 0 -\n").sessionSlots[0].clipId === "")
check("session clear .", parseProgram("session_slot a 0 .\n").sessionSlots[0].clipId === "")
check("end gen_block orphan", parseProgram("end gen_block\n").errors.some((e) => e.msg.includes("end gen_block")))
check("unexpected top", parseProgram("zzz 1\n").errors.some((e) => e.msg.includes("unexpected")))
check("unclosed gen_block", parseProgram("track t id c0 gen p\n  gen_block patch\n    osc\n").errors.some((e) => e.msg.includes("unclosed")))

let songP = parseProgram("song\n  P1\n  p2 x3\n  4\n  bad\n  P9 x0\n")
check("song entries", songP.song && songP.song.length >= 3)
check("song repeat fix", songP.song.some((e) => e.repeat === 1))

let followP = parseProgram("follow\n  P1 next 1\n  2 jump 0.5 stay 0.5\n  bad\n")
check("follow entries", followP.follow && followP.follow.length >= 2)

let autoP = parseProgram("auto master_gain\n  0 1\n  x y\n")
check("auto points", autoP.autos[0].points.length === 1)

let macP = parseProgram("macro m a=1 b=hi c=\n  line $a\nend macro\nbpm 1\n")
check("macro params number", macP.macros.m.params.a === 1)
check("macro params string", macP.macros.m.params.b === "hi")

let blankIndented = parseProgram("track t id c0 gen g\n  \n  mix gain 1\n")
check("blank indented skip", blankIndented.tracks[0].body.length === 1)

// launch_quant / song_seed alone
check("launch alone", parseProgram("launch_quant\n").launchQuant === null)
check("song_seed alone", parseProgram("song_seed\n").songSeed === null)
check("swing alone", parseProgram("swing\n").swing === null)
check("scale alone", parseProgram("scale\n").scaleRoot === null)

// Macro numeric empty value stays string path: c= → empty string → Number("") is 0 which is nan? Number("")===0 actually
// Covered via c=

// ── Comments: `#` only starts one at column 0 or after whitespace ──────────────
// Cutting at the first `#` anywhere truncated any token containing one, so `scale F# minor` became
// `scale F` — no scale set, and no error to say so.
check("sharp root survives", parseProgram("scale F# minor\n").scaleRoot === 6)
check("sharp root mode", parseProgram("scale F# minor\n").scaleMode === "minor")
check("sharp root == flat spelling", parseProgram("scale Gb minor\n").scaleRoot === 6)
let sharpName = parseProgram("track C# Lead id c1 gen fm\n")
check("sharp track name", sharpName.tracks[0].name === "C# Lead")
check("sharp track parses", sharpName.errors.length === 0)
check("trailing comment cut", parseProgram("bpm 120  # tempo\n").bpm === 120)
check("column-0 comment", parseProgram("# note\nbpm 90\n").bpm === 90)
check("column-0 comment no err", parseProgram("# note\nbpm 90\n").errors.length === 0)

// ── Control directives are collected, not errors ──────────────────────────────
let dir = parseProgram("@ transport play\n@ launch scene 2\n@ perf_step 16\nbpm 120\n")
check("directives collected", dir.directives.length === 3)
check("directive verb", dir.directives[0].verb === "transport")
check("directive tokens", dir.directives[1].tokens.join(" ") === "scene 2")
check("directives no errors", dir.errors.length === 0)
check("directives do not block parse", dir.bpm === 120)
check("bare @ errors", parseProgram("@\n").errors.some((e) => e.msg.includes("directive verb")))

// ── Track header: `* N` and key/value params in any order ────────────────────
// `* N` was only recognized in the first slot; anywhere else it became a param literally named `*`,
// so the pattern length silently became 1.
const hdr = (s) => parseProgram(s).tracks[0]
check("star first", hdr("track P id p gen g * 16 layer 0\n").loopBars === 16)
check("star last", hdr("track P id p gen g layer 0 * 16\n").loopBars === 16)
check("star middle", hdr("track P id p gen g layer 0 * 4 cutoff 900\n").loopBars === 4)
check("star last keeps params", hdr("track P id p gen g layer 0 * 16\n").genParams.layer === 0)
check("star middle keeps params", hdr("track P id p gen g layer 0 * 4 cutoff 900\n").genParams.cutoff === 900)
check("star is not a param", hdr("track P id p gen g layer 0 * 16\n").genParams["*"] === undefined)
check("inf last", hdr("track P id p gen g layer 2 * inf\n").loopBars === null)
check("infinite last", hdr("track P id p gen g layer 2 * infinite\n").loopBars === null)
check("no star", hdr("track P id p gen g layer 0\n").loopBars === null)
// A `*` that names no length is an error, not a silently dropped token.
check(
  "star zero errors",
  parseProgram("track P id p gen g layer 0 * 0\n").errors.some((e) => e.msg.includes("positive integer"))
)
check(
  "star non-numeric errors",
  parseProgram("track P id p gen g layer 0 * zz\n").errors.some((e) => e.msg.includes("inf/infinite"))
)
check(
  "bare trailing star errors",
  parseProgram("track P id p gen g layer 0 *\n").errors.some((e) => e.msg.includes("inf/infinite"))
)
// An odd trailing token (no value) is skipped rather than looping forever.
check("odd trailing token", hdr("track P id p gen g layer 0 dangling\n").genParams.layer === 0)

// ── Body lines ────────────────────────────────────────────────────────────────
const body = (s) => parseBodyLine(tokenize(s))

check("boolish 1", parseBoolish("1") === true)
check("boolish true", parseBoolish("true") === true)
check("boolish on", parseBoolish("on") === true)
check("boolish yes", parseBoolish("yes") === true)
check("boolish off", parseBoolish("off") === false)

let mx = body("mix gain 0.9 pan -0.2 mute on solo 0 eq_lo 1 eq_mid 2 eq_hi 3")
check("mix gain", mx.gain === 0.9)
check("mix pan", mx.pan === -0.2)
check("mix mute", mx.mute === true)
check("mix solo", mx.solo === false)
check("mix eq", mx.eqLo === 1 && mx.eqMid === 2 && mx.eqHi === 3)
check("mix absent is null", body("mix gain 1").pan === null)
check("mix bad number", body("mix gain nope").gain === null)

let st = body("steps x . . . X . . . 1 . . . | 0 . . .")
check("steps literal len", st.on.length === 16)
check("steps X on", st.on[4] === true)
check("steps 1 on", st.on[8] === true)
check("steps 0 off", st.on[12] === false)
check("steps mode", st.mode === "literal")
check("steps multi-bar", body("steps " + "x . . . ".repeat(8)).on.length === 32)
let eu = body("steps euclid 5 16")
check("steps euclid mode", eu.mode === "euclid")
check("steps euclid hits", eu.hits === 5 && eu.len === 16)
check("steps euclid fill", eu.on.filter(Boolean).length === 5)
check("steps euclid bad", body("steps euclid x 16").kind === "error")

let nt = body("note 50 1.0 0.5 v 85 bar even p 0.8 r 2 n -0.25 l la")
check("note midi", nt.midi === 50)
check("note start", nt.startBeat === 1 && nt.durBeats === 0.5)
check("note vel", nt.vel === 85)
check("note locks", nt.prob === 0.8 && nt.ratchet === 2 && nt.nudge === -0.25)
check("note lyric", nt.lyric === "la")
check("note bar selector", nt.bar !== null)
check("note locks null when absent", body("note 60 0 1 v 80").prob === null)
check("note needs v", body("note 60 0 1 90").kind === "error")
check("note needs numbers", body("note zz 0 1 v 80").kind === "error")
// Locks are NOT clamped here — that is host policy (Deckard clamps, tish-gba rejects).
check("note prob unclamped", body("note 60 0 1 v 80 p 5").prob === 5)

check("notes_clear", body("notes_clear").kind === "notesClear")

let lane = body("step_vel 120 100 | 70")
check("lane name", lane.lane === "vel")
check("lane values", lane.values.join(",") === "120,100,70")
check("lane prob", body("step_prob 1 0.5").lane === "prob")
check("lane ratchet", body("step_ratchet 1 2").lane === "ratchet")
check("lane nudge", body("step_nudge 0 -0.1").lane === "nudge")
let lyr = body("step_lyric la di")
check("lane lyric strings", lyr.values[0] === "la" && lyr.values[1] === "di")

let sp = body("step_pitch 36 bar 2n+1")
check("step_pitch midi", sp.midi === 36)
check("step_pitch bar", sp.bar !== null)
check("step_pitch no bar", body("step_pitch 36").bar === null)
check("step_pitch bad", body("step_pitch zz").kind === "error")

check("loops n", body("loops 8").cap === 8)
check("loops inf", body("loops inf").cap === null)
check("loops infinite", body("loops infinite").cap === null)
check("loops bad", body("loops zz").kind === "error")

let fx = body("fx reverb 0.3 type lowpass cutoff 1200 res 0.4 lfo_rate 2")
check("fx reverb alias", fx.params.reverbSend === 0.3)
check("fx type alias", fx.params.filterType === "lowpass")
check("fx numeric", fx.params.cutoff === 1200 && fx.params.res === 0.4)
check("fx snake to camel", fx.params.lfoRate === 2)

let dk = body("deck A slot 2")
check("deck lane", dk.lane === "A")
check("deck slot", dk.slot === 2)
check("deck live", body("deck live").lane === "live")
check("deck invalid lane", body("deck Z").lane === null)
check("deck no slot", body("deck B").slot === null)

check("voice params", body("voice octave -1 arp up").params.octave === -1)
check("gen params", body("gen wave_shape saw vol 15").params.waveShape === "saw")
let ad = body("adsr a 0 d 0.1 s 0.5 r 0.03")
check("adsr", ad.a === 0 && ad.d === 0.1 && ad.s === 0.5 && ad.r === 0.03)
check("transpose", body("transpose -12").semitones === -12)
check("transpose bad", body("transpose zz").kind === "error")

check("unknown head", body("zzz 1").kind === "unknown")
check("unknown keeps tokens", body("zzz 1").tokens.length === 2)
check("empty tokens", parseBodyLine([]).kind === "unknown")
check("non-array tokens", parseBodyLine(null).kind === "unknown")

// parseTrackBody over the rows parseProgram produced
let tb = parseProgram("track T id c0 gen g\n  mix gain 1\n  note 60 0 1 90\n  steps x . . .\n")
let parsedBody = parseTrackBody(tb.tracks[0].body)
check("trackBody rows", parsedBody.rows.length === 2)
check("trackBody keeps lineNo", parsedBody.rows[0].lineNo === 2)
check("trackBody errors", parsedBody.errors.length === 1)
check("trackBody error line", parsedBody.errors[0].line === 3)
check("trackBody non-array", parseTrackBody(null).rows.length === 0)

// ── Host extension hooks ──────────────────────────────────────────────────────
registerBodyLineDialect(["layer", "intensity"], (head, toks) => ({
  kind: "layer",
  level: Math.floor(Number(toks[1]))
}))
check("body dialect array", body("layer 2").level === 2)
check("body dialect alias", body("intensity 3").level === 3)
registerBodyLineDialect("solo_flag", () => ({ kind: "soloFlag" }))
check("body dialect string form", body("solo_flag").kind === "soloFlag")
registerBodyLineDialect("ignored", null)
check("body dialect null fn ignored", body("ignored").kind === "unknown")
registerBodyLineDialect(42, () => ({ kind: "nope" }))
check("body dialect bad heads ignored", body("42").kind === "unknown")
clearBodyLineDialects()
check("body dialect cleared", body("layer 2").kind === "unknown")

// `wave` used to be the example here, because it used to be a host statement. It is core now, so
// this exercises the mechanism with a head the language genuinely does not own.
registerTopLevelStatement("cue", (head, toks) => ({ name: toks[1], at: toks[2] }))
let hs = parseProgram("deck 1\ncue drop 32\ncue break 64\n")
check("host stmt collected", hs.hostStatements.cue.length === 2)
check("host stmt value", hs.hostStatements.cue[0].value.name === "drop")
check("host stmt lineNo", hs.hostStatements.cue[0].lineNo === 2)
check("host stmt no error", hs.errors.length === 0)
registerTopLevelStatement("nope", null)
check("host stmt null fn ignored", parseProgram("nope 1\n").errors.length === 1)
clearTopLevelStatements()
check("host stmt cleared", parseProgram("cue drop 32\n").errors.length === 1)

// A host registering `wave` must not shadow the core statement — core is matched first.
registerTopLevelStatement("wave", () => ({ hijacked: true }))
let shadow = parseProgram("deck 1\nwave organ harmonics 1 0.5\n")
check("core wave wins over host", shadow.waves.length === 1 && !shadow.hostStatements.wave)
clearTopLevelStatements()

// wave: both spellings, and the equality that makes `harmonics` sugar rather than a second sound.
let wv = parseProgram(
  "deck 1\nwave a 8beffecbbbbaa9888776554444310014\nwave b harmonics 1 0.5 0.33 0.2\n"
)
check("wave no error", wv.errors.length === 0)
check("wave count", wv.waves.length === 2)
check("wave hex mode", wv.waves[0].mode === "hex")
check("wave hex retained", wv.waves[0].hex === "8beffecbbbbaa9888776554444310014")
check("wave hex 32 levels", wv.waves[0].levels.length === 32)
check("wave harmonics mode", wv.waves[1].mode === "harmonics")
check("wave harmonics retained", wv.waves[1].harmonics.join(",") === "1,0.5,0.33,0.2")
check("wave lineNo", wv.waves[0].lineNo === 2)
check(
  "wave harmonics equals hex literal",
  wv.waves[0].levels.join(",") === wv.waves[1].levels.join(",")
)
check("wave short hex errors", parseProgram("deck 1\nwave a abc\n").errors.length === 1)
check("wave bad hex errors", parseProgram("deck 1\nwave a " + "z".repeat(32) + "\n").errors.length === 1)
check("wave missing args errors", parseProgram("deck 1\nwave a\n").errors.length === 1)
check("wave bare errors", parseProgram("deck 1\nwave\n").errors.length === 1)
check("wave empty harmonics errors", parseProgram("deck 1\nwave a harmonics\n").errors.length === 1)
check("wave zero harmonics errors", parseProgram("deck 1\nwave a harmonics 0 0\n").errors.length === 1)
check("wave nan harmonics errors", parseProgram("deck 1\nwave a harmonics 1 x\n").errors.length === 1)

check("harmonicTable 32 levels", harmonicTable([1]).length === 32)
check("harmonicTable in range", harmonicTable([1, 0.5]).every((n) => n >= 0 && n <= 15))
check("harmonicTable ratios only", encodeWaveHex(harmonicTable([1, 0.5])) === encodeWaveHex(harmonicTable([2, 1])))
check("harmonicTable zero is null", harmonicTable([0]) === null)
check("harmonicTable empty is null", harmonicTable([]) === null)
check("harmonicTable null is null", harmonicTable(null) === null)
check("harmonicTable infinite is null", harmonicTable([1 / 0]) === null)
check("harmonicTable nan is null", harmonicTable([0 / 0]) === null)
check("decodeWaveHex round trip", encodeWaveHex(decodeWaveHex("8beffecbbbbaa9888776554444310014")) === "8beffecbbbbaa9888776554444310014")
check("decodeWaveHex short is null", decodeWaveHex("abc") === null)
check("decodeWaveHex bad digit is null", decodeWaveHex("g".repeat(32)) === null)

if (failed > 0) {
  console.log(failed + " FAILED")
  process.exit(1)
}
console.log("ALL_OK")
