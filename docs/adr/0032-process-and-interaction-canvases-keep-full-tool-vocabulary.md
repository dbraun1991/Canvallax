# ADR-0032: Process and Interaction Canvases keep their tools' full default vocabulary

- Status: Accepted — revisit only on an observed need, not preemptively
- Date: 2026-09-17
- Relates to: [ADR-0004](0004-process-canvas-bpmn-js.md) (flagged narrowing bpmn-js's palette as open work), [ADR-0021](0021-interaction-canvas-excalidraw.md) (same category of open work for Excalidraw's toolset)

## Context

ADR-0004 flagged narrowing bpmn-js's default palette toward Process Canvas's "business-activity level" scope (README) as unbuilt work — the canvas currently exposes BPMN's entire vocabulary (all event types, gateway types, pools/lanes, sub-processes, etc.), broader than a business-activity sequence diagram needs. `agents.md`'s Future Work carried the same category of open item for Interaction Canvas: Excalidraw's full toolset (shapes, freehand, text, images, frames, laser pointer) is available as-is, unnarrowed toward "storyboard-level sketch" (ADR-0021).

Asked directly whether to narrow either now: the concrete risk is real — bpmn-js's full vocabulary is built for engineers doing formal BPM analysis, which is a level below where Process Canvas is meant to sit, and could let someone model at a technical depth the canvas isn't scoped for, or simply overwhelm a non-technical stakeholder with irrelevant options. But no actual instance of that has shown up in practice — none of the example Issues' diagrams have drifted into the deeper technical constructs the concern is about, for either engine. Direction given: keep both full for now.

## Decision

Process Canvas keeps bpmn-js's full default palette; Interaction Canvas keeps Excalidraw's full default toolset. Both ADR-0004's and ADR-0021's "curate later" items are closed as settled-for-now — revisit only once a concrete instance of the predicted problem (confusion, or a diagram actually drifting into out-of-scope technical modeling) is observed, not preemptively from theory. Curating either tool's vocabulary without a real example to curate against risks removing something that turns out useful, or leaving in whatever the actual troublesome element turns out to be, since it wasn't identified from real use.

## Consequences

**Positive**

- Avoids designing a constrained profile from theory alone — the eventual subset (if one is ever built) can be shaped by an actual observed problem instead of a guess.
- Keeps both canvases maximally capable in the meantime, at no cost since the predicted downside hasn't materialized.

**Negative / risks**

- The mismatch ADR-0004/ADR-0021 already flagged — full technical vocabulary against a "business-activity"/"storyboard" framing — remains live. A new stakeholder can still be confronted with, e.g., BPMN's event-based gateways or Excalidraw's frame tool, despite neither being core to either canvas's intended use.

## Alternatives considered

- **Narrow both now, based on the stated scope alone.** Rejected — defining "the right subset" without an observed real need risks getting it wrong in either direction: too restrictive (removing something that turns out to matter) or missing the actual element that turns out to cause confusion in practice.
