//! Typed view over the generated parser.
//!
//! The rest of this crate is emitted from `src/index.tish` and speaks `Value` — the dynamic runtime
//! type — because that is what the Tish source returns. This module is the ONLY hand-written Rust
//! here, and it does exactly one thing: read a `Value` into Rust structs.
//!
//! It must never grow parsing logic. The moment it decides what a line MEANS rather than what the
//! parser already said, there are two implementations of the grammar again, which is the entire
//! thing this crate exists to prevent. The conformance corpus (`tests/conformance.rs`) is what keeps
//! that boundary honest: it drives these types from the same fixtures the JS build is checked
//! against, so a façade that invents or drops information fails.
use tishlang_runtime::Value;

// ── Value accessors ───────────────────────────────────────────────────────────

/// Read a property, treating any non-object receiver as absent.
///
/// The guard is load-bearing, not defensive noise. Indexing a nullish value is a catchable
/// `TypeError` in Tish, and `get_index` implements that by PARKING a pending throw to be surfaced at
/// the next checkpoint. Called from Rust there is no Tish frame to surface it in, so the throw stays
/// latched — and every subsequent call into the module bails at its own checkpoint and returns null.
/// One `field(&Value::Null, …)` silently bricks the module for the rest of the process.
///
/// Optional fields are exactly where this bites: a `note` with no `bar` gives `bar: null`, and
/// reading `kind` off it to build a `BarSelector` is the natural thing to write.
fn field(v: &Value, key: &str) -> Value {
    match v {
        Value::Object(_) => tishlang_runtime::get_index(v, &Value::String(key.into())),
        _ => Value::Null,
    }
}

fn as_f64(v: &Value) -> Option<f64> {
    match v {
        Value::Number(n) => Some(*n),
        _ => None,
    }
}

fn as_i64(v: &Value) -> Option<i64> {
    as_f64(v).map(|n| n as i64)
}

fn as_string(v: &Value) -> Option<String> {
    match v {
        Value::String(s) => Some(s.to_string()),
        _ => None,
    }
}

fn as_bool(v: &Value) -> Option<bool> {
    match v {
        Value::Bool(b) => Some(*b),
        _ => None,
    }
}

fn items(v: &Value) -> Vec<Value> {
    match v {
        Value::Array(a) => a.borrow().iter().cloned().collect(),
        _ => Vec::new(),
    }
}

fn num_field(v: &Value, key: &str) -> Option<f64> {
    as_f64(&field(v, key))
}

fn int_field(v: &Value, key: &str) -> Option<i64> {
    as_i64(&field(v, key))
}

fn str_field(v: &Value, key: &str) -> Option<String> {
    as_string(&field(v, key))
}

// ── Types ─────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq)]
pub struct ParseError {
    pub line: i64,
    pub msg: String,
}

/// A `@ …` control directive. Transient stream state; the verb is host-interpreted.
#[derive(Debug, Clone, PartialEq)]
pub struct Directive {
    pub line: i64,
    pub verb: String,
    pub tokens: Vec<String>,
}

/// Whether a `note` / `step_pitch` applies to a bar. `None` = every bar.
#[derive(Debug, Clone, PartialEq)]
pub struct BarSelector {
    pub kind: String,
    pub a: Option<i64>,
    pub b: Option<i64>,
    pub list: Vec<i64>,
}

