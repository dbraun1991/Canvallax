# ADR-0017: Shell navigation restructure — burger-menu Issue picker, single left Backlog panel, top brand bar

- Status: Accepted
- Date: 2026-09-03
- Supersedes: [ADR-0008](0008-issue-centric-shell.md) in full — none of its three regions (sidebar / main / Backlog-on-the-right) survive unchanged. ADR-0016's drag-past-threshold collapse mechanism is *not* superseded, only relocated to the Backlog panel's new edge.
- Relates to: [ADR-0008](0008-issue-centric-shell.md), [ADR-0016](0016-panel-collapse-via-drag-threshold.md), [ADR-0018](0018-presenting-and-editing-canvas-modes.md)

## Context

ADR-0008's persistent Issue sidebar was borrowed from a UI pattern (`bpmn-process-creator`'s own sidebar) built for switching between lightweight, single-visual items — cheap context switches. An Issue here bundles four canvases plus a Backlog; switching Issues is a much heavier jump than that pattern was designed for, and keeping the switcher permanently visible next to the actual work no longer earns its screen space now that the shell has grown past a single-visual tool.

Direction given: demote Issue selection to an overlay (shown by default whenever nothing is selected, reachable afterward through a menu) rather than a permanently docked panel; let the Backlog panel — which already covers the whole Issue, not one canvas — take over the freed left position, matching the reading-order convention (overview top-left, focused work to its right) the workspace already leans on elsewhere; and add a burger-menu-triggered navigation cluster in the shell's top-left corner, the one region that must stay reachable even before an Issue exists.

`bpmn-process-creator` supplied two more directly reusable patterns for this: a header brand cluster (icon + title text, always visible top-left) and a modal skeleton (backdrop, header with a × close, body, footer actions) — the latter already partially present in this codebase as `.copy-picker`/`.copy-picker-backdrop` (ADR-0011), extended here rather than redesigned.

## Decision

**1. Top brand bar** (`index.html`, new `.brand-bar`) — a burger button (☰) and the "Canvallax" wordmark, sitting above `.shell-columns` and visible unconditionally (not gated on `activeIssue`, unlike everything below it). This is the one piece of shell chrome that has to work before any Issue is picked.

**2. Burger menu** — a small anchored dropdown (not a full-screen modal; a transparent click-catching backdrop only, no dimming) opened from the brand bar, holding three items: **Change Issue** (opens the Issue-picker overlay below), the **theme toggle** (relocated here from last session's `.shell-header-actions`), and **Settings** (opens a mock overlay, still inert — see ADR discussion in agents.md's Future Work; no behavior beyond the placeholder is decided yet).

**3. Issue-picker overlay** replaces the persistent sidebar entirely. It reuses the sidebar's former contents verbatim — search field, "+ New Issue," the Issue list (`.issue-item` etc., unchanged) — now inside a centered overlay panel built on the same backdrop+panel skeleton `.copy-picker` already established. Two triggers, not one: it shows automatically whenever `!activeIssue` (with no way to dismiss it in that state — same as today's forced-selection behavior, just without a separate "Select an Issue…" placeholder text now that the overlay itself fills that role), and it can additionally be opened on demand via the burger menu's "Change Issue" even while an Issue is already active, closable in that case. `selectIssue(id)`'s own reset behavior (`activeView` → `'all'`) is unchanged — only how the picker is reached changes.

**4. Backlog panel moves to the left**, replacing the sidebar's position in `.shell-columns`. Its resize handle mirrors from `resize-handle-left` to `resize-handle-right` (grows rightward now, same drag-past-threshold mechanism as ADR-0016, unchanged) and its border moves from `border-left` to `border-right`. Since the sidebar is gone, `startResize(panel, event)`'s two-panel generality is retired along with `sidebarExpanded`/`sidebarWidth`/`resizingPanel`'s `'sidebar'` branch — a single-panel `startBacklogResize(event)` replaces it, dead flexibility removed rather than left in place unused.

**5. `.shell-header`** (Issue name/status, the view-switcher, Copy/History) stays as a second row beneath the brand bar, still gated on `activeIssue`. It loses only the theme toggle and settings button, both relocated into the burger menu. The view-switcher's own restyling into tabs, and its Presenting/Editing-mode gating, is [ADR-0018](0018-presenting-and-editing-canvas-modes.md)'s decision, not this one.

**State-transition note**: the Issue-picker's `showIssuePicker` state is `issuePickerOpen || !activeIssue` — a manual flag OR'd with the existing emptiness check, not a single flag alone, for the same reason ADR-0008 called out for the old Backlog-expanded flag: conflating "forced open because nothing's selected" with "opened on purpose while something is" would make the overlay behave unpredictably around Issue selection/deselection.

## Consequences

**Positive**

- Issue switching no longer costs permanent screen space next to the canvases — it's summoned only when actually needed.
- The Backlog panel's new position matches its actual scope (whole-Issue, not single-canvas) instead of being an arbitrary "put it on the other side" choice.
- Retiring `startResize`'s two-panel generality removes a parameter and a branch that would otherwise be dead code with only one panel left to resize.
- The brand bar gives the app a visible name in its own chrome for the first time — previously only in the `<title>` tag.

**Negative / risks**

- The Issue-picker overlay is now the *only* way to switch Issues — if it has a bug that prevents it opening, there's no fallback path (the old sidebar was always there as a visible list). Worth keeping simple.
- A burger-menu dropdown is a slightly less discoverable location for the theme toggle than its previous direct, always-visible button — a one-more-click cost accepted in exchange for decluttering `.shell-header`.
- The sidebar's mobile `<details>` collapse (ADR-0008, from `Climb-Buddy-Belay`) is removed along with the sidebar itself — moot now that there's no sidebar to collapse, but it also means the open Future-Work question about unifying it with drag-collapse is resolved by deletion, not by a decision either way.

## Alternatives considered

- **Keep the sidebar, just make it narrower/collapsible by default.** Rejected: still permanently reserves screen space and re-litigates the same "far away in mind-state" mismatch the direction explicitly named — an overlay has no resting footprint at all.
- **A full-screen modal for the burger menu**, matching the Issue-picker/Settings overlay pattern exactly. Rejected for the menu itself: three lightweight navigation items don't need a dimmed backdrop or a close button of their own — a small anchored dropdown is proportionate; the heavier modal skeleton is reserved for content-bearing overlays (Issue-picker, Settings).
