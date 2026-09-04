# ADR-0021: Interaction Canvas — Excalidraw, not draw.io

- Status: Accepted
- Date: 2026-09-04
- Supersedes (Interaction Canvas only): [ADR-0005](0005-system-and-interaction-canvases-drawio.md) — System/Integration's draw.io integration is entirely unchanged, including the shared module it used to mount both; theming for Interaction supersedes the relevant part of [ADR-0013](0013-theming-light-and-dark-mode.md) too (Excalidraw's own `theme` prop, not draw.io's `dark: true` postMessage payload).
- Relates to: [ADR-0003](0003-canvas-architecture.md), [ADR-0007](0007-issue-and-backlog-data-model.md), [ADR-0012](0012-all-view-thumbnails.md)

## Context

ADR-0005 already named the mismatch it was accepting for Interaction: draw.io is "general-purpose, not purpose-built for either use case" it was pressed into — and Interaction's own use case, per that same ADR and the README, is explicitly "rough storyboard-level sketches of screens," not structured flowcharts. draw.io's shape-library-and-connector model is built for precise, structured diagrams (which is exactly right for System/Integration's architecture diagrams); a hand-drawn storyboard sketch is a different kind of artifact, better served by a freeform drawing tool than by a flowchart editor pressed into sketching duty.

Direction given: replace Interaction's draw.io integration with **Excalidraw**, a purpose-built freeform whiteboard/sketching library — while leaving System/Integration on draw.io entirely unchanged, since draw.io's structured-diagram strength is still the right fit there.

Excalidraw ([excalidraw/excalidraw](https://github.com/excalidraw/excalidraw)) is MIT-licensed — permissive, no watermark or attribution requirement, unlike bpmn-js's bpmn.io License (ADR-0004). The other major open-source whiteboard SDK, tldraw, was considered and set aside: its license moved to a custom "tldraw license" in v2+ with a watermark/commercial-tier structure similar to bpmn.io's, and Excalidraw's cleaner MIT terms won out with no other factor pushing back the other way.

## Decision

**A new canvas module**, `src/canvases/interaction/excalidraw-canvas.js` — Interaction gets its own integration now, no longer sharing `drawio-canvas.js` with System/Integration.

**Excalidraw is a React component**; Canvallax is Alpine.js (ADR-0002), not React. Rather than adopting React as a framework, `mountExcalidrawCanvas` mounts it as a single isolated island: a `react-dom/client` root created directly inside the given container, rendering `<Excalidraw>` via `React.createElement` (no JSX, so no build-tooling change — Vite needs no JSX transform for plain `createElement` calls). This keeps Excalidraw's own footprint contained to one module; nothing else in the shell needs to know this one canvas is React underneath. `destroy()` is `root.unmount()`.

**Content format**: `excalidraw-json` — `serializeAsJSON(elements, appState, files, 'local')` (Excalidraw's own exported serialization helper) on every change, debounced 800ms same as Object/Mermaid's editor, written into `viewObj.content` as a plain string — the same "one string blob per view" shape [ADR-0007](0007-issue-and-backlog-data-model.md) already uses for the other three engines, just a different string format. On mount, `viewObj.content` is `JSON.parse`d directly into Excalidraw's `initialData` prop; an empty/missing value needs no explicit starter scene the way BPMN or Mermaid do — an empty canvas is already a valid start state for a freeform drawing tool.

**Theming**: Excalidraw's own `theme` prop (`'light'` | `'dark'`) — set at mount time only, the same known limitation ADR-0013 already documents for draw.io/Mermaid (toggling the shell theme while Interaction is already open doesn't retheme it live until remounted).

**Thumbnails** ([ADR-0012](0012-all-view-thumbnails.md)): `renderExcalidrawThumbnail(content, theme)` uses Excalidraw's own `exportToSvg({ elements, appState, files })` utility — no off-screen hidden-container mount needed the way bpmn-js's thumbnail export requires, since `exportToSvg` doesn't need a live mounted instance at all. Returns raw SVG markup, same as Process/Object's thumbnails (`x-html` in `index.html`) — Interaction's All-grid tile changes from `<img :src>` (draw.io's data-URI shape) to the raw-markup pattern the other two SVG-producing engines already use.

## Consequences

**Positive**

- Interaction's tool now actually matches its own stated purpose — freeform sketching for a freeform-sketching use case, instead of a structured-diagram editor stretched to cover it.
- MIT license: no watermark, no commercial-tier consideration, cleanly permissive — a better position than either bpmn-js's accepted watermark tradeoff or tldraw's similar-shaped licensing.
- `exportToSvg` needing no live mount simplifies the thumbnail path relative to bpmn-js's off-screen-container approach.

**Negative / risks**

- **A second UI framework enters the dependency tree.** Alpine.js (ADR-0002) was chosen specifically to avoid a heavy framework; React (plus Excalidraw's own dependencies — Radix UI, Jotai, and others) is now present, scoped to one canvas module via the mount-as-an-island pattern, but it's real added weight (`react`, `react-dom`, and Excalidraw's transitive dependencies) that wasn't in the bundle before.
- System/Integration and Interaction no longer share one integration module — `drawio-canvas.js`'s "one module covers two canvases" economy (ADR-0005's stated positive) is gone for Interaction; each now carries its own mount/thumbnail code.
- Excalidraw's scene format (`elements`/`appState`/`files`) is Excalidraw-specific, not a cross-tool standard — same category of tradeoff ADR-0005 already accepted for mxGraph XML, now repeated for a second, unrelated format.
- No live re-theming while mounted (see Theming above) — an existing, accepted limitation extended to a fourth engine, not a new one.

## Alternatives considered

- **tldraw** instead of Excalidraw. Rejected on licensing: v2+'s custom license carries a watermark/commercial-tier structure comparable to bpmn.io's, and nothing about tldraw's editing UX outweighed Excalidraw's cleaner MIT terms enough to accept that tradeoff a second time in the same project.
- **Keep draw.io for Interaction, curate/restrict its shape palette toward wireframe stencils instead.** Considered as a lower-effort alternative (draw.io does ship wireframe/mockup stencils already) — rejected per direction given, which asked for an actual freeform-drawing tool, not a constrained structured one.
- **Fabric.js/Konva.js** as a lower-level canvas toolkit to build a custom sketch tool on. Rejected: building and maintaining a bespoke drawing UI is real ongoing work Excalidraw already solves as a finished, maintained tool.
