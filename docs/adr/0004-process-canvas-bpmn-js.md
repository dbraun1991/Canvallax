# ADR-0004: Process Canvas — bpmn-js

- Status: Accepted
- Date: 2026-09-03
- Relates to: [ADR-0003](0003-canvas-architecture.md)

## Context

The Process Canvas shows the sequence of business activities needed to fulfill a backlog item: steps, alternative/concurrent paths, and the conditions that route between them — kept at business-activity level, not implementation/technical sequencing (README). BPMN 2.0 is the established open standard notation for exactly this kind of diagram, with broad tool support beyond Canvallax.

## Decision

Use **bpmn-js** (the bpmn.io / Camunda open-source BPMN 2.0 rendering + modeling toolkit) to render and edit the Process Canvas, persisting content as standard BPMN 2.0 XML. The element-properties panel is `@bpmn-io/properties-panel` + `bpmn-js-properties-panel`, docked next to the canvas (`src/canvases/process/process-canvas.js` mounts both into sibling containers), giving a maintained, BPMN-aware attribute editor "for free" rather than a hand-built one.

## Details

- **License**: the [bpmn.io License](https://bpmn.io/license/) — free including commercially, but requires the "powered by bpmn.io" watermark to stay visible and unmodified unless a separate commercial embedding license is purchased. Acceptable since Canvallax is open source with no commercial-product constraint, but it must be factored into the Process Canvas's UI (and any exported thumbnail/snapshot).
- **Format**: BPMN 2.0 XML (`.bpmn`) — files stay openable in Camunda Modeler and other BPMN-compatible tools.
- **Realtime collaboration**: not built in. bpmn-js is a single-editor library; adding realtime later would mean wrapping its command stack with a CRDT layer (e.g. Yjs) — done by others in the wild, not off-the-shelf.

## Consequences

**Positive**: standards-compliant process diagrams and a maintained element-properties editor "for free."

**Negative**: the bpmn.io watermark is a permanent, non-removable UI element under the free license.

**Negative**: BPMN's full vocabulary (events, gateways, lanes, etc.) is broader than "business-activity level." The current implementation exposes bpmn-js's default palette unconstrained — narrowing it to a subset matching the README's "deliberately incomplete" intent is still open work, not yet done.

## Alternatives considered

- **A different open diagramming tool with no BPMN semantics** (e.g. draw.io, same as System/Interaction). Rejected: BPMN is the established standard specifically for business-process sequencing, and bpmn-js is the mature reference implementation for it — reusing draw.io here would trade a purpose-built notation for a generic one with no benefit.
