# ADR-0012: All-view renders real per-canvas thumbnails

- Status: Accepted
- Date: 2026-09-03
- Relates to: [ADR-0003](0003-canvas-architecture.md), [ADR-0008](0008-issue-centric-shell.md)

## Context

The All view ([ADR-0008](0008-issue-centric-shell.md)) is meant to show each canvas's real current content, not a placeholder, with click-through into the matching single-canvas view. Each engine's export capability is different enough that a uniform approach doesn't exist:

- **bpmn-js**: `Viewer.saveSVG()` is available on the lighter, read-only `Viewer` class (not just the `Modeler` used for editing). It internally calls `getBBox()`, which needs real layout — the container must be positioned off-screen (`position:absolute; left:-9999px`), not `display:none`.
- **Mermaid**: `mermaid.render(...)` already returns raw SVG markup directly — the same call the live preview uses, no separate export step.
- **draw.io embed**: after a `load` action, the editor sends back an acknowledgement `{event:'load'}` once the diagram has actually finished loading — the real sync point before an `export` action is safe to send. `{action:'export', format:'svg'}` then returns a ready-to-use `data:image/svg+xml` URI, a different shape from the other two engines' raw SVG markup.

## Decision

A thumbnail-rendering path per engine, orchestrated by `src/canvases/thumbnails.js` rather than growing `shell-state.js` with a fourth rendering concern:

- `renderProcessThumbnail(xml)` (`process-canvas.js`) — temporary off-screen `Viewer` instance, `importXML` + `saveSVG()`, destroyed immediately after.
- `renderObjectThumbnail(text, theme)` (`object-canvas.js`) — the same `mermaid.render` call the live preview uses.
- `renderDrawioThumbnail(xml, theme)` (`drawio-canvas.js`, shared with the live mount) — a temporary hidden iframe driven through `init → load → load-ack → export → export-response`, then torn down.

**Caching, not live updates**: `thumbnails.js` caches each result keyed on `(issueId, view, content-string)` — a repeat visit to All with unchanged content reuses the cached result instead of re-rendering, meaningfully avoiding redundant draw.io iframe round-trips. This does not reflect an edit happening in another view while All isn't open — that needs a reactive invalidation hook fired from each canvas's own `onChange`, and is deliberately left for later.

## Consequences

**Positive**

- Uses each engine's own real, documented export capability, not a workaround.
- The content-based cache means the common case (revisiting All without having edited anything) is fast.

**Negative / risks**

- Three different result shapes (raw SVG markup for two engines, a data URI for draw.io) mean tile markup can't be uniform — handled explicitly (`x-html` vs. `<img :src>`) in `index.html`, not papered over.
- The cache is unbounded (a `Map`, never evicted) — acceptable at this app's current scale; worth revisiting if it grows.
- First visit to All for an Issue with unedited System/Interaction content still pays the full draw.io load→export cost per canvas — no way around this without live-tracking or a non-iframe drawio renderer.

## Alternatives considered

- **Render thumbnails live**, reacting immediately to any canvas's `onChange`. Deferred: a real feature needing a cross-view invalidation hook, not half-built now.
- **No caching, always re-render on every All visit.** Rejected: the draw.io round-trip is slow enough that repeated redundant renders would make All feel sluggish for no benefit when nothing changed.
