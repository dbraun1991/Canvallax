# ADR-0013: Theming — shell light/dark toggle; canvases follow it except Process

- Status: Accepted — first-visit default superseded by [ADR-0020](0020-default-theme-is-light.md): light regardless of OS preference, not `prefers-color-scheme`-based as described below; everything else in this ADR is unchanged.
- Date: 2026-09-03
- Relates to: [ADR-0002](0002-shell-ui-reactivity-alpinejs.md), [ADR-0003](0003-canvas-architecture.md), [ADR-0004](0004-process-canvas-bpmn-js.md)

## Context

`src/css/theme.css` defines dark-as-default CSS custom properties on `:root` plus a `:root[data-theme='light']` override, matching this workspace's sibling theming convention (`OrgVisualizr`'s `agents.md`). `OrgVisualizr` already has a working toggle to draw on: a synchronous inline `<head>` script that resolves and applies the theme before first paint, Alpine state that mirrors that already-applied attribute at init rather than re-reading `localStorage` a second time, and a `toggleTheme()` guarded against `localStorage` throwing. `OrgVisualizr`'s own git history also has a concrete cautionary example worth citing directly: a real bug where a hardcoded (non-variabled) color only looked fine in one theme.

Once the shell toggle existed, Process (bpmn-js) rendering its own permanently-light canvas regardless of shell theme was a stark, jarring seam. Checking each engine's actual theming support (not assuming a uniform mechanism exists) found three different, real hooks:

- **bpmn-js + `@bpmn-io/properties-panel`**: both stylesheets are built on CSS custom properties scoped to `.djs-parent`/`.bio-properties-panel`.
- **draw.io embed**: the `load` postMessage action accepts a `dark: true` field directly.
- **Mermaid**: `mermaid.initialize({ theme: 'dark' })` is a documented option.

## Decision

**Shell chrome toggle** (`shell-state.js`, `index.html`):

- `localStorage` key `canvallax_theme`, values `'light'`/`'dark'`.
- First-visit default (no stored value): `prefers-color-scheme`, falling back to `'dark'` only if `matchMedia` is unavailable.
- FOUC prevention: a synchronous inline `<script>` in `<head>`, before the stylesheet and before `src/main.js`, applies the resolved theme to `data-theme` on `<html>` immediately.
- Single source of truth: `shell-state.js` reads `document.documentElement.getAttribute('data-theme')` at init — it never independently re-derives from `localStorage`/`matchMedia` a second time.
- `toggleTheme()` flips `theme`, sets `data-theme`, and writes to `localStorage` inside a `try/catch` (private browsing / storage-disabled environments throw on `setItem` — the theme just won't persist).

**Canvas engines, three different mechanisms, each the engine's own first-class option — no unified "theme" abstraction across them, since none exists to unify against:**

- **System/Interaction (draw.io)**: `mountDrawioCanvas` takes a `theme` param; the `load` payload gets `dark: theme === 'dark'`.
- **Object (Mermaid)**: `mountObjectCanvas` takes a `theme` param; calls `mermaid.initialize({..., theme: theme === 'dark' ? 'dark' : 'default'})` at mount.
- **Process**: stays **light-themed regardless of shell theme**, unconditionally — the diagram itself should look the same to every viewer regardless of which shell theme they've selected, arguably desirable for a surface people export/share. No CSS override, no dark variant.

**Scope, all three**: only canvas background/chrome (palette, properties panel, draw.io's UI, Mermaid's own diagram styling) follow the toggle where it applies — existing shape fill/stroke colors are left as authored, the same pattern most diagram/whiteboard tools use.

**Known, accepted limitation**: draw.io and Mermaid's dark option resolves once, at mount time — toggling the shell's theme while System/Interaction/Object is already open doesn't visually update it until the view is switched away and back. (Process has no such concern, since it's never themed at all.)

## Common pitfalls to avoid

1. **Flash of the wrong theme (FOUC)** — the theme must be applied by a synchronous inline `<head>` script, not a module script that loads after first paint.
2. **Two divergent sources of truth** — Alpine must read the already-applied `data-theme` attribute at init, never independently re-resolve `localStorage`/`matchMedia` a second time.
3. **Unguarded `localStorage` calls** — wrap every `getItem`/`setItem` in `try/catch`; an uncaught throw in the synchronous `<head>` script would abort all subsequent script execution, including Alpine's own bootstrap.
4. **Hardcoded colors that "look fine" in only one theme** — every new piece of shell UI must use `theme.css`'s custom properties; `OrgVisualizr` has already shipped this exact bug once.
5. **Deliberately un-variabled elements, forgotten** — some elements legitimately need a fixed color regardless of theme (e.g. a status dot's own background). Document the exception at the CSS rule, don't leave it silent.
6. **Trusting a stored value blindly** — validate a read-back `canvallax_theme` value against the `'light' | 'dark'` allow-list rather than assuming it's always current.

## Consequences

**Positive**

- Reuses a proven, already-debugged pattern instead of redesigning theme persistence from scratch.
- Each canvas mechanism uses the engine's own documented, supported option — not fragile selector-guessing.
- Process's fixed-light choice removes the one piece of canvas theming that would otherwise be hand-tuned, unofficial color-guessing against bpmn-js's semantic custom properties — the highest-maintenance-risk approach.

**Negative / risks**

- Shell-chrome theming and canvas-engine theming can visually diverge by design (Process never follows; draw.io/Mermaid only update on remount).
- Widens the per-engine inconsistency: Process is now the one canvas that never follows the toggle, where the other two do (at mount time only).

## Alternatives considered

- **Dark-theme Process too**, via hand-tuned CSS custom-property overrides on bpmn-js's stylesheets. Considered and actually built once, then reverted: the diagram should render identically for every viewer regardless of shell theme, and hand-tuned color-guessing was the highest-maintenance part of the whole theming effort.
- **Recolor shape fill/stroke**, not just canvas background/chrome. Rejected: adds real complexity (remount timing, consistency for shapes with explicit colors) for a cosmetic improvement beyond what was needed — light shapes on a dark canvas already reads fine.
- **A live "reconfigure" hook for draw.io/Mermaid** so mid-view theme toggling updates immediately. Rejected for now: no existing hook in either engine's mount contract; the mount-time-only behavior is a minor, documented rough edge.
