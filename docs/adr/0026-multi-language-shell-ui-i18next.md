# ADR-0026: Multi-language shell UI — i18next (deferred, not yet implemented)

- Status: Accepted — deferred, not yet implemented
- Date: 2026-09-17
- Relates to: [ADR-0001](0001-frontend-build-tooling-vite.md), [ADR-0002](0002-shell-ui-reactivity-alpinejs.md), [ADR-0013](0013-theming-light-and-dark-mode.md), [ADR-0017](0017-shell-navigation-restructure.md), [ADR-0020](0020-default-theme-is-light.md)

## Context

Canvallax's shell chrome is English-only today, hardcoded directly into `index.html`'s markup and a handful of JS files (e.g. `shell-state.js`'s canvas-hint strings). This ADR settles *how* multi-language support would be built ahead of actually building it, so the choice doesn't get made implicitly by whatever's convenient later — the same reasoning ADR-0014 applied to picking a server framework before a server was needed.

Two sibling projects in this workspace have already solved this, in two different ways depending on their own constraints:

- **Metroviz and OrgVisualizr** load `i18next` from a CDN, with `i18next-http-backend` runtime-fetching `locales/<lang>/translation.json` per locale and `i18next-browser-languagedetector` picking a first-visit default from the browser. Metroviz's `I18N_KONZEPT.md` documents the Alpine.js integration: a global `Alpine.store('i18n')` wraps `i18next.t()`, markup binds via `data-i18n`/`x-text`, and `document.documentElement.lang` is kept in sync for accessibility. Manual language choice persists to `localStorage`.
- **Climb-Buddy-Belay** deliberately rejected `i18next` (its own ADR-0007, superseded by ADR-0009) because it's a zero-dependency, `file://`-openable single-file app — `i18next`'s CDN dependency and async JSON fetch break under `file://`. It inlines a `TRANSLATIONS = { de: {...}, en: {...} }` object in its one `<script>` block instead, with a small `t(key, vars)` helper and `data-i18n` attributes; language comes from a `?lang=` URL param (falling back to `navigator.language`), never persisted. It started with one button per language and had to migrate to a single `<select>` once it grew past two languages.

Neither sibling's exact constraint applies to Canvallax. Unlike Metroviz/OrgVisualizr, Canvallax already has an npm/Vite build step (ADR-0001, itself a deliberate departure from the CDN-only convention those two projects use) — so it doesn't need `i18next-http-backend`'s runtime fetch at all; locale JSON can be statically imported and bundled at build time like any other dependency, avoiding both the extra network round-trip and any flash-of-untranslated-content while that fetch resolves. Unlike Climb-Buddy-Belay, Canvallax isn't a `file://`-openable single-file app — `npm install` is already a hard requirement (ADR-0001), so the constraint that ruled `i18next` out there doesn't exist here.

## Decision

1. **Library**: adopt `i18next` (core package only) as an npm dependency, imported as an ES module. Skip `i18next-http-backend` — Canvallax's Vite build makes runtime fetching strictly worse than a static import for this use case. Skip `i18next-browser-languagedetector` too — see point 4.
2. **Alpine.js integration**: a global `Alpine.store('i18n')` wrapping an initialized `i18next` instance, exposing `$store.i18n.t(key)` — matching Metroviz's `I18N_KONZEPT.md` design and Canvallax's own existing `x-text`/`x-show` convention. No new `data-i18n` attribute convention: translated strings bind the same way every other piece of dynamic shell text already does (`x-text`, template interpolation).
3. **File structure**: `src/locales/<lang>/translation.json`, one object per language nested by shell area (`topBar`, `burgerMenu`, `backlog`, `settings`, `issuePicker`, `canvasHints`, `export`, …), imported directly (`import en from './locales/en/translation.json'`) and registered as `i18next` resources at init. No per-locale code-splitting for now — the payloads are small enough that it isn't worth the complexity yet.
4. **Initial languages**: English (`en`, the existing text becomes this resource) and German (`de`). First-visit default is English, not OS/browser-inferred — the same reasoning ADR-0020 already applied to theme: a predictable default beats one that varies by whoever's browser/OS happens to be open. Manual choice persists to `localStorage` (`canvallax_lang`), read synchronously before Alpine mounts — the same pre-paint pattern ADR-0013 uses for theme, so there's no flash of the wrong language on reload either.
5. **Switcher UI**: a `<select>` in the burger menu, next to the existing theme toggle (ADR-0017's precedent for where a shell-wide, persisted preference control lives). A `<select>` from day one, not per-language buttons — Climb-Buddy-Belay's own history shows buttons stop scaling past two languages and have to be migrated later; starting with `<select>` avoids that churn.
6. **Scope**:
   - **In scope**: all shell chrome hardcoded in `index.html` and `shell-state.js` — top bar labels, burger menu items, Backlog panel labels/empty states, the Settings mock's placeholder text, Issue-picker overlay copy, History/Copy panel copy, canvas hints (`shell-state.js`'s `hints` object), export picker copy.
   - **Out of scope**: user-authored content — Issue names/descriptions, Backlog entry text, and the diagram content itself — is never translated; it's the user's own data, not app chrome. Each canvas engine's own embedded UI (bpmn-js's palette, draw.io's embed chrome, Excalidraw's toolbar, Mermaid's own error text) ships its own separate i18n surface outside Canvallax's control; reconciling those (draw.io's embed does accept its own `lang` URL parameter) is explicitly unresolved future work, not solved by this ADR.

## Consequences

**Positive**

- Static-import locale files fit Canvallax's existing build (ADR-0001) with no CDN or runtime-fetch machinery the siblings have to carry.
- One per-shell-area JSON structure scales to more languages without touching any switching code — adding a third language is a new `locales/<lang>/translation.json` file plus a `<select>` option.
- Reuses the exact persisted-preference + pre-paint pattern already proven for theme (ADR-0013), so no new mechanism has to be designed or explained.
- Starting with a `<select>` sidesteps the UI migration Climb-Buddy-Belay had to do once it outgrew per-language buttons.

**Negative / risks**

- Every future shell-copy change now touches two files (both locale JSONs) instead of one hardcoded string; a translation can silently lag the English source if a change ships to only one.
- The three tool-backed canvas engines' own UI chrome stays in whatever language they default to, regardless of Canvallax's own language setting — a visible inconsistency until/unless addressed separately.
- Adds a new npm dependency; `i18next`'s core package is lightweight, but it isn't zero footprint.

## Alternatives considered

- **Match Metroviz/OrgVisualizr exactly** (CDN + `i18next-http-backend` runtime fetch + `i18next-browser-languagedetector`). Rejected — Canvallax's build step (ADR-0001) makes the runtime fetch purely worse here: an extra network round-trip and a possible flash-of-untranslated-content that a static import avoids entirely.
- **Match Climb-Buddy-Belay** (inline `TRANSLATIONS` object, no library, `?lang=` URL param). Rejected — its whole rationale was a `file://`-openable, zero-dependency single-file constraint that doesn't exist for Canvallax, which already requires `npm install` (ADR-0001) and already has a per-concern module layout. Hand-rolling what `i18next` already solves has no upside here.
- **OS/browser language auto-detection as the first-visit default** (`i18next-browser-languagedetector`, or either sibling's approach). Rejected for the same reason ADR-0020 rejected it for theme — a predictable first-visit experience beats one that varies by environment, especially at the scale of a small team tool where picking from a menu once is a low cost.
