# ADR-0028: Language flyout opens on hover, not click

- Status: Accepted
- Date: 2026-09-17
- Relates to: [ADR-0027](0027-language-switcher-flyout-with-flags-four-languages.md) — supersedes, partially, its click-to-open trigger

## Context

[ADR-0027](0027-language-switcher-flyout-with-flags-four-languages.md) built the Language row as a click-toggled flyout. Explicit follow-up feedback asked for hover instead — opening on mouseover, closing on mouseout, matching how a submenu flyout conventionally behaves (desktop OS menus, most sidebar/nav flyouts) rather than requiring a click.

Separately, verifying ADR-0027 in the browser surfaced a layout bug in the same row: its `<button>` sits inside a wrapping `<div>` (needed for the flyout's `position: absolute` anchor), so unlike the burger menu's other buttons — direct flex children of `.burger-menu`, which stretch to the menu's full width via `align-items: stretch` — this one wasn't a direct flex child and fell back to shrink-to-fit sizing. The row measured 115px wide against the menu's actual 198px, so `.burger-menu-caret`'s `margin-left: auto` had almost no room to push against: the caret sat right after the label instead of at the row's far edge. This wasn't a decision to revisit, just an implementation bug against ADR-0027's own stated design — fixed alongside the hover change by giving `.burger-menu-item` an explicit `width: 100%`.

## Decision

1. The language row's wrapping element (`.burger-menu-language-wrap`) listens for `mouseenter`/`mouseleave`, not `click`, to open/close the flyout. Hovering over either the row or the flyout itself keeps it open — the listeners are on the shared wrapper, not the row alone — so the pointer can travel from one to the other without the flyout disappearing mid-move.
2. `.burger-menu-item` gets an explicit `width: 100%` (plus `box-sizing: border-box`) so a button nested inside a wrapper div fills the same width as one that's a direct flex child, fixing the caret-alignment bug described above.

## Consequences

**Positive**

- Matches conventional hover-driven flyout behavior elsewhere (desktop OS submenus), one fewer click than before.
- The row now visibly fills the menu's actual width, matching what ADR-0027 already intended — the caret sits flush at the row's right edge instead of bunched against the label.

**Negative / risks**

- Hover-only opening has no equivalent on touch devices (no hover state to trigger it) — a gap in the same category as the Backlog panel's already-flagged missing touch-collapse affordance (agents.md, Features & Future Work). Not solved here; revisit only if/when the shell's touch support is addressed generally.

## Alternatives considered

- **Keep ADR-0027's click-to-toggle.** Rejected per explicit follow-up direction.
- **Support both click and hover** (a touch-friendly fallback alongside the hover behavior). Not pursued — the touch-affordance gap this would paper over is already a known, tracked limitation elsewhere in the project rather than something worth solving piecemeal for one menu row.
