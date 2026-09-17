# ADR-0033: Presenting mode's featured layout — fixed-order tiles, dimmed not excluded

- Status: Accepted
- Date: 2026-09-17
- Relates to: [ADR-0019](0019-presenting-mode-inline-grid-reflow.md) — supersedes, partially, its featured-layout composition mechanism only; the Presenting-mode concept, the in-place-reflow principle (no lightbox), and `toggleZoom`'s click semantics are otherwise unchanged

## Context

ADR-0019's featured layout builds its narrow-column stack by filtering the currently-featured view *out* of the canonical `['process', 'system', 'object', 'interaction']` order and re-mapping whatever remains into sequential rows, freshly computed every time. Because that "remaining three" list is recomputed from the same canonical order minus a different element each time, an *unfeatured* view's row can still shift when a *different* view gets featured — removing one element from a fixed order changes where everyone after it lands. Reported directly: this reads as the right-side list's own order shuffling as you flip between which canvas is maximized, even though the intent is just to browse alternatives while one stays large.

## Decision

1. All four tiles always render, in the same fixed order used everywhere else in the shell (Process, System/Integration, Object, Interaction — the plain 2x2's own reading order). None is ever excluded from the stack or reassigned to a different row depending on which one is featured.
2. The featured view's enlarged display is a new, separate element (`.all-featured-display`, `index.html`) — not one of the four tiles resized into a bigger grid-area. This is what makes "all four, fixed order, always" possible at all: a single DOM element can only occupy one grid-area, so keeping all four tiles permanently in their own slots requires the enlarged view to render as a fifth, independent element instead of promoting one of the four into that role.
3. The tile matching the currently-featured view dims in place (`.all-cell.dimmed { opacity: 0.45; }`) instead of disappearing from the stack — a visual cue that its content is shown large elsewhere, not a removal; its real thumbnail keeps rendering underneath the dim. It stays fully interactive: clicking it un-features, exactly like clicking the enlarged display does, matching `toggleZoom`'s existing "click the featured one again to un-feature" rule.
4. Column/row sizing: `minmax(0, 3fr) minmax(0, 1fr)` columns, four equal rows (`repeat(4, minmax(0, 1fr))`) — chosen so the narrow column's width fraction (1/4 of the total) matches each row's height fraction (1/4 of the total), preserving each mini tile's proportions now that a fourth row is always present, the same width:height fraction pairing ADR-0019's original three-row layout had (1/3 : 1/3).

## Consequences

**Positive**

- The stack's order and composition are now visually stable across every click — an unfeatured view's tile never jumps or reorders as a different one gets featured, addressing the reported complaint directly.
- Content stays legible even while dimmed — the small tile keeps rendering its real thumbnail, not a blank placeholder, so its content is still visible at a glance.

**Negative / risks**

- Intentional duplication: the featured view's content now renders in two places simultaneously (large and small-dimmed) — a deliberate tradeoff for keeping the other three fixed, not an oversight. Cost is minor: `renderAllThumbnails` already renders each view's thumbnail once per Issue and caches it by content hash (ADR-0012); this is a second DOM insertion of the same already-rendered SVG string, not a second render pass.
- `.all-cell`'s existing `data-view`-keyed grid-area rules (`[data-view='process'] { grid-area: process; }`, etc.) must never be reused for the featured display's own CSS targeting — a shared `data-view` value would let those more-specific selectors override `.all-featured-display`'s own `grid-area: featured` assignment. Solved with a separate `data-featured-view` attribute, used only for the featured display's own Process/System white-background rule (the same reasoning as ADR-0025), never for grid placement.

## Alternatives considered

- **Keep the "remaining three, recomputed" stack, but leave the featured view's row visually empty instead of excluding it.** Rejected — an empty gap where the featured tile "should" be reads as more confusing than a dimmed real tile, and still needs the same underlying change (a separate element for the big display) to stop the *other* three's rows from shifting once one specific row goes empty instead of being reflowed around.
- **Keep excluding the featured view from the stack, but order the remaining three by least-recently-featured instead of canonical order.** Rejected — still not fixed; the actual requirement is a stack whose order never depends on featuring state at all.
