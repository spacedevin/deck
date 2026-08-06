import type { DeckSong } from './index'

/**
 * `<deck-player>` — source from the element's text content, or from a `src` attribute pointing at a
 * `.deck` file. Importing this module defines the element as a side effect.
 */
export declare class DeckPlayerElement extends HTMLElement {
  /** The parsed Song, once loaded. Read it to surface `errors` or `substitutions`. */
  readonly song: DeckSong | null
}

/** Define `<deck-player>`. Idempotent, and a no-op without `customElements`. */
export function defineDeckPlayerElement (): void

declare global {
  interface HTMLElementTagNameMap {
    'deck-player': DeckPlayerElement
  }
}
