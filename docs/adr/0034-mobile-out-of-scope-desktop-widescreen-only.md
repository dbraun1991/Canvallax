# ADR-0034: Mobile is out of scope — desktop/widescreen only

- Status: Accepted
- Date: 2026-09-17
- Relates to: closes, permanently (not "not yet"), `agents.md`'s "Mobile Backlog collapse" Future Work item

## Context

Canvallax is a workplace tool for remote teams aligning on how a system works (README) — used in real work sessions (analysis, walkthroughs, screen-shared presentations), not a consumer app someone casually browses on a phone. Direct confirmation of the target form factor: Canvallax is a 16:9/widescreen desktop application; mobile phone and small-touch-screen usage is out of scope.

This isn't only a screen-size preference. All four canvases are built directly on rich, desktop-oriented editing tools: bpmn-js's drag-and-drop BPMN palette (ADR-0004), draw.io's full embedded desktop diagramming UI (ADR-0005), Excalidraw's freehand/shape drawing surface (ADR-0021), Mermaid's text+preview pane (ADR-0006). None of these are designed for, or usable well via, touch input at phone/small-tablet scale — precise connector dragging, shape resizing, and freehand drawing all degrade sharply on a small touchscreen, regardless of how much responsive CSS Canvallax's own shell chrome could add around them. The actual constraint is the embedded engines, not Canvallax's own layout code.

`agents.md` already flagged one symptom of this gap: the Backlog panel has no touch-friendly collapse mechanism below the 768px breakpoint, left as "not yet decided whether it needs one."

## Decision

Canvallax explicitly does not support mobile or small-touch-screen usage. Desktop/widescreen (16:9 or wider) is the baseline the shell and all four canvases are designed for — not a large-screen-first design that also degrades gracefully downward. This closes the previously-open "mobile Backlog collapse" item for good: it isn't a deferred "not yet," it's out of scope, because the root blocker (the canvas engines' own touch-unfriendly editing surfaces) isn't something Canvallax's shell layer can fix no matter how much responsive-design effort goes into panels, menus, or breakpoints.

## Consequences

**Positive**

- No responsive/touch design effort spent on a use case the embedded canvas engines can't actually support well regardless — that effort would improve the shell's chrome while leaving the real editing experience broken.
- Keeps the shell's CSS and interaction model simpler: one target form factor, not two.

**Negative / risks**

- Canvallax is unusable or awkward on a phone or small tablet — someone opening a shared link to quickly check something mid-discussion gets a degraded experience with no fallback.
- The existing `.resize-handle { display: none; }` at the 768px breakpoint (Backlog panel) remains a rough, half-finished-looking edge rather than a deliberately designed mobile mode — now understood as an accepted consequence of this decision, not unfinished work.

## Alternatives considered

- **Build a genuinely reduced mobile view** (read-only canvases, no editing) for on-the-go reference. Rejected for now — no concrete use case has come up, and read-only mobile viewing of a canvas that's still hard to usefully see (e.g. a wide BPMN diagram) on a small screen has questionable value without real design work behind it. Revisit only if a specific need (e.g. "let me glance at this on my phone during a meeting") actually shows up.
- **Add responsive breakpoints that shrink the editing UI to fit mobile widths.** Rejected — the constraint isn't Canvallax's own shell layout, it's the embedded canvas engines' own touch-editing usability, which responsive CSS on Canvallax's side can't fix.
