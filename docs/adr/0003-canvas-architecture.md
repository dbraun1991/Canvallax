# ADR-0003: Canvas architecture — specialized engine per canvas, no unified SDK

- Status: Accepted
- Date: 2026-09-03
- Relates to: [ADR-0004](0004-process-canvas-bpmn-js.md), [ADR-0005](0005-system-and-interaction-canvases-drawio.md), [ADR-0006](0006-object-canvas-mermaid.md), [ADR-0007](0007-issue-and-backlog-data-model.md)

## Context

Each Issue in Canvallax holds four diagram-shaped canvases — **Process**, **System/Integration**, **Object**, **Interaction** — plus a Backlog list (README). The near-term goal is proving feasibility, not shipping a polished product, and priorities are: (1) compatibility with existing, established open file formats/tools people already use, over (2) interaction consistency across canvases; real-time multiplayer collaboration is explicitly lower priority than either. The project is open source with no constraint against copyleft dependencies.

## Decision

Build each canvas on a specialized, best-fit open source tool rather than one unified canvas SDK, favoring native support for an existing open file format over a single shared data/interaction model:

| Canvas | Tool | Persisted format | Details |
|---|---|---|---|
| Process | bpmn-js | BPMN 2.0 XML (`.bpmn`) | [ADR-0004](0004-process-canvas-bpmn-js.md) |
| System/Integration | draw.io / diagrams.net (embed) | mxGraph XML (`.drawio`) | [ADR-0005](0005-system-and-interaction-canvases-drawio.md) |
| Interaction | draw.io / diagrams.net (embed) | mxGraph XML (`.drawio`) | [ADR-0005](0005-system-and-interaction-canvases-drawio.md) |
| Object | Mermaid | Mermaid diagram text | [ADR-0006](0006-object-canvas-mermaid.md) |

Backlog is not a fifth diagram engine — it's Canvallax-native list data living as fields on the Issue document itself ([ADR-0007](0007-issue-and-backlog-data-model.md)), not a wrapped external format.

## Consequences

**Positive**

- Each canvas gets a mature, standards-based editor "for free," instead of Canvallax reimplementing BPMN/ERD/architecture-diagram editing UX.
- Output stays portable: `.bpmn` and `.drawio` files open in any BPMN/draw.io-compatible tool; Object canvases are plain-text Mermaid, diffable in git.
- Fastest path to a feasibility prototype — three of four diagram canvases are "embed and wire up," not "build from scratch."

**Negative / risks**

- Four distinct integration surfaces (bpmn-js's JS API, draw.io's embed `postMessage` protocol, Mermaid's text-render pipeline, the Backlog's own schema) instead of one.
- BPMN element IDs, mxGraph cell IDs, and Mermaid node IDs are three incompatible ID spaces with no shared element-addressing scheme — this is why Canvallax deliberately does not attempt cross-canvas element-level linking ([ADR-0009](0009-no-cross-canvas-linking.md)).
- None of the three tool-backed engines include real-time multiplayer editing out of the box — see each engine's own ADR for feasibility notes.

## Alternatives considered

- **Single unified canvas SDK** (e.g. tldraw, React Flow) for all canvases. Rejected: standards compatibility (`.bpmn`/`.drawio`/Mermaid interoperability with tools teams already use) is prioritized over interaction consistency, and Process/Object map onto existing, purpose-built open notations a generic canvas SDK would have to reimplement from scratch.
