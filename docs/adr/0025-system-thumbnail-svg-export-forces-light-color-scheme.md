# ADR-0025: System/Integration's thumbnail/export SVG forces `color-scheme: light`

- Status: Accepted
- Date: 2026-09-16
- Relates to: [ADR-0012](0012-all-view-thumbnails.md), [ADR-0024](0024-system-canvas-drawing-surface-stays-light.md)
- Supersedes, partially: [ADR-0012](0012-all-view-thumbnails.md)'s noted inconsistency that draw.io's thumbnail result is "a different shape from the other two engines' raw SVG markup" (a `data:` URI) — `renderDrawioThumbnail` now decodes and returns raw markup too, so all four engines' thumbnail functions share one contract. Everything else in ADR-0012 (the per-engine rendering approach, the content-hash cache) is unchanged.

## Context

ADR-0024 pinned draw.io's live drawing surface to permanently light so unstyled connectors (default black) stay legible regardless of Canvallax's own theme. That fix covers the interactive editor (`mountDrawioCanvas`) but not the separate one-shot SVG export path (`renderDrawioThumbnail`, ADR-0012) used for the All-view thumbnail and, once built, `src/canvases/export.js`'s per-view SVG download — System's thumbnail kept showing connectors that were sometimes invisible depending on conditions ADR-0024's fix didn't touch.

Decoding the actual markup draw.io's export returns (rather than only comparing screenshots) found the real cause: the exported SVG's root element carries `style="...; color-scheme: light dark;"`, plus CSS `light-dark(...)` custom properties (e.g. for its own adaptive background). Both resolve against **the viewing browser's own OS-level dark-mode preference** — not Canvallax's shell theme, not the `dark: false` flag already sent in the `load` payload (ADR-0024), and not the embed's `ui` URL parameter (which only pins the editor's own chrome skin, not the exported document's CSS). A viewer whose OS/browser prefers dark gets the diagram's unstyled connectors auto-inverted to white by the browser, invisible against a light tile — regardless of what Canvallax's own theme is set to at the time of viewing. This was confirmed to reproduce identically whether or not an (unrelated, separately introduced) `ui=kennedy` iframe-URL pin was present, showing that parameter doesn't touch this code path at all.

## Decision

`renderDrawioThumbnail` (`src/canvases/system/drawio-canvas.js`) now:

1. Decodes draw.io's exported `data:` URI into raw SVG markup, matching bpmn-js's and Mermaid's thumbnail functions instead of being the one engine returning an opaque URI.
2. Rewrites the root element's `color-scheme: light dark` to `color-scheme: light` before handing the markup back to callers.

This pins the export's own default colors so they no longer depend on whoever happens to be viewing it, closing the same category of gap ADR-0024 closed for the live editor.

Because System's thumbnail now returns raw markup instead of a `data:` URI, its All-view tile (`index.html`) switched from `<img :src>` to `x-html`, matching Process/Object/Interaction, and `src/canvases/export.js`'s SVG branch dropped its System-specific `fetch(dataUri)` special case in favor of the same `Blob([svgMarkup])` path already used for the other three engines.

Since System's connectors are now reliably black (not sometimes-white depending on the viewer), its All-view tile also needs the same light-background pin Process's tile already has (`src/css/shell.css`) — otherwise a dark Canvallax theme would trade one invisible-connector bug for another.

## Consequences

**Positive**

- System's exported/thumbnail SVG is now visually correct for any viewer, independent of both Canvallax's theme and the viewer's own OS/browser dark-mode preference.
- System's thumbnail function now matches the other three engines' contract (raw markup, not a `data:` URI), simplifying both the All-view markup and `export.js` — the inconsistency ADR-0012 flagged as a known risk is resolved.

**Negative / risks**

- Only the `color-scheme` declaration is rewritten via a targeted string replace; any other adaptive `light-dark(...)`-driven styling draw.io's export might introduce in a future diagram (e.g. an authored shape color using that CSS function directly, rather than draw.io's own default styling) wouldn't be caught by this and could still misrender for a dark-preferring viewer. Considered unlikely in practice — draw.io's own default styles are what triggered this, not anything Canvallax's example diagrams author directly.

## Alternatives considered

- **Keep the `<img src="data:...">` wrapper and control color scheme from Canvallax's own CSS.** Rejected — doesn't work. An `<img>`-rendered SVG resolves `color-scheme` from its own document, not the embedding page's cascade, so nothing outside the SVG itself can override it. This is exactly why the fix has to rewrite the markup rather than style around it.
- **Rely on the `ui=kennedy` iframe-URL pin as the fix.** Already present in the codebase (from an earlier, separate change) as an attempt at this same symptom. Confirmed by direct A/B testing (toggling that change on and off) to have no effect on this code path — it only affects the interactive editor's own chrome skin, never the exported document's embedded CSS. That change's own fate — keep it for the unrelated benefit of pinning the editor's chrome skin, or revert it — is a separate, still-open question this ADR doesn't resolve.
