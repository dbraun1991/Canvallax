# ADR-0023: Exactly four canvases, not a user-configurable count/style — with an in-app reminder why

- Status: Accepted
- Date: 2026-09-04
- Relates to: [ADR-0003](0003-canvas-architecture.md), [ADR-0007](0007-issue-and-backlog-data-model.md), [ADR-0009](0009-no-cross-canvas-linking.md), [ADR-0021](0021-interaction-canvas-excalidraw.md)

## Context

Before ADR-0021 replaced Interaction's draw.io integration with Excalidraw, draw.io was doing double duty — pressed into both System/Integration's structured-diagram role and Interaction's freeform-sketch role, a mismatch ADR-0005 itself already named. That frustration raised a broader question: if one fixed tool per canvas doesn't always fit, why not let a user choose the number and tool ("style") of canvases per Issue, up to some cap (six was proposed)?

Weighing it directly: Canvallax's actual thesis (README, "Naming") is that **four specific lenses** — Process, System/Integration, Object, Interaction — jointly answer the questions a backlog item raises, not that four is an arbitrary convenient number. A user-configurable count-and-tool system turns that into a generic multi-canvas whiteboard tool — a different product, not an extension of this one. It would also touch nearly every existing ADR: `views` would need to become a variable-length list instead of ADR-0007's fixed-shape object, the All-grid's 2x2 layout and Presenting mode's "1 featured + 3 stacked" reflow (ADR-0019) are both hardcoded around four named slots, and every engine is hardcoded to one canvas (ADR-0004/0005/0006/0021) with no engine-swap layer existing anywhere.

The deciding realization, though, wasn't about cost — it was that **the underlying need doesn't actually require more canvases**. Each engine already supports holding more than one related item in a single canvas: bpmn-js can lay out two or three separate processes (or a pool/lanes structure) on one Process canvas; Mermaid can hold multiple related entity clusters on one Object canvas; draw.io can hold multiple integration flows on one System/Integration canvas; Excalidraw, being freeform, has no such limit at all for Interaction. "I need another canvas" is, in practice, usually "I haven't used this canvas to hold everything it already can."

## Decision

**Stay at exactly four canvases, fixed count, fixed tool per canvas** — no user-configurable amount, no per-canvas tool switch. ADR-0007's `views` shape, ADR-0019's four-slot grid logic, and each canvas's dedicated engine (ADR-0004/0005/0006/0021) are all reaffirmed, not reopened.

**In-app reminder, Editing mode only**: a short hint line above each of the four single-canvas views (`canvasHint(view)` in `shell-state.js`, one line of muted text per canvas, `index.html`) — not a usage tip, but the specific question that view exists to answer for this Issue, the one the other three don't (README's "The Core: Canvases" already names each: Process → what has to happen and in what order; System/Integration → what this depends on outside itself; Object → what data is involved and how it relates; Interaction → what a person actually sees and does). The point isn't "you can fit more in here," it's reorienting to why this particular lens is being used at all. Hidden in Presenting mode (it's an editing nudge, not something to show mid-walkthrough) and on the All grid (nothing to nudge about there).

## Consequences

**Positive**

- No architecture churn — every ADR this would have touched stays exactly as designed.
- Addresses the actual underlying need (each canvas already has room for related items) directly, instead of building a much larger feature to work around not using the room that already exists.
- The reminder that replaced the feature request turned out to serve a second, related purpose beyond the original "you have more room than you're using" — orienting to *why this lens, not another* is open right now, which is useful on its own regardless of the room question.

**Negative / risks**

- A genuinely rare case that needs more than four *distinct kinds* of lens (not just more content within one) has no answer here beyond "open a second Issue" — accepted, since no such case has actually come up yet.
- The reminder is a nudge, not an enforcement — nothing stops a future direction change if the underlying need turns out to be different from what's assumed here.

## Alternatives considered

- **User-configurable canvas count and tool, up to six.** Rejected per the reasoning above — solves a problem ("four isn't enough") that turned out not to be the real one ("I'm not using the room each canvas already has").
- **A per-Issue user-selectable tool switch for one canvas** (the narrower version of this idea, floated earlier for Interaction specifically and left as an open Future Work item at the time). Superseded in practice by ADR-0021's direct choice of Excalidraw — the mismatch that motivated it no longer exists, so the narrower version is moot too.
