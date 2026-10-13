# Implemented visual rules

This records the migrated implementation, not a new design proposal. Use `npm run dev` and open `/style-guide/` for a local reference. The reference imports the real shared styles and controls and is absent from `dist/`.

## Typography

The active interface face is the unchanged Manrope variable TTF, with its supplied SIL Open Font License. The mosaic uses its original Roboto Slab font with its supplied license. Retired display/font experiments are not shipped.

Computed in Chrome at 1440 × 900:

| Element | Size / line height | Weight |
| --- | --- | --- |
| Intro name | 18px / 27px | 700 |
| Intro role | 18px / 27px | 500 |
| Intro main paragraph | 16px / 26.4px | 500 |
| Opening emphasis | 16px / 26.4px | 600 |
| Studio paragraph | 14px / 23.8px | 500 |

These are intro-specific rules, not global weight assignments. Product page typography remains in `product-pages.css`. Font fallback and the font-dependent opening measurement remain in `prototype.js`.

## Palette and layout

`tokens.css` is the shared palette authority:

| Token | Light | Dark |
| --- | --- | --- |
| `--cm-paper` | `#fff` | `#1d232b` |
| `--cm-ink` | `#26313b` | `#e6e9ed` |
| `--cm-secondary` | `#64717a` | `#aab4c0` |
| `--cm-line` | `#dce2e6` | `#3e4b59` |
| `--cm-accent` | `#627c90` | `#afc3d7` |

Route-specific surface tokens preserve the approved background differences. The homepage gutter starts at `max(32px, 6vw)`, becomes 32px below 900px, and 24px below 600px; later component rules in the preserved cascade remain authoritative. The opening is measured against its real content and font, rather than forcing a fixed-height card. Product pages retain their existing reading widths and responsive composition.

Theme selection persists under `cm-color-appearance`. Automatic mode combines a local sunrise/sunset calculation for Denver with recent NWS observations from Denver International Airport. Clear, cloudy, and precipitation conditions affect the daytime sky; local daylight is the fallback for stale or unavailable observations. Manual switches update text and surfaces immediately, with decorative border/shadow easing only. Sky-specific intro colors remain scoped to the intro controller.

## Shared prose links

`inline-links.css` applies on home, product, and reference pages. No visible underline at rest; hover and keyboard focus reveal a 2px underline on text spans only. The arrow stays outside the underline in a no-wrap span with the final word. Focus retains a visible outline. The intro shimmer remains scoped to the intro. Shared theme buttons have 44px targets except the inherited compact mobile homepage control treatment.

## Motion and navigation

- Forward page arrival: 420ms, `cubic-bezier(.2,.7,.2,1)`; outgoing fade: 160ms.
- Breadcrumb arrival: 420ms after 80ms; homepage return: 240ms, restoring the recorded scroll position.
- Odometer: 2200ms tenths roll; whole digit settles over 420ms from 1930ms; decimal/plus resolve from 2530ms; secondary text fades over 600ms from 3100ms.
- Plane: 14000ms cycle after a 900ms initial delay, with the original shrinking line and long pause. Offscreen flight pauses.
- Reduced motion: static completed count and artwork, immediate navigation, no shimmer or theme-transition animation.

The shared masthead controls live in `ThemeControls.astro`. Homepage sections are separate components; product breadcrumb and footer markup remain route-specific. Inspect real pages for those components instead of copying them into a competing demonstration library.

## Verification boundary

Geometry, sampled type/color rules, content, and interactions were compared with the original prototype. Review evidence is local under `.qa/`; publication requires owner approval. Automated accessibility checks supplement manual keyboard, VoiceOver, zoom, and actual Safari review; they do not replace those gates.

## Launch additions

Archive and privacy pages use the shared palette, masthead, theme controls, and footer. Public metrics carry reporting dates and source links. The favicon is a white C on a blue rounded square; the social preview is Chris’s self-hosted 1200×630 Figma card. Text and surface colors switch together during manual theme changes; only decorative borders and shadows ease, preserving contrast through the transition.
