# ADR-0029: Language flyout has zero gap to its row (closes a hover dead zone)

- Status: Accepted
- Date: 2026-09-17
- Relates to: [ADR-0028](0028-language-flyout-opens-on-hover.md) — fixes a bug in the hover behavior it introduced

## Context

[ADR-0028](0028-language-flyout-opens-on-hover.md) made the Language row open its flyout on `mouseenter`/`mouseleave` of the shared wrapper (`.burger-menu-language-wrap`), reasoning that since both the row and the flyout are descendants of that one wrapper, moving the pointer from one to the other shouldn't trigger `mouseleave` at all — `mouseenter`/`mouseleave` only fire when the pointer crosses the boundary of the *whole* subtree, not when it moves between descendants within it.

Direct follow-up feedback reported the opposite: moving the cursor slowly from the row to the flyout reliably closed it, as if the flyout had already gone by the time the pointer arrived. The cause was CSS left over from ADR-0027's original layout, unrelated to the hover mechanism itself: `.language-flyout` had `margin-left: 4px`, positioning it 4px away from the wrapper's right edge. That 4px strip is not covered by any element in the wrapper's subtree — moving through it, the pointer is briefly over empty page background, which *is* outside the subtree and *does* trigger `mouseleave` on the wrapper. A fast move can jump over 4px in one input event and never register a point inside the gap; a slow move samples several points while crossing it, and the first one that lands inside the gap closes the menu before the pointer ever reaches the flyout — matching exactly what was reported.

## Decision

`.language-flyout` drops its `margin-left: 4px`, so its left edge sits at exactly `left: 100%` of the wrapper — flush against the row's right edge, with zero unclaimed space between them. Verified directly via `elementFromPoint` sampling across the former gap's coordinates: every point from the row's edge to the flyout's edge now resolves to an element inside `.burger-menu-language-wrap`'s subtree, with none landing on empty page background.

## Consequences

**Positive**

- Removes the dead zone entirely rather than working around it — no minimum-move-speed requirement, no timing/delay logic needed to paper over it.
- Matches how most native/OS submenus look and behave: the submenu sits directly against its parent item, not floating a few pixels off it.

**Negative / risks**

- None identified — the visual difference (flyout touching the row instead of floating slightly off it) is negligible and arguably more conventional.

## Alternatives considered

- **Add a close delay** (e.g. a ~150–300ms timeout on `mouseleave` before actually closing, cancelled by a subsequent `mouseenter`). Rejected as a first fix: it papers over a real dead zone rather than removing it, and would still fail for a pointer that pauses in the gap for longer than the delay. Worth revisiting only if a real, unavoidable gap is ever needed for some other layout reason.
- **Keep the 4px visual gap, bridge it with an invisible hit-testable element** (e.g. a transparent `::before` spanning the gap). Rejected as unnecessary complexity — removing the gap outright is simpler and has no downside here.
