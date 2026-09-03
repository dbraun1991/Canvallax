# ADR-0009: No cross-canvas element-link registry

- Status: Accepted
- Date: 2026-09-03
- Relates to: [ADR-0003](0003-canvas-architecture.md), [ADR-0007](0007-issue-and-backlog-data-model.md), [ADR-0008](0008-issue-centric-shell.md)

## Context

BPMN element IDs, mxGraph cell IDs, and Mermaid node IDs ([ADR-0003](0003-canvas-architecture.md)) are three incompatible ID spaces with no shared element-addressing scheme. Building and maintaining a cross-canvas link registry (a context-pad button per element, a custom moddle/mxGraph attribute to store the link target, an overlay badge, a picker UI to resolve it) is real, ongoing surface area — one per tool, since each has its own extension mechanism.

Every Issue already bundles all four canvases plus its Backlog together ([ADR-0007](0007-issue-and-backlog-data-model.md)), and the Backlog panel is always visible alongside whichever canvas is open ([ADR-0008](0008-issue-centric-shell.md)). The Issue itself is already the association between its pieces — nothing currently *needs* a finer-grained, element-to-element link to make that association work.

## Decision

**Do not build a cross-canvas or cross-issue element-link registry.** No context-pad linking button, no moddle/mxGraph extension for storing link targets, no overlay badges, no link picker UI. Association between a Process step, a System/Integration interface, an Object entity, and an Interaction screen happens at the Issue level only — by being canvases of the same Issue, not by an explicit link between two specific elements.

## Consequences

**Positive**

- No per-tool integration surface to build or maintain (context-pad extensions × 3 different extension mechanisms).
- Nothing to keep in sync if an element is renamed, moved, or deleted on one canvas — there's no link pointing at it that could go stale.

**Negative / risks**

- No element-to-element deep-linking is possible — you can't point one specific BPMN task at one specific Object-canvas entity. Known limitation, not an oversight; revisit only if it proves to matter in practice, as new scope requiring its own ADR, not a partially-built feature waiting to be finished.

## Alternatives considered

- **A per-tool link-attachment pattern** generalizing another project's hyperlink module (context-pad button → moddle extension → overlay badge → Ctrl+click-to-follow), plus a registry anchored on the Backlog. Rejected: the Issue-level bundling above already gives every canvas the same association a link registry would provide, at zero ongoing integration cost.
- **A live cross-issue reference** instead of a copy ([ADR-0011](0011-cross-issue-copy.md)). Rejected for the same reason — reintroduces the "several incompatible reference targets" problem this ADR specifically avoids by not building any registry.