/// One parsed track/clip body line.
///
/// `Unknown` is not an error — it is a head no host claimed, which a dialect may still handle.
///
/// No `PartialEq`: the `Host` variant carries a raw `Value`, which the runtime does not implement it
/// for (its object payload is behind interior mutability, so equality would be a lock, not a compare).
#[derive(Debug, Clone)]
pub enum BodyRow {
    Mix {
        gain: Option<f64>,
        pan: Option<f64>,
        mute: Option<bool>,
        solo: Option<bool>,
        eq_lo: Option<f64>,
        eq_mid: Option<f64>,
        eq_hi: Option<f64>,
    },
    /// `on` is already expanded — a euclid fill arrives as the same boolean grid as a literal one.
    Steps {
        euclid: bool,
        hits: Option<i64>,
        len: Option<i64>,
        on: Vec<bool>,
    },
    StepLane {
        lane: String,
        numbers: Vec<Option<f64>>,
        strings: Vec<String>,
    },
    StepPitch {
        midi: i64,
        bar: Option<BarSelector>,
    },
    /// Locks are `None` when the line didn't write them, so a host can tell "absent" from "written
    /// at the default". Values are NOT clamped here — that is host policy.
    Note {
        midi: i64,
        start_beat: f64,
        dur_beats: f64,
        vel: Option<i64>,
        prob: Option<f64>,
        ratchet: Option<i64>,
        nudge: Option<f64>,
        bar: Option<BarSelector>,
        lyric: Option<String>,
    },
    NotesClear,
    Transpose {
        semitones: i64,
    },
    /// `None` = `loops inf` (no cap).
    Loops {
        cap: Option<i64>,
    },
    Gen {
        params: Params,
    },
    Adsr {
        a: Option<f64>,
        d: Option<f64>,
        s: Option<f64>,
        r: Option<f64>,
    },
    Fx {
        params: Params,
    },
    Voice {
        params: Params,
    },
    DeckRoute {
        lane: Option<String>,
        slot: Option<i64>,
    },
    /// A head a host dialect returned, or one nothing claimed. `value` is the raw row.
    Host {
        kind: String,
        value: Value,
    },
    Unknown {
        head: String,
        tokens: Vec<String>,
    },
}

/// `key value` pairs off a `gen` / `fx` / `voice` line. Keys are already camelCased by the parser.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct Params {
    pub numbers: Vec<(String, f64)>,
    pub strings: Vec<(String, String)>,
}

impl Params {
    pub fn num(&self, key: &str) -> Option<f64> {
        self.numbers.iter().find(|(k, _)| k == key).map(|(_, v)| *v)
    }
    pub fn int(&self, key: &str) -> Option<i64> {
        self.num(key).map(|v| v as i64)
    }
    pub fn text(&self, key: &str) -> Option<&str> {
        self.strings
            .iter()
            .find(|(k, _)| k == key)
            .map(|(_, v)| v.as_str())
    }
    pub fn has(&self, key: &str) -> bool {
        self.num(key).is_some() || self.text(key).is_some()
    }
}

