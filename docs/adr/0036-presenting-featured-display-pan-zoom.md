# ADR-0036: Presenting mode's featured display is a pan/zoom viewer

- Status: Accepted
- Date: 2026-09-18
- Relates to: [ADR-0019](0019-presenting-mode-inline-grid-reflow.md), [ADR-0033](0033-presenting-mode-featured-layout-fixed-order-dimmed.md) — supersedes their "featured display is a static enlarge" limitation only; layout, fixed order and dimming are unchanged

## Context

The featured display (`.all-featured-display`) reused the already-rendered thumbnail SVG at a larger size — fine for "look closer", but dense diagrams could not be inspected in detail during a walk-through. ADR-0019's "no live editor mounts in Presenting mode" rule still holds, and all four engines already produce real vector SVG thumbnails.

## Decision

1. Pan/zoom is applied to the existing SVG markup with a CSS transform (`src/shell/pan-zoom.js`, registered as `Alpine.data('panZoom')`, hand-rolled — no new dependency). No engine instance is mounted.
2. Wheel zooms about the cursor (1x–8x); drag pans once zoomed; double-click or the **Fit** button resets; **+ / −** buttons zoom about the centre. The transform resets whenever the featured canvas or its thumbnail changes.
3. Plain clicks on the featured display no longer un-feature (they would fire at the end of a drag and on double-click). Un-featuring is the **×** button, or clicking the dimmed small tile (unchanged, ADR-0033).
4. Deliberately pan/zoom only: no per-tool tooltips or selection beyond what the SVG itself carries.

## Consequences

- Crisp at any zoom (vector), instant to open (no engine load), consistent with ADR-0030's no-animation stance.
- Panning is unbounded (a diagram can be dragged fully out of view); **Fit** recovers.
- Mouse/trackpad only in practice — mobile is out of scope (ADR-0034).

## Alternatives considered

- **`svg-pan-zoom` library.** Rejected — a small, self-contained transform did not justify a dependency.
- **Mount the live engine read-only.** Rejected — breaks ADR-0019's rule and adds heavy load per tile switch.
