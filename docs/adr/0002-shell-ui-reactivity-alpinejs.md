# ADR-0002: Shell UI reactivity — Alpine.js

- Status: Accepted
- Date: 2026-09-03
- Relates to: [ADR-0001](0001-frontend-build-tooling-vite.md), [ADR-0008](0008-issue-centric-shell.md)

## Context

The Issue-shell chrome (sidebar, view switcher, Backlog panel) has real, easy-to-get-wrong reactive state: which Issue is active, which of the five views is showing, and the Backlog panel's minimize/expand flag, which follows a two-rule behavior (ADR-0008) — it persists across view switches within an Issue, but always resets to expanded on Issue activation. Getting that second rule right by hand (tracking exactly which DOM updates follow from which state change) is exactly the kind of bookkeeping a small reactive layer removes.

## Decision

Use **Alpine.js**, installed via npm and imported as an ES module, for the shell chrome's state and DOM binding.

- `src/main.js` imports Alpine, assigns it to `window.Alpine`, and calls `Alpine.start()`.
- All shell state and the ADR-0008 state-transition rules live in one Alpine data factory, `src/shell/shell-state.js`, wired to `index.html` via `x-data="shell()"`.
- The four canvas engines are unaffected — each manages its own rendering inside a container element Alpine doesn't reach into, the same separation ADR-0003 establishes between "the shell" and "the canvases."

## Consequences

**Positive**

- Matches `OrgVisualizr`'s sibling convention in this workspace (Alpine root state + declarative HTML directives).
- Small footprint, no build-step requirement of its own.
- Declarative `x-show`/`x-text`/`x-on`/`x-effect` bindings make ADR-0008's Backlog-panel behavior straightforward to express directly against state.

**Negative / risks**

- One more dependency, however small.
- Alpine's directive-driven style only governs the shell chrome — the boundary (Alpine markup stops at each canvas's mount `<div>`) has to stay clear to anyone extending a canvas module.

## Alternatives considered

- **Plain vanilla JS**, no reactivity library. Rejected: ADR-0008's Backlog-panel reset-on-activation rule is exactly the kind of state-consistency bug a small reactive layer prevents by construction rather than by discipline.
- **React or a similar component framework.** Rejected: a much heavier dependency and mental-model commitment than this shell's state (a handful of flags) needs. Worth reconsidering only if shell complexity grows well past what's currently scoped.
