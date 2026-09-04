# ADR-0005: System/Integration and Interaction Canvases — draw.io (diagrams.net)

- Status: Accepted — Interaction Canvas superseded by [ADR-0021](0021-interaction-canvas-excalidraw.md): Excalidraw, not draw.io. System/Integration's draw.io integration described below is entirely unchanged.
- Date: 2026-09-03
- Relates to: [ADR-0003](0003-canvas-architecture.md)

## Context

Two canvases need general-purpose, free-form diagramming rather than a fixed notation:

- **System/Integration Canvas** — external systems/services and the data/protocols exchanged at each incoming/outgoing interface.
- **Interaction Canvas** — a navigation overview of menu structure and dialog flow, plus rough storyboard-level sketches of screens.

Both are architecture/flowchart-shaped rather than process- or entity-shaped, and both benefit from a large, pre-built shape-library ecosystem — network/architecture icons for one, wireframe/mockup shapes for the other — rather than a bespoke notation.

## Decision

Use **draw.io / diagrams.net**, embedded via its documented `postMessage` embed protocol, for both canvases, persisting content as `.drawio` (mxGraph XML) — one document per canvas instance.

`src/canvases/system/drawio-canvas.js` is the one integration module; the Interaction Canvas mounts it too rather than duplicating the embed logic (same tool, same protocol, two separate mounted instances). The mount sequence: the iframe posts `{event:'init'}`, we reply with a `load` action carrying the XML, and it posts `{event:'autosave', xml}` on every subsequent change.

## Details

- **License**: Apache License 2.0 ([jgraph/drawio](https://github.com/jgraph/drawio)) — permissive, no watermark or in-UI attribution requirement.
- **Format**: `.drawio` (mxGraph XML) — widely supported (desktop app, VS Code extension, Confluence/Jira plugins, GitHub/GitLab preview).
- **Shape libraries**: draw.io ships network/AWS/Azure/GCP architecture stencils and wireframe/mockup stencils out of the box — no custom shape authoring needed to start.
- **Realtime collaboration**: not available in a plain self-hosted/embedded app — draw.io only ships it as part of specific first-party integrations (Confluence, Nextcloud) Canvallax isn't using.

## Consequences

**Positive**: one integration covers two canvases; large built-in stencil libraries fit both needs without custom shape work; permissive license, no UI constraints (unlike bpmn-js's watermark).

**Negative**: draw.io is general-purpose, not purpose-built for either use case — curating/restricting the shape palette per canvas to stay "deliberately incomplete" is still open work.

**Negative**: mxGraph XML is draw.io-specific, not a cross-tool standard the way BPMN is.

## Alternatives considered

- **BPMN or another fixed notation for these two canvases.** Rejected: neither maps onto a single established notation the way Process (BPMN) or Object (ER/class diagrams) do — a general-purpose freeform tool is the better fit.
