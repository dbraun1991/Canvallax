# ADR-0024: System/Integration's draw.io drawing surface stays permanently light

- Status: Accepted
- Date: 2026-09-15
- Relates to: [ADR-0004](0004-process-canvas-bpmn-js.md), [ADR-0005](0005-system-and-interaction-canvases-drawio.md), [ADR-0013](0013-theming-light-and-dark-mode.md)
- Supersedes, partially: [ADR-0013](0013-theming-light-and-dark-mode.md)'s decision that System/Integration follows the shell theme — its `dark: theme === 'dark'` mechanism is replaced below with an always-light drawing surface. Everything else in ADR-0013 (the shell toggle itself, Object/Mermaid's theming, Process staying light) is unchanged.

## Context

ADR-0013 gave System/Integration (draw.io) its own theming hook — a `dark: theme === 'dark'` field on draw.io's embed `load` postMessage payload — while explicitly scoping that theming to "canvas background/chrome" only, deliberately leaving existing shape fill/stroke colors as authored (ADR-0013's Decision, "Scope, all three").

In practice, this scoping produces a real visibility problem: a connection drawn in draw.io gets no explicit `strokeColor`, which renders as black by default, baked directly into the saved `.drawio` XML. That default black connector color doesn't repaint when `dark: true` darkens draw.io's own canvas background — so a diagram with several connections becomes hard to read once the shell (and therefore draw.io's canvas) goes dark, exactly the same failure shape ADR-0013 already identified and accepted for Process, except Process's fix (staying permanently light, never following the shell theme at all) was never extended to System.

## Decision

`mountDrawioCanvas` and `renderDrawioThumbnail` (`src/canvases/system/drawio-canvas.js`) now always send `dark: false` in draw.io's `load` payload, regardless of the shell's active theme — the drawing surface itself stays permanently light, the same choice already made for Process (ADR-0013) and for the same reason: default black connector strokes need a light backdrop to stay legible, and recoloring already-authored stroke colors remains out of scope (ADR-0013's "Scope, all three" is unchanged).

This is a surface-only change — nothing about the surrounding shell chrome (top bar, Backlog panel, theme toggle itself) is affected. Only draw.io's own internal canvas/page background stops following `theme`.

A genuinely empty view's content is now backed by a minimal valid empty `mxGraphModel` XML document (`EMPTY_DRAWIO_XML` in `drawio-canvas.js`) rather than `''`, so draw.io opens directly onto an editable blank canvas instead of its own "choose a template" picker — unrelated to theming, but changed in the same pass since it touches the same `load` payload construction.

## Consequences

**Positive**

- System's connector visibility no longer depends on shell theme — matches the fix already accepted for Process, for an identical underlying cause.
- No content rewriting: existing `.drawio` XML with authored colors is untouched, consistent with ADR-0013's original scope decision.

**Negative / risks**

- Widens the inconsistency ADR-0013 already flagged as a known tradeoff: Process and System now both ignore the shell theme entirely, while Object (Mermaid) and Interaction (Excalidraw) still follow it. There is no unified per-engine theming story, by design (ADR-0013).
- A System diagram authored with light-on-white colors (e.g. white text, light fills meant to read against a dark canvas) would now look wrong against the permanently-light surface — considered unlikely in practice since draw.io's own default styles assume a light canvas.

## Alternatives considered

- **Recolor existing connector strokes on theme toggle** (rewrite `.drawio` XML `strokeColor` attributes). Rejected: directly contradicts ADR-0013's "leave existing colors as authored" scope decision, and requires safely parsing/rewriting arbitrary user-authored XML.
- **Leave System's dark-canvas connector visibility as a documented, known limitation**, unchanged from ADR-0013. Considered, but the same problem was already judged bad enough to warrant a real fix for Process — leaving System as the one exception was inconsistent without a specific reason to treat it differently.
