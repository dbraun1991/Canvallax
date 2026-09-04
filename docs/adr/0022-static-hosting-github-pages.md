# ADR-0022: Static hosting — GitHub Pages, deployed via GitHub Actions

- Status: Accepted
- Date: 2026-09-04
- Relates to: [ADR-0001](0001-frontend-build-tooling-vite.md), [ADR-0010](0010-persistence-and-versioning.md), [ADR-0014](0014-server-backed-persistence-deferred.md)

## Context

Canvallax has no backend at all yet — persistence is fully client-side (`isomorphic-git` + IndexedDB, ADR-0010), server-backed persistence is explicitly deferred (ADR-0014). `npm run build` (ADR-0001, Vite) already produces a self-contained static `dist/` — HTML, JS, CSS, no server-rendered piece, no environment secrets. That shape is exactly what a plain static host serves; nothing about the app needs request-time server logic.

Direction given: use GitHub Pages for a live preview, on the existing public `dbraun1991/Canvallax` repo — free for a public repo, no plan requirement (GitHub Actions minutes are also unlimited and free on public repos). Automatic deploy on every push to `main` was the expected behavior, matching how the project already treats a push as the deliberate "make this visible" action.

## Decision

**`vite.config.js`** (new — none existed before): sets `base: '/Canvallax/'`. A GitHub Pages *project* site (this isn't a `dbraun1991.github.io` user/org repo) serves from a `/<repo-name>/` subpath, not the domain root — without this, the built `index.html`'s asset URLs resolve to `/assets/...` and 404 once deployed. Vite's dev server and `npm run preview` both already honor this transparently (`http://localhost:5173/Canvallax/` locally now, matching the deployed path shape), so no other local-dev change was needed.

**`.github/workflows/deploy-pages.yml`** (new): on every push to `main` (plus a manual `workflow_dispatch` trigger) — `npm ci`, `npm run build`, then GitHub's own `actions/upload-pages-artifact` + `actions/deploy-pages` publish `dist/` to Pages. `concurrency: { group: pages, cancel-in-progress: true }` — a newer push cancels a still-running older deploy rather than queuing behind it, since the queued run's output would be stale the moment a newer commit exists anyway.

Enabling Pages itself (repo Settings → Pages → Source: "GitHub Actions") is a one-time manual toggle in GitHub's UI, outside what a workflow file or local tooling can do.

## Consequences

**Positive**

- Zero cost, zero new infrastructure to run or maintain — GitHub already hosts the repo.
- Fully automatic: push to `main`, the live preview updates a few minutes later, no manual build-and-publish step to remember.
- The `base` fix is small and permanent — doesn't need revisiting unless the repo itself is ever renamed.

**Negative / risks**

- **Every push to `main` becomes a live deploy** — there's no staging/review step between "push" and "visible to anyone with the URL." Acceptable for a solo-built public project; would need reconsidering (a PR-preview or manual-approval step) if that changes.
- Bundle size is real (React + Excalidraw pulled the main JS chunk past 3MB, ADR-0021) — fine for Pages' size limits, but worth remembering if load time on the deployed preview ever becomes a complaint.
- GitHub Pages has no server-side piece by design — the moment ADR-0014's deferred server-backed persistence actually gets built, this hosting choice stops being sufficient and needs revisiting (a real host, not Pages).

## Alternatives considered

- **Netlify or Vercel.** Both would work equally well for a static Vite build and have slicker PR-preview-deploy features out of the box. Rejected for now: GitHub Pages needs no new account/service at all when the repo's already on GitHub, and PR previews aren't a need this solo-built project has yet.
- **Manual `gh-pages` branch** (build locally, push `dist/` via the `gh-pages` npm package or by hand) instead of an Actions workflow. Considered — decouples "push code" from "publish preview" more deliberately. Rejected per direction given: automatic deploy on push to `main` was the expected, wanted behavior, not an extra manual step to remember.
