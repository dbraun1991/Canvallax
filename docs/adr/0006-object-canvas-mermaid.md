# ADR-0006: Object Canvas — Mermaid

- Status: Accepted
- Date: 2026-09-03
- Relates to: [ADR-0003](0003-canvas-architecture.md)

## Context

The Object Canvas shows the business entities involved in a backlog item and the relationships between them, at a business level of abstraction — not schema/implementation detail (README). This maps closely onto Mermaid's entity-relationship (`erDiagram`) or class (`classDiagram`) diagram types, which are plain-text, diffable, and already familiar to many engineers.

## Decision

Use the **Mermaid** renderer to render the Object Canvas from a Mermaid diagram-definition text source, stored as the canvas's persisted content. The editing model is a split textarea + live preview (`src/canvases/object/object-canvas.js`), debounced ~400ms, `mermaid.render()` on the current text with `securityLevel: 'strict'` (the diagram source is arbitrary user input, so labels must be sanitized).

## Details

- **License**: MIT ([mermaid-js/mermaid](https://github.com/mermaid-js/mermaid)) — fully permissive.
- **Format**: Mermaid's own plain-text diagram syntax — human-readable, diffable, and versionable directly in git; also natively rendered read-only by GitHub, GitLab, and Notion.
- **Editing model**: Mermaid has no interactive editor — it's a text-to-SVG renderer. The Object Canvas's edit experience is therefore text+preview, not drag-and-drop direct manipulation like Process or System/Interaction — a meaningfully different interaction model, called out explicitly rather than papered over.
- **Realtime collaboration**: not built into mermaid.js. Because the content is plain text, this is the most tractable of the three tool-backed canvases to add realtime editing to later — a standard collaborative-text-editor stack (e.g. CodeMirror + Yjs) editing the Mermaid source, re-rendering on change, would work without Mermaid itself needing to support collaboration.

## Consequences

**Positive**: content is plain text — trivially diffable/versionable, and the easiest of the three tool-backed canvases to add realtime editing to later. No license friction.

**Negative**: no native direct-manipulation editing — this canvas feels different to use than Process/System/Interaction. Worth validating with users early.

**Negative**: layout is auto-computed by Mermaid's layout engine, not user-positioned — less control over entity placement than a freeform diagram tool would give.

## Alternatives considered

- **draw.io, same as System/Interaction.** Rejected: loses the plain-text diffability and the purpose-built ER/class notation Mermaid already provides; would also make Object indistinguishable in tooling from the two general-purpose canvases.
