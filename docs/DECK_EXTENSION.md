# deck generator extensions (`gen_block`)

The core language collects `gen_block` … `end gen_block` as raw line lists on each track.

Hosts register dialects with `registerGenBlockDialect(ids, parseFn)`. Until registered,
`parseGenBlock` returns `{ kind, tplHeaderId, version: 1, raw }`.

Deckard registers `patch` and `matrix_fm` dialects (parse/serialize live in Deckard).