#[derive(Debug, Clone)]
pub struct Track {
    pub name: String,
    pub id: String,
    pub generator_id: String,
    pub raw_gen_id: String,
    /// `* N` pattern length in bars. `None` = `* inf` / unset.
    pub loop_bars: Option<i64>,
    /// Trailing `key value` pairs on the header — macro parameter overrides.
    pub gen_params: Params,
    pub body: Vec<BodyRow>,
    pub body_errors: Vec<ParseError>,
    pub gen_blocks: Vec<GenBlock>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct GenBlock {
    pub generator_id: String,
    pub lines: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct Clip {
    pub clip_id: String,
    pub channel_id: String,
    pub bars: i64,
    pub display_name: String,
    pub body: Vec<BodyRow>,
    pub body_errors: Vec<ParseError>,
}

/// A `.deck` program. Only the fields a Rust consumer has needed so far are lifted into typed form;
/// `raw` keeps the whole AST, so anything not modelled here is still reachable without a change to
/// this file.
#[derive(Debug, Clone)]
pub struct DeckProgram {
    pub version: i64,
    pub bpm: Option<f64>,
    pub swing: Option<f64>,
    pub scale_root: Option<i64>,
    pub scale_mode: Option<String>,
    pub tracks: Vec<Track>,
    pub clips: Vec<Clip>,
    pub directives: Vec<Directive>,
    pub errors: Vec<ParseError>,
    /// Values returned by `registerTopLevelStatement` handlers, keyed by head.
    pub host_statements: Value,
    pub raw: Value,
}

impl DeckProgram {
    /// Values a host statement handler returned for `head`, in source order.
    pub fn host_statement(&self, head: &str) -> Vec<Value> {
        items(&field(&self.host_statements, head))
            .iter()
            .map(|e| field(e, "value"))
            .collect()
    }
}

// ── Conversion ────────────────────────────────────────────────────────────────

fn params_from(v: &Value) -> Params {
    let mut out = Params::default();
    if let Value::Object(map) = v {
        // String-keyed properties only; a `gen`/`fx`/`voice` line cannot produce a symbol key.
        for (k, val) in map.borrow().strings.iter() {
            match val {
                Value::Number(n) => out.numbers.push((k.to_string(), *n)),
                Value::String(s) => out.strings.push((k.to_string(), s.to_string())),
                Value::Bool(b) => out.strings.push((k.to_string(), b.to_string())),
                _ => {}
            }
        }
    }
    out.numbers.sort_by(|a, b| a.0.cmp(&b.0));
    out.strings.sort_by(|a, b| a.0.cmp(&b.0));
    out
}

fn bar_from(v: &Value) -> Option<BarSelector> {
    let kind = str_field(v, "kind")?;
    Some(BarSelector {
        kind,
        a: int_field(v, "a"),
        b: int_field(v, "b"),
        list: items(&field(v, "list")).iter().filter_map(as_i64).collect(),
    })
}

fn errors_from(v: &Value) -> Vec<ParseError> {
    items(v)
        .iter()
        .map(|e| ParseError {
            line: int_field(e, "line").unwrap_or(0),
            msg: str_field(e, "msg").unwrap_or_default(),
        })
        .collect()
}

fn body_row_from(v: &Value) -> BodyRow {
    let kind = str_field(v, "kind").unwrap_or_default();
    match kind.as_str() {
        "mix" => BodyRow::Mix {
            gain: num_field(v, "gain"),
            pan: num_field(v, "pan"),
            mute: as_bool(&field(v, "mute")),
            solo: as_bool(&field(v, "solo")),
            eq_lo: num_field(v, "eqLo"),
            eq_mid: num_field(v, "eqMid"),
            eq_hi: num_field(v, "eqHi"),
        },
        "steps" => BodyRow::Steps {
            euclid: str_field(v, "mode").as_deref() == Some("euclid"),
            hits: int_field(v, "hits"),
            len: int_field(v, "len"),
            on: items(&field(v, "on"))
                .iter()
                .map(|b| as_bool(b).unwrap_or(false))
                .collect(),
        },
        "stepLane" => {
            let vals = items(&field(v, "values"));
            BodyRow::StepLane {
                lane: str_field(v, "lane").unwrap_or_default(),
                numbers: vals.iter().map(as_f64).collect(),
                strings: vals.iter().filter_map(as_string).collect(),
            }
        }
        "stepPitch" => BodyRow::StepPitch {
            midi: int_field(v, "midi").unwrap_or(0),
            bar: bar_from(&field(v, "bar")),
        },
        "note" => BodyRow::Note {
            midi: int_field(v, "midi").unwrap_or(0),
            start_beat: num_field(v, "startBeat").unwrap_or(0.0),
            dur_beats: num_field(v, "durBeats").unwrap_or(0.0),
            vel: int_field(v, "vel"),
            prob: num_field(v, "prob"),
            ratchet: int_field(v, "ratchet"),
            nudge: num_field(v, "nudge"),
            bar: bar_from(&field(v, "bar")),
            lyric: str_field(v, "lyric"),
        },
        "notesClear" => BodyRow::NotesClear,
        "transpose" => BodyRow::Transpose {
            semitones: int_field(v, "semitones").unwrap_or(0),
        },
        "loops" => BodyRow::Loops {
            cap: int_field(v, "cap"),
        },
        "gen" => BodyRow::Gen {
            params: params_from(&field(v, "params")),
        },
        "adsr" => BodyRow::Adsr {
            a: num_field(v, "a"),
            d: num_field(v, "d"),
            s: num_field(v, "s"),
            r: num_field(v, "r"),
        },
        "fx" => BodyRow::Fx {
            params: params_from(&field(v, "params")),
        },
        "voice" => BodyRow::Voice {
            params: params_from(&field(v, "params")),
        },
        "deckRoute" => BodyRow::DeckRoute {
            lane: str_field(v, "lane"),
            slot: int_field(v, "slot"),
        },
        "unknown" => BodyRow::Unknown {
            head: str_field(v, "head").unwrap_or_default(),
            tokens: items(&field(v, "tokens"))
                .iter()
                .filter_map(as_string)
                .collect(),
        },
        other => BodyRow::Host {
            kind: other.to_string(),
            value: v.clone(),
        },
    }
}

fn body_from(rows: &Value) -> (Vec<BodyRow>, Vec<ParseError>) {
    let parsed = crate::parseTrackBody(rows.clone());
    (
        items(&field(&parsed, "rows"))
            .iter()
            .map(body_row_from)
            .collect(),
        errors_from(&field(&parsed, "errors")),
    )
}

/// Parse `.deck` source into typed form. Never fails: malformed lines land in `errors`, matching the
/// parser's own error-tolerant contract (a streaming host must be able to parse a partial program).
pub fn parse(src: &str) -> DeckProgram {
    let raw = crate::parseProgram(Value::String(src.into()));

    let tracks = items(&field(&raw, "tracks"))
        .iter()
        .map(|t| {
            let (body, body_errors) = body_from(&field(t, "body"));
            Track {
                name: str_field(t, "name").unwrap_or_default(),
                id: str_field(t, "id").unwrap_or_default(),
                generator_id: str_field(t, "generatorId").unwrap_or_default(),
                raw_gen_id: str_field(t, "rawGenId").unwrap_or_default(),
                loop_bars: int_field(t, "loopBars"),
                gen_params: params_from(&field(t, "genParams")),
                body,
                body_errors,
                gen_blocks: items(&field(t, "genBlocks"))
                    .iter()
                    .map(|g| GenBlock {
                        generator_id: str_field(g, "generatorId").unwrap_or_default(),
                        lines: items(&field(g, "lines")).iter().filter_map(as_string).collect(),
                    })
                    .collect(),
            }
        })
        .collect();

    let clips = items(&field(&raw, "clipBlocks"))
        .iter()
        .map(|c| {
            let (body, body_errors) = body_from(&field(c, "body"));
            Clip {
                clip_id: str_field(c, "clipId").unwrap_or_default(),
                channel_id: str_field(c, "channelId").unwrap_or_default(),
                bars: int_field(c, "bars").unwrap_or(1),
                display_name: str_field(c, "displayName").unwrap_or_default(),
                body,
                body_errors,
            }
        })
        .collect();

    let directives = items(&field(&raw, "directives"))
        .iter()
        .map(|d| Directive {
            line: int_field(d, "lineNo").unwrap_or(0),
            verb: str_field(d, "verb").unwrap_or_default(),
            tokens: items(&field(d, "tokens")).iter().filter_map(as_string).collect(),
        })
        .collect();

    DeckProgram {
        version: int_field(&raw, "tplVersion").unwrap_or(0),
        bpm: num_field(&raw, "bpm"),
        swing: num_field(&raw, "swing"),
        scale_root: int_field(&raw, "scaleRoot"),
        scale_mode: str_field(&raw, "scaleMode"),
        tracks,
        clips,
        directives,
        errors: errors_from(&field(&raw, "errors")),
        host_statements: field(&raw, "hostStatements"),
        raw,
    }
}
