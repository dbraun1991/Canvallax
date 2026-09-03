# ADR-0001: Frontend build tooling — npm + Vite

- Status: Accepted
- Date: 2026-09-03

## Context

Sibling projects in this workspace (`OrgVisualizr`, `Climb-Buddy-Belay`, `Metroviz`) load everything via plain `<script>` tags from a CDN, no build step at all. Canvallax's canvas engines are heavier and more actively-versioned than what those projects embed: bpmn-js and the draw.io embed both ship non-trivial CSS/asset bundles, `isomorphic-git` isn't a library CDNs package cleanly as a single browser-ready script, and hand-pinning four separately-evolving libraries by editing CDN URLs is more failure-prone than a lockfile. A server is also expected eventually (ADR-0014), at which point a shared Node/npm toolchain across frontend and backend is worth having already in place.

## Decision

Use **npm** as the package manager and **Vite** as the dev server/bundler, departing from the CDN/no-build convention used by the other sibling projects.

- All frontend dependencies (bpmn-js, `bpmn-js-properties-panel`, `@bpmn-io/properties-panel`, Mermaid, `isomorphic-git` + `@isomorphic-git/lightning-fs`, Alpine.js) are installed via `npm install` and imported as ES modules.
- Vite provides the dev server (`npm run dev`) and a static production build (`npm run build`); a future Express server (ADR-0014) would serve that build as static files alongside its API routes.
- One top-level `package.json` for the whole repo — split into workspaces only if frontend/backend dependency graphs start actively conflicting.
- Exact versions pinned via `package-lock.json`, committed to the repo.

## Consequences

**Positive**

- Reproducible installs via the lockfile, meaningfully more important here than in CDN-only siblings given four separately-versioned, non-trivial libraries.
- `isomorphic-git` and the draw.io embed package are more naturally consumed as npm packages than ad-hoc CDN builds.
- Fast local iteration (hot reload) while developing four separate canvas integrations.

**Negative / risks**

- Breaks the zero-setup "clone and open `index.html`" simplicity the CDN-only siblings have — Canvallax needs `npm install` before anything renders.
- The production bundle already exceeds Vite's 500kB chunk-size warning (bpmn-js + Mermaid + draw.io-adjacent code all in one chunk) — worth revisiting with per-canvas `import()` code-splitting once it's actually felt.

## Alternatives considered

- **CDN script tags**, matching the other siblings. Rejected: workable for bpmn-js and Mermaid, but `isomorphic-git` and the draw.io embed package are a poor fit for CDN-only consumption.
- **npm for dependency resolution only, no bundler.** Rejected: still needs *some* build step to resolve bare module specifiers from `node_modules` in the browser, so it has the downsides of a build step without Vite's dev-time DX.
