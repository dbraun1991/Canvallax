# ADR-0030: Presenting mode's grid reflow keeps its instant snap

- Status: Accepted
- Date: 2026-09-17
- Relates to: [ADR-0019](0019-presenting-mode-inline-grid-reflow.md) — closes, permanently, the "revisit only if it reads as jarring in practice" question ADR-0019 left open; ADR-0019's own Decision/Consequences are otherwise unchanged

## Context

ADR-0019 already noted, as an accepted limitation, that switching a tile in/out of Presenting mode's featured layout is an instant snap — `grid-template-areas` changes aren't meaningfully animatable across browsers when the area count itself changes. It left the door open: "revisit only if it reads as jarring in practice," and `agents.md`'s Future Work list carried that forward as an open item.

Asked directly whether it's worth smoothing out now, the direction was to keep the snap — for a reason beyond ADR-0019's original cross-browser-animatability one: Presenting mode is specifically the walkthrough feature used to present canvases to someone else (README, ADR-0017/0018), and Canvallax's whole premise is a *remote* team tool (README's opening line) — so that walkthrough is very often happening over a screen-share or remote call. An animated transition introduces a window where the layout is mid-change; if the connection between presenter and viewer hiccups during exactly that window, the animation itself is what can visibly stutter or appear broken on the receiving end. An instant, single-frame state change has no such window — there's nothing rendered "mid-transition" for a dropped frame or a stalled stream to catch.

## Decision

Presenting mode's grid reflow keeps its instant snap, permanently — not as a stopgap pending future polish. The "revisit if jarring" question ADR-0019 left open is closed: it isn't being revisited by design, for two compounding reasons now — the cross-browser animatability difficulty ADR-0019 already identified, and the connection-reliability risk above, specific to this feature's actual use case (a live, often-remote walkthrough).

## Consequences

**Positive**

- Deterministic, single-state-change behavior that can't itself become a visible glitch if a presenter's or viewer's connection is unstable mid-walkthrough — the exact moment this feature is being used.
- No further effort spent chasing a hard-to-animate CSS property (`grid-template-areas`) for a cosmetic gain that comes with a real reliability tradeoff.

**Negative / risks**

- None beyond what ADR-0019 already accepted — the layout change still reads as an instant snap rather than a smooth transition. Accepted tradeoff, now closed rather than open.

## Alternatives considered

- **Animate via a different technique instead of `grid-template-areas` directly** (e.g. a crossfade, or a transform-based reflow). Rejected — any non-instant transition reintroduces the same connection-reliability risk this decision is specifically about, regardless of which CSS mechanism drives it.
