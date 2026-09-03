# ADR-0018: Presenting vs. Editing canvas modes

- Status: Accepted — enlarge mechanism superseded by [ADR-0019](0019-presenting-mode-inline-grid-reflow.md): an in-place grid reflow replaces the zoom-lightbox overlay described below; the mode concept, the footer toggle, and Editing mode's tab switcher are otherwise unchanged.
- Date: 2026-09-03
- Extends: [ADR-0012](0012-all-view-thumbnails.md)
- Relates to: [ADR-0017](0017-shell-navigation-restructure.md)

## Context

The All view (ADR-0012) already renders every canvas as a same-size thumbnail with click-through into its live editor. That click-through assumes the viewer is about to edit. Direction given: split that assumption into two explicit modes, toggled from the Backlog panel's now-single-panel footer (ADR-0017 freed that space by moving the theme toggle out) — a labeled toggle-switch control, the same shape another project's own sidebar footer already uses for its "File Manager" mode toggle.

**Editing** is today's behavior, restyled. **Presenting** is new: a walk-through/demo mode where clicking a canvas enlarges it in place rather than opening it for editing, and no per-canvas switch control is shown at all — there's nothing to switch between beyond the grid and one enlarged tile.

## Decision

**`canvasMode`** (`shell-state.js`): `'editing' | 'presenting'`, defaulting to `'editing'` at app init. Unlike `activeView`, it is **not** reset by `selectIssue()` — it's a standing viewing preference for the session, the same category as `theme`, not per-Issue state. Switching *into* Presenting forces `activeView` back to `'all'` and clears any open zoom; switching *into* Editing leaves `activeView` wherever it already was (no forced navigation either way).

**Both modes default to the same All-grid** — ADR-0012's `renderAllThumbnails()`/`thumbnails.js` is reused unchanged; same-size tiles, same rendering and caching in both modes. What differs is only what a tile click does and whether a switcher is shown at all:

- **Editing mode**: a tile click calls `setView(view)` exactly as today, mounting the real engine (bpmn-js / draw.io / Mermaid) full-screen. The view-switcher is shown, restyled from plain pill buttons into an active-tab structure (`.canvas-tabs`/`.canvas-tab.active`, an underline-style active indicator) — same five options (All + four canvases), same `setView` calls underneath, visual treatment only.
- **Presenting mode**: a tile click calls `openZoom(view)` instead, setting `zoomedCanvas` and showing the same already-rendered thumbnail content (`thumbnails[view]`) enlarged in a lightbox overlay — never mounting a live engine instance, since nothing is being edited. No switcher is rendered in this mode at all (`x-show="canvasMode === 'editing'"` on `.canvas-tabs`); the grid and the zoom lightbox are the only two states. Closing the lightbox returns to the grid.

Copy/History (`.view-tabs-actions`) need no new gating for this: they're already conditioned on `activeView !== 'all'`, and Presenting mode never leaves `'all'`, so they fall out of view automatically without a mode-specific rule.

## Consequences

**Positive**

- Reuses ADR-0012's thumbnail pipeline entirely as-is — Presenting mode adds a viewing state, not a new rendering path.
- The mode is a session-wide preference, not per-Issue bookkeeping — switching Issues while presenting to someone doesn't silently drop back into an editable state.
- Copy/History's existing `activeView !== 'all'` gate does double duty for free; no separate "hide these in Presenting mode" rule needed.

**Negative / risks**
- The zoom lightbox shows a static thumbnail, not a pannable/zoomable live render — acceptable for the current "enlarge to look closer" ask, but a real diagram viewer (pan/zoom) is a larger feature if that turns out to matter later.
- Two mode-dependent behaviors on the same click target (`setView` vs. `openZoom`) live in the same template expression — worth a code comment at the call site so a future edit doesn't drop the branch by accident, the same caution ADR-0008 flagged for its own two-rule Backlog-expanded state.
- `canvasMode` surviving across Issue switches means a Presenting session started for one Issue stays active when you switch to another via the burger menu's Issue-picker — intentional per the "standing preference" framing above, but worth knowing if it turns out people expect it to reset.

## Alternatives considered

- **Reset `canvasMode` to `'editing'` on every `selectIssue()`**, mirroring how `activeView` already resets. Rejected: Presenting is a deliberate, session-level choice (e.g. about to show a stakeholder several Issues in a row) — resetting it on every Issue switch would fight that exact use case.
- **A live, pannable viewer for the zoom lightbox** instead of a static enlarged thumbnail. Deferred: real scope beyond "enlarge to look closer," no direction given to build it now.
- **Keep the switcher visible but disabled in Presenting mode**, rather than hiding it. Rejected per explicit direction ("does not offer switch buttons for the canvases") — a visible-but-inert control would misrepresent what's actually navigable.
