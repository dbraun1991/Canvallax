# ADR-0020: First-visit default theme is light, not OS-preference-based

- Status: Accepted
- Date: 2026-09-03
- Supersedes (the first-visit default only): [ADR-0013](0013-theming-light-and-dark-mode.md) — the `localStorage` key, FOUC-prevention script, single-source-of-truth rule, `toggleTheme()`, and all per-engine theming mechanisms are otherwise unchanged.
- Relates to: [ADR-0013](0013-theming-light-and-dark-mode.md)

## Context

ADR-0013 resolved a first-visit (no stored `canvallax_theme` value) default from `prefers-color-scheme`, falling back to `'dark'` only if `matchMedia` was unavailable. Direction given: default to light instead, regardless of OS preference.

## Decision

The inline `<head>` script (`index.html`) drops the `prefers-color-scheme` branch entirely:

- Stored value present and valid (`'light'` or `'dark'`) → use it, unchanged.
- No stored value, or `localStorage` throws (private browsing, storage disabled) → `'light'`.

Nothing else about ADR-0013's theming mechanism changes: the `localStorage` key, the synchronous FOUC-prevention script, `shell-state.js` reading the already-applied `data-theme` attribute at init rather than re-resolving anything, `toggleTheme()`'s persistence, and all three canvas engines' theming hooks are all exactly as ADR-0013 described.

## Consequences

**Positive**

- Simpler resolution logic — one fewer branch, no `matchMedia` feature-detection needed at all.
- A predictable, consistent first impression regardless of the visiting device's OS-level setting.

**Negative / risks**

- A visitor whose OS is already set to dark mode now sees light on first visit instead of a theme matching their system — a deliberate trade-off per direction given, not an oversight.

## Alternatives considered

- **Keep `prefers-color-scheme`, default to light only as the `matchMedia`-unavailable fallback** (i.e., swap ADR-0013's fallback value but keep OS-preference as the primary signal). Rejected: direction was to stop keying off OS preference at all, not just change the fallback.
