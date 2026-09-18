# ADR-0035: "How To" help — a shared overlay, general + per-canvas, Canvallax-authored basics with a link out

- Status: Accepted
- Date: 2026-09-18
- Relates to: [ADR-0017](0017-shell-navigation-restructure.md) (overlay skeleton, Settings placeholder), [ADR-0026](0026-multi-language-shell-ui-i18next.md) (i18next), closes `agents.md`'s "How To help — not yet built" Future Work item

## Context

`agents.md`'s Future Work flagged two unbuilt pieces of help content: a general "How To" explaining Canvallax's own concepts (Issues, Backlog, the four canvases, Presenting/Editing modes), and a per-canvas "How To" specific to each canvas's underlying tool (bpmn-js for Process, draw.io for System, Mermaid for Object, Excalidraw for Interaction). Format was explicitly left open — a burger-menu overlay similar to Settings vs. an inline per-canvas panel, Canvallax-authored content vs. linking out to each tool's own docs.

Direction given: build it as an overlay, matching the Issue-picker/Settings pattern (ADR-0017) already established for content-bearing modals in this shell, rather than an inline per-canvas panel. Content depth: short Canvallax-authored basics per canvas (the core gestures — add/connect/edit/delete), plus one "learn more" link out to that tool's own official docs for anything deeper, rather than a full self-contained tutorial or a bare link-out with no Canvallax framing.

## Decision

**One overlay, two entry points**, not two separate overlays. `howToOpen`/`howToView` (`src/shell/shell-state.js`) — `howToView` is `null` for the general How To or one of `'process'/'system'/'object'/'interaction'` for a canvas-specific one. `openHowTo(view = null)`/`closeHowTo()` mirror `openSettings`/`closeSettings` exactly.

**Entry point 1 — general**: a new "How To" item in the burger menu (`index.html`, alongside Settings), calling `openHowTo()`.

**Entry point 2 — per-canvas**: a new button in `.view-tabs-actions`, the same row as Copy/History/Export, shown under the same `activeView !== 'all'` gate. Calls `openHowTo(activeView)`.

**Markup**: `.howto-backdrop`/`.howto-overlay` reuse the exact backdrop+header+body skeleton `.settings-overlay`/`.issue-picker` already established (ADR-0017), including the shared `.issue-picker-header`/`.close` classes for the header — only a new `.howto-overlay` width (520px, wider than Settings' 420px to fit prose) and new `.howto-body`/`.howto-section`/`.howto-list`/`.howto-link` content styles are added, all in `src/css/shell.css` alongside the existing overlay rules (one module per concern).

**Content**:
- **General** (`howToView === null`): eight short sections — what Canvallax is, Issues, the four canvases (one line each, distinct from but consistent with the existing `canvasHints` copy), Backlog, Presenting vs. Editing, cross-Issue copy, History, Export.
- **Per-canvas** (`howToView` set): a short bullet list of that canvas's core gestures (`howTo.canvas.<view>.steps`, an i18next array resolved via `t(key, { returnObjects: true })` — the same technique any array-valued translation key needs, no precedent for this in this codebase before now), plus one fixed "learn more" link to that tool's own official docs:
  - Process → `https://bpmn.io/toolkit/bpmn-js/walkthrough/` (bpmn-js's own walkthrough)
  - System → `https://www.drawio.com/docs/` (draw.io's own docs)
  - Object → `https://mermaid.js.org/syntax/entityRelationshipDiagram.html` (Mermaid's ER-diagram syntax — Object's actual Mermaid diagram type, per `src/canvases/object/starter-diagram.js`'s `erDiagram`, not class diagrams)
  - Interaction → `https://excalidraw.com/` (the Excalidraw app itself; its own `?`-key shortcut panel is its most direct in-product help, more useful to link here than its developer-integration docs at docs.excalidraw.com)

  These four URLs are fixed in `howToCanvasLink()` (`shell-state.js`), not translated — each is the underlying tool's own docs, in whatever language that tool serves, not Canvallax's own content.

**i18n**: a new `howTo` key tree in all four `src/locales/<lang>/translation.json` (`general.*` for the eight sections, `canvas.<view>.steps` for the four per-canvas lists, `learnMore` for the link label), plus `burgerMenu.howTo`/`topBar.howTo` labels — filled in for English, German, French, and Spanish together, matching every other user-facing string in this shell (ADR-0026).

## Consequences

**Positive**

- Reuses the established overlay skeleton and `open*`/`close*` state pattern exactly — no new interaction pattern introduced for this feature.
- One overlay component serves both entry points instead of two near-duplicate ones, keeping the general/per-canvas content difference to template branching (`x-if="!howToView"` vs. `x-if="howToView"`) rather than two parallel implementations.
- Short, translated, Canvallax-authored basics stay useful without leaving the app, while the link out covers anything deeper without Canvallax having to maintain a full tutorial per tool that would drift out of sync with each tool's own UI over time.
- Closes the last open Future Work item that had no concrete direction at all (format was explicitly undecided before this ADR).

**Negative / risks**

- Four more sets of user-facing strings to keep in sync across four languages going forward, same maintenance cost every other shell string already carries (ADR-0026) — not new in kind, just more surface area.
- The four external links are fixed to each tool's current URL structure; if bpmn.io, draw.io, Mermaid, or Excalidraw restructure their docs sites, these links go stale silently (no automated check).
- Object's per-canvas content specifically documents Mermaid's ER-diagram syntax (`erDiagram`) rather than Mermaid in general — correct for what `src/canvases/object/object-canvas.js` actually renders today, but would need updating if Object's diagram type ever changes.

## Alternatives considered

- **Inline per-canvas panel instead of an overlay.** Rejected per direction given — the overlay pattern already exists and fits a lightweight, dismissible help panel better than adding new inline chrome to each of the four canvas views.
- **Two separate overlays** (one for general, one for per-canvas). Rejected — the two only differ in body content, not in shell/skeleton; one overlay with a `howToView` branch avoids duplicating the backdrop/header/state-toggle machinery.
- **Fully self-contained tutorial content, no external link.** Rejected — more authoring and translation work per canvas, and risks drifting out of sync with each tool's own editing UI across upstream updates, for a benefit (never leaving the app) that a single "learn more" link mostly already covers.
- **Mostly link out, minimal Canvallax framing.** Rejected — leaves the app for the actual how-to instructions even for the basic gestures a first-time user needs immediately, which the short Canvallax-authored list avoids.
