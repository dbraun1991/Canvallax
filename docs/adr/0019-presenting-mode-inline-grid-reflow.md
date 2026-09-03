# ADR-0019: Presenting mode's enlarge is an in-place grid reflow, not a lightbox overlay

- Status: Accepted
- Date: 2026-09-03
- Supersedes (the zoom-lightbox mechanism only): [ADR-0018](0018-presenting-and-editing-canvas-modes.md) — the Presenting/Editing mode concept itself, the footer toggle, and Editing mode's tab-styled switcher are otherwise unchanged.
- Relates to: [ADR-0012](0012-all-view-thumbnails.md), [ADR-0017](0017-shell-navigation-restructure.md)

## Context

ADR-0018 shipped Presenting mode's "enlarge a tile" as a full-screen lightbox — a backdrop plus a centered modal panel, reusing the same skeleton as the Issue-picker and Settings overlays. In actual use this had a real cost the ADR hadn't accounted for: the backdrop sits above everything, including the Backlog panel, so it's impossible to look at an enlarged canvas and edit a Backlog entry at the same time — exactly the situation Presenting mode is for (walking through canvases with someone while the Backlog stays at hand).

Direction given: instead of overlaying the whole shell, reflow the All-grid itself. Before a click, all four tiles are the same size (today's 2x2). After clicking one, it enlarges in place and the other three shrink into a stacked column beside it — a "1 large + 3 stacked" layout, not a "1 large + 3 hidden behind a backdrop" one.

## Decision

**No more overlay.** `featuredCanvas` (renamed from `zoomedCanvas`) drives the All-grid's own `grid-template-columns`/`-rows`/`-areas` via a computed `allGridStyle` getter (`shell-state.js`), bound with `:style` on `.all-grid` (`index.html`) — the grid itself reflows, nothing is layered on top of the shell:

- **No tile featured** (`featuredCanvas === null`): the existing plain 2x2 — two equal columns, two equal rows.
- **One tile featured**: two columns (`minmax(0, 2fr) minmax(0, 1fr)`) — the featured view's grid-area spans all three rows in the wide column; the other three each take one row in the narrow column, in their fixed relative order (skipping whichever is featured).

Each `.all-cell`'s own `grid-area` is static CSS, keyed by a `data-view` attribute (`process`/`system`/`object`/`interaction`) — only the *container's* template changes; the cells themselves don't move in the DOM or get reordered.

**`toggleZoom(view)`** replaces `openZoom`/`closeZoom`: clicking the already-featured tile un-features it (back to plain 2x2); clicking a different tile switches the feature directly to it, no need to un-feature first. One method, one rule, instead of separate open/close actions — matches how the tiles actually get used (looking at one, then switching to look at another, is the common case, not always going back to the grid in between).

`minmax(0, Nfr)` everywhere, not plain `Nfr`: an `fr` track's implicit minimum is `auto` (its content's min-content size), so a diagram's own intrinsic SVG dimensions could in principle force a track wider than its share — capping the minimum to 0 lets `.all-cell`'s existing `overflow: hidden` do the clipping instead, regardless of content size.

## Consequences

**Positive**

- Fixes the actual problem: the Backlog panel (and everything else in the shell) stays fully interactive while a canvas is featured, since this is layout, not a modal.
- One state field, one toggle method — simpler than the lightbox's open/close pair plus a separate backdrop-click handler.
- Reuses the All-grid's existing thumbnail rendering and `.all-cell` markup entirely as-is; only the container's `:style` and each cell's click handler changed.

**Negative / risks**

- No transition/animation between the 2x2 and featured layouts — `grid-template-areas` changes aren't meaningfully animatable across browsers when the area count itself changes (adding a row), so this is an instant snap. Acceptable for now; revisit only if it reads as jarring in practice.
- The three non-featured tiles are narrower than before (previously equal quarters, now a narrow stacked column) — their thumbnails read smaller while one is featured. Acceptable since the point is to focus attention on one.
- `.all-cell`'s `data-view` attribute is now load-bearing for layout (CSS reads it for `grid-area`), not just a hook — worth knowing before renaming or removing it casually.

## Alternatives considered

- **Keep the lightbox, but let clicks pass through to the Backlog panel underneath.** Rejected: still fundamentally a full-screen overlay conceptually competing for attention, and partial click-through is exactly the kind of fragile, surprising interaction this project avoids elsewhere.
- **A dedicated "featured" sub-view, navigated to like a fifth `activeView`.** Rejected: more state and routing than the problem needs — reflowing the existing grid in place is a smaller, more direct change.
