# ADR-0008: Issue-centric shell — sidebar, All + 4-view switcher, persistent Backlog panel

- Status: Accepted
- Backlog minimize mechanism superseded by: [ADR-0016](0016-panel-collapse-via-drag-threshold.md) — drag-past-threshold on the resize handle replaces the explicit toggle button described in point 3 below; the resizable-panel mechanism and the expand/reset state rules are otherwise unchanged.
- Date: 2026-09-03
- Relates to: [ADR-0003](0003-canvas-architecture.md), [ADR-0004](0004-process-canvas-bpmn-js.md), [ADR-0007](0007-issue-and-backlog-data-model.md), [ADR-0009](0009-no-cross-canvas-linking.md), [ADR-0012](0012-all-view-thumbnails.md)

## Context

Every Issue bundles its four canvases plus a Backlog list together (README). The shell needs to be **issue-scoped, not canvas-scoped**: pick an Issue, then switch between a read-only overview and each canvas's full-screen editor, with the Backlog always reachable — not a separate mode you have to leave the current canvas to see. Two workable UI patterns already exist in this workspace worth reusing directly rather than designing from scratch:

- **`bpmn-process-creator`** — a resizable `<aside>` sidebar with a drag-handle resize mechanism (`mousedown`/`mousemove`, `ew-resize` cursor, min/max width clamped).
- **`Climb-Buddy-Belay`** — a mobile-responsive `<aside class="sidebar">` that collapses into a native `<details class="sidebar-collapse" open>`/`<summary>` disclosure below a breakpoint, no JS required.

## Decision

Three regions (`index.html`, `src/shell/shell-state.js`):

**1. Issue sidebar (left)** — a resizable, `<details>`-wrapped panel holding a search field and the Issue list (name + status). Resize via `startResize('sidebar', event)`, clamped to `[200, 480]`px; the `<details>` wrapper gives the mobile collapse for free, no separate breakpoint logic needed.

**2. Main area (center)** — a view switcher between five states: **All** (a read-only grid rendering each of the four canvas engines' current content as a thumbnail — [ADR-0012](0012-all-view-thumbnails.md) — with click-through into the matching single-canvas view) and the four single-canvas editors, each full-screen with its own native engine. Process additionally docks `@bpmn-io/properties-panel` between the canvas and the Backlog panel ([ADR-0004](0004-process-canvas-bpmn-js.md)) — the only one of the four with an element-properties editor, since no equivalent official package exists for the other three.

**3. Backlog panel (right)** — the active Issue's `backlogEntries` list (add/rename/describe/delete), present in every view-switcher state via the same resizable-`<aside>` mechanism mirrored to the right edge (`startResize('backlog', event)`), with its own minimize toggle (`toggleBacklog()`) distinct from the sidebar's mobile collapse.

**State-transition rules** (`shellState()` in `shell-state.js`), the one part of this ADR that needed real design rather than reuse:

- **`selectIssue(id)`** always resets `activeView` to `'all'` and `backlogExpanded` to `true`, regardless of what was left over from a previously active Issue. Every Issue has the same, predictable entry point.
- **`setView(view)`** changes only the active view; the Backlog panel's expanded flag is untouched, so switching canvases within an already-open Issue doesn't flicker the panel open/closed.
- **`toggleBacklog()`** flips the expanded flag; it persists across further `setView` calls until the next `selectIssue` call resets it again.

So the flag is **global within an Issue session, but reset on every Issue activation** — not purely global in the strictest sense. Two rules, not one; both must be implemented together for the shell to feel predictable rather than flickery.

## Consequences

**Positive**

- The mobile-collapse and drag-resize interactions are reused wholesale from working sibling implementations instead of designed from scratch, and both panels share one resize mechanism despite sitting on opposite edges of the shell.
- Every Issue has the same, predictable entry point (All view, Backlog expanded) regardless of what state a previous session or a different Issue was left in.
- `@bpmn-io/properties-panel` gives Process a maintained, BPMN-aware element-editing UI "for free."

**Negative / risks**

- Three of five main-area states (System/Integration, Interaction, Object) have no element-properties panel at all — only Process does — so the shell's chrome is asymmetric depending on which view is active.
- The Backlog panel's "global, with one deliberate reset trigger" state is two rules to implement correctly, not one — worth a comment at the implementation site (see `shell-state.js`) so a future edit doesn't collapse it back to a single, simpler-looking rule by accident.
- Resize handles have no visible affordance yet (`.resize-handle-*` in `index.html`) — nothing currently shows they exist or are draggable.

## Alternatives considered

- **Modal-based element-property editing** instead of a docked panel. Rejected for Process: a docked panel keeps attributes visible while browsing the canvas, where a modal would need reopening per element.
- **View selection remembered per-Issue** instead of always resetting to All. Rejected: a state that reset differently per Issue would be less predictable than one fixed entry point, and adds bookkeeping (which view was this Issue last on) for a benefit nobody asked for.
