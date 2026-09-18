# ADR-0037: Export Phase 3 — per-tile export, PDF, and Issue-level ZIP

- Status: Accepted
- Date: 2026-09-18
- Relates to: [ADR-0012](0012-all-view-thumbnails.md), [ADR-0025](0025-system-thumbnail-svg-export-forces-light-color-scheme.md) — extends `src/canvases/export.js` (Phases 1–2)

## Decision

1. **Per-tile export.** Each All-grid tile (and the featured display) has an export button that opens the existing export picker for that tile's canvas (`openExportPicker(view)` / `exportTarget` in `shell-state.js`); the picker is no longer tied to the active tab.
2. **PDF** is a new picker format (download only — not copyable): the 2x PNG raster embedded on a single page sized to the diagram, via `jspdf`. Deliberately raster, not vector: `svg2pdf.js` handles the `<foreignObject>`/web-font content in draw.io and Excalidraw SVGs poorly.
3. **Issue-level ZIP** (burger menu → "Export Issue (ZIP)"): per canvas an SVG and a PNG under a folder named for the Issue, via `jszip`. No native sources and no Backlog. An empty Interaction canvas is skipped.
4. `jspdf` and `jszip` are dynamic imports, so they stay out of the initial bundle's critical path.
5. **PNG rasterization now loads the SVG from a `data:` URL, not a `blob:` URL.** Chrome tainted the canvas for SVGs containing `<foreignObject>` (System's draw.io, Object's Mermaid labels) loaded from a blob URL, so `toBlob()` threw — PNG export of those two canvases was already broken before this ADR, and PDF/ZIP would have inherited it.

## Consequences

- PDFs are large (roughly 4–9 MB for the seeded diagrams) because they embed a 2x PNG; vector PDF is the way to shrink them if it matters.
- Two new dependencies.
