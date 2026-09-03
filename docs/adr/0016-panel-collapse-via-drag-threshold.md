# ADR-0016: Panel collapse via drag-past-threshold, not an explicit toggle button

- Status: Accepted
- Date: 2026-09-03
- Supersedes (Backlog panel's minimize mechanism only): [ADR-0008](0008-issue-centric-shell.md) point 3 — the resizable-panel mechanism, the view-switcher, and the Backlog panel's expand/reset state rules (`selectIssue`/`setView`) are otherwise unchanged.
- Relates to: [ADR-0008](0008-issue-centric-shell.md)

## Context

ADR-0008 gave the Backlog panel an explicit minimize toggle button (`.backlog-toggle`, `toggleBacklog()`) alongside its resizable drag handle — two separate controls doing related things. Direction given: the toggle button is no longer wanted; dragging the handle itself should be the only way to collapse and reopen the panel. Separately, the Issue sidebar had no collapse mechanism at all on desktop (only its mobile `<details>` collapse, a different, breakpoint-driven behavior) — direction extended the same drag-collapse capability to it too, for parity between the two side panels.

## Decision

Both side panels collapse by dragging their own resize handle past a fixed threshold, live during the drag — no separate button:

- `startResize(panel, event)` (`shell-state.js`) tracks each panel's expanded flag (`sidebarExpanded`, `backlogExpanded`) and width (`sidebarWidth`, `backlogWidth`) together. On every `mousemove`, it computes the panel's prospective width from the drag delta: below `COLLAPSE_THRESHOLD` (100px), the panel's expanded flag flips to `false`; at or above it, the flag flips to `true` and the width clamps to `[MIN_PANEL_WIDTH, MAX_PANEL_WIDTH]` (200–480px) as before. Crossing the threshold in either direction updates live, mid-drag — there's no separate "collapsed" vs. "resizing" mode to leave and re-enter.
- Collapsed, a panel renders at a fixed `COLLAPSED_WIDTH` (32px, `.sidebar.collapsed` / `.backlog-panel.collapsed` in `shell.css`) — just enough to keep its own resize handle reachable. The handle is never hidden (`index.html` no longer gates it behind `x-show="backlogExpanded"`), so dragging it back out past the same threshold is the only way to reopen — no separate "reopen" control either.
- `.backlog-toggle` is deleted (markup, JS handler, and its now-orphaned CSS rule) — the resize handle fully replaces it. The theme toggle, previously grouped with it in `.backlog-controls`, keeps its own existing `x-show="backlogExpanded"` binding unchanged (it's still only reachable while the panel is expanded — a separate, not-yet-addressed limitation, see agents.md's Future Work on relocating it out of the Backlog panel entirely).
- The Issue sidebar's mobile `<details>` collapse (ADR-0008, from `Climb-Buddy-Belay`) is unaffected — it remains the below-768px mechanism; the new drag-collapse only applies at desktop widths, same as the resize handles it's built on (`.resize-handle { display: none }` under the existing mobile media query).

## Consequences

**Positive**

- One mechanism instead of two for the Backlog panel (drag replaces drag-to-resize *and* the separate toggle button) — less UI, less code, one thing to learn instead of two.
- The Issue sidebar gains the same capability the Backlog panel already had, closing a gap ADR-0008 never actually addressed (it only ever described the sidebar's *mobile* collapse).
- Collapsing and reopening are the same gesture in both directions — nothing to remember about "how do I get it back," since it's the same handle either way.

**Negative / risks**

- Also resolves ADR-0008's "resize handles have no visible affordance yet" risk in passing, for both panels (`.resize-handle::before` grip mark in `shell.css`), though that CSS work isn't itself the point of this ADR.
- No visible on-screen hint that dragging inward collapses the panel, or that a thin 32px rail is still draggable open — discoverability relies entirely on the resize handle's existing affordance and general drag-to-resize familiarity. Worth watching; a first-time-use hint is easy to add later if it turns out to matter.
- `COLLAPSE_THRESHOLD` (100px) sits inside `[0, MIN_PANEL_WIDTH]` with no visual marker on the handle itself for where it is — a user dragging slowly can't see the threshold coming, only feel the panel snap once they cross it.
- The theme toggle's reachability gap (noted above) is a pre-existing rough edge this ADR didn't fix, since it wasn't in scope — just newly worth flagging now that `.backlog-controls` has lost its second control.

## Alternatives considered

- **Keep the explicit toggle alongside drag-to-collapse**, as a second, more discoverable way to do the same thing. Rejected per explicit direction — the toggle is what's being removed, not duplicated.
- **A gradual/proportional collapse** (panel width shrinks smoothly to 0 rather than snapping to a fixed rail at a threshold). Rejected: a true 0px panel has no handle left to grab to reopen it; a fixed thin rail keeps the handle reachable, which is the whole point of dropping the separate toggle.
