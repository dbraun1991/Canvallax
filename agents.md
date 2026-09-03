# agents.md — Canvallax

## What This Is

Canvallax is a webapp for remote teams that need business and technical stakeholders to understand the same system the same way. An Issue holds a small set of shared, deliberately incomplete visual **canvases** — Process, System/Integration, Object, Interaction — plus a Backlog list, bundled together as one unit. See `README.md` for the full product framing.

**Current status: working end to end.** The Vite pipeline, the Issue-centric shell (sidebar, All + 4-view switcher, persistent Backlog panel), all four canvas engines, real git-backed persistence (client-side, `isomorphic-git`/IndexedDB), per-view history browsing and restore, cross-issue copy (views by overwrite, Backlog entries by append), All-view thumbnails, and the light/dark theme toggle are all built and wired up. Three example Issues seed automatically on a true first run (`src/persistence/seed-issues.js`) alongside anything created since.

## Development

```
npm install
npm run dev      # starts the Vite dev server, http://localhost:5173/
npm run build    # production build to dist/
npm run preview  # serve that build locally
```

Requires Node.js (any current LTS).

## Core Idea

Each canvas is built on the best-fit existing open tool for its notation rather than one shared canvas SDK, prioritizing standard-format compatibility over interaction consistency across canvases (ADR-0003). An Issue bundles all four canvases plus a Backlog together; the shell is issue-scoped, not canvas-scoped (ADR-0008): pick an Issue in the sidebar, then switch between a read-only **All** overview and each canvas's full-screen editor, with the **Backlog** panel staying visible on the right throughout, minimizable but never a separate mode you have to leave the others to see.

## Architecture

```
+-----------+---------------------------------------------+-----------+
| Issue     |  View switcher: [All] [Process] [System]     | Backlog   |
| sidebar   |  [Object] [Interaction]                       | panel     |
| (search,  |-----------------------------------------------| (always   |
| resizable,|  "All": read-only grid of real per-engine      | visible   |
| <details> |    thumbnails, click-through to a single view   | across    |
| collapse  |  single view: that canvas's native editor,     | every     |
| on mobile)|    engine + (Process only) bpmn-io properties  | view,     |
|           |    panel for the selected element               | minimiz-  |
|           |                                                | able)     |
+-----------+---------------------------------------------+-----------+
Activating an Issue always resets view -> All and Backlog -> expanded;
switching views within an already-open Issue leaves both exactly as left.
(ADR-0008)

Canvas engines
  Process              — bpmn-js, .bpmn XML                       (ADR-0004)
  System/Integration   — draw.io embed, .drawio XML                (ADR-0005)
  Interaction          — draw.io embed, .drawio XML                (ADR-0005)
  Object                — Mermaid, plain-text diagram source        (ADR-0006)

No cross-canvas element-link registry (ADR-0009) — an Issue's canvases are
already bundled together, and Backlog stays visible alongside whichever one
is open, so the Issue itself is the association.

Persistence — one JSON document per Issue (ADR-0010, schema per ADR-0007):
  issues/<issueId>.json = { id, name, status, createdAt, updatedAt,
    views: { process: {id, format, content}, system: {...}, ... },
    backlogEntries: [ {id, name, description, createdAt, updatedAt}, ... ] }
  Every view carries its own id, stable across any future rename of the
  canvas naming (README/docs/adr/README.md: not finalized yet) — names can
  change, ids stay clean. Git-backed: every save is a commit; per-view
  history is derived by diffing that one field across consecutive commits.
  Fully client-side for now (isomorphic-git + IndexedDB) — no backend yet
  (ADR-0014, deferred).

Cross-issue copy (ADR-0011): a whole Issue is never copyable. Views copy by
  overwrite (source's current HEAD, destination keeps its own view id,
  copiedFrom provenance). Backlog entries copy by list-append instead (a new
  entry, new id, cloned name/description, copiedFrom anchored on the source
  entry's own id).
```

## Key Docs

| File | Role |
|------|------|
| `README.md` | Product framing — naming, the canvases, what each is/isn't for |
| `docs/adr/README.md` | ADR index — numbered, append-only decision log |
| `docs/adr/0001-*.md` – `0015-*.md` | Individual decisions — see the index for titles |

## Architecture Decisions

| ADR | Decision |
|-----|----------|
| [0001](docs/adr/0001-frontend-build-tooling-vite.md) | Frontend build tooling: npm + Vite, not CDN script tags |
| [0002](docs/adr/0002-shell-ui-reactivity-alpinejs.md) | Shell UI reactivity: Alpine.js |
| [0003](docs/adr/0003-canvas-architecture.md) | Specialized engine per canvas, not one unified SDK |
| [0004](docs/adr/0004-process-canvas-bpmn-js.md) | Process Canvas: bpmn-js, `.bpmn` XML, bpmn.io License (watermark) |
| [0005](docs/adr/0005-system-and-interaction-canvases-drawio.md) | System/Integration + Interaction Canvases: draw.io embed, `.drawio` XML, Apache-2.0 |
| [0006](docs/adr/0006-object-canvas-mermaid.md) | Object Canvas: Mermaid text source, MIT, text+preview editing (not drag-and-drop) |
| [0007](docs/adr/0007-issue-and-backlog-data-model.md) | Issue is `{id, name, status}`; Backlog is a `backlogEntries` list, no per-entry status |
| [0008](docs/adr/0008-issue-centric-shell.md) | Issue-scoped shell: sidebar Issue browser, All + 4-view switcher, persistent minimizable Backlog panel |
| [0009](docs/adr/0009-no-cross-canvas-linking.md) | No cross-canvas element-link registry — Issue-level bundling is the association |
| [0010](docs/adr/0010-persistence-and-versioning.md) | One JSON document per Issue; every view + Backlog entry carries a UUID; git commit history is the version log (client-side for now) |
| [0011](docs/adr/0011-cross-issue-copy.md) | Copy a view (overwrite) or Backlog entry (append) from another Issue: always HEAD, `copiedFrom` provenance, never a whole Issue |
| [0012](docs/adr/0012-all-view-thumbnails.md) | All-view tiles render real SVG thumbnails per engine, content-hash cached |
| [0013](docs/adr/0013-theming-light-and-dark-mode.md) | Shell light/dark toggle; System/Interaction/Object follow it, Process stays light |
| [0014](docs/adr/0014-server-backed-persistence-deferred.md) | Server-backed persistence, once built, is Express (Node) — deferred |
| [0015](docs/adr/0015-computed-tooltips-deferred.md) | Tooltips computed live from state, never stored — deferred |

Naming for the canvases (Process/System/Object/Interaction/Backlog) is **not yet finalized** (`docs/adr/README.md`) — code and docs currently use the README naming. This is exactly why views and Backlog entries carry their own UUIDs (ADR-0007/0010): identity must survive a naming decision that hasn't happened yet.

## Sibling-Project Conventions Used Here

Canvallax shares this workspace with other solo-built webapps (`Climb-Buddy-Belay`, `Metroviz`, `OrgVisualizr`, `bpmn-process-creator`), each with its own `agents.md`/`AGENTS.md` and `docs/adr(s)/`. Where an ADR cites a sibling project's implementation as precedent (ADR-0008 cites `Climb-Buddy-Belay`'s mobile `<details>` collapse and `bpmn-process-creator`'s resizable-sidebar drag handle; ADR-0013 cites `OrgVisualizr`'s theme toggle), that project's source is the concrete reference to read before extending the Canvallax equivalent.

Conventions carried forward, consistent with every sibling project in this workspace:

- **ADRs are append-only** (`docs/adr/README.md`) — a changed decision gets a new ADR that supersedes the old one, never an edit to the old ADR's Decision section. A superseded ADR gets a one-line forward pointer in its metadata header only.
- **One module per concern** in both CSS and JS — `src/shell/`, `src/persistence/`, `src/canvases/*/`, `src/css/`.
- **Theme via CSS custom properties** on `:root`, `data-theme` attribute for light/dark, set before first paint to avoid a flash of the wrong theme (ADR-0013).
- **No framework-default confirm/alert.** Not yet needed anywhere in the current UI (nothing destructive enough to warrant a confirmation prompt exists yet), but the convention — a promise-based custom dialog module instead of native `confirm()`/`alert()`, matching `OrgVisualizr`'s `js/dialog.js` — applies the moment one is needed (e.g. deleting a Backlog entry).

## Module Layout

| Path | Role | ADR |
|------|------|-----|
| `src/shell/shell-state.js` | Alpine data factory: Issue selection, view switching, Backlog panel state, resize, theme, history, copy | 0002, 0008 |
| `src/canvases/process/` | Process Canvas: bpmn-js + `@bpmn-io/properties-panel` | 0004 |
| `src/canvases/system/drawio-canvas.js` | System/Integration **and** Interaction Canvas: shared draw.io embed integration | 0005 |
| `src/canvases/object/` | Object Canvas: Mermaid text+preview | 0006 |
| `src/canvases/thumbnails.js` | All-view thumbnail orchestration across all four engines | 0012 |
| `src/persistence/git-store.js` | Client-side git layer (`isomorphic-git`/`lightning-fs`/IndexedDB): commits, history, blob reads | 0010 |
| `src/persistence/issue-store.js` | Issue CRUD, Backlog entries, copy, debounced autosave | 0007, 0010, 0011 |
| `src/persistence/seed-issues.js` | Example Issues seeded on a true first run | 0007 |
| `src/css/theme.css` | CSS custom properties, light/dark palette | 0013 |
| `src/css/shell.css` | All shell chrome and canvas-wrapper styling | — |
| `index.html` | Markup + Alpine directives for the whole shell | 0002, 0008 |

`index.html`'s markup, not a component framework, is the shell's template layer (ADR-0002) — there's no further per-panel module split (e.g. a dedicated "sidebar" or "backlog panel" file) beyond `shell-state.js`'s single data factory; that's a deliberate size call, not an oversight, and worth revisiting only if the shell's own complexity grows past what one file comfortably holds.

## Features & Future Work

Items with an ADR are designed but not built (ADR-0014, ADR-0015). Everything else below needs direction clarified before implementing rather than guessing at exact behavior.

- **Server-backed git layer** (ADR-0010/0014) — client-side git was the deliberate starting point; a real Express/Node server is the expected next step once multi-device access or real-time collaboration are actually needed.
- **Computed tooltips** (ADR-0015) — `:title` bindings on truncated/abbreviated UI text, not built yet.
- **Canvas naming finalization.** README/`docs/adr/README.md` flag Process/System/Object/Interaction/Backlog naming as provisional. Per-view UUIDs mean this can be resolved later without a data migration — but the rename itself (UI copy, `views.<name>` key vs. `id`, any docs referencing current names) is still unbuilt work when it happens.
- **Process Canvas's BPMN subset.** ADR-0004 calls for a constrained BPMN profile rather than bpmn-js's full default palette — not yet built; the canvas currently exposes bpmn-js's whole vocabulary.
- **Drag-to-zero-width should minimize the Backlog panel, replacing `.backlog-toggle`.** Direction given: the explicit minimize button (`.backlog-toggle`, `toggleBacklog()`) is no longer the intended mechanism — dragging its resize handle to zero-width should minimize it instead. Not yet built; the toggle button stays as the only working minimize path until the replacement actually lands, then gets deleted. The Issue sidebar's resize handle got its own visible grip affordance already (`.resize-handle::before` in `shell.css`) — resolving whether the sidebar's mobile `<details>` collapse also unifies onto the same drag-to-zero behavior, or stays separate, is still open.
- **File-manager-style Issue sidebar.** The current sidebar is a flat, unfiltered list — worth revisiting (search field, tabs, folder tree, per `bpmn-process-creator`'s own sidebar) once there are enough Issues that a flat list stops scaling.
- **Enrich `seed-issues.js`'s example content.** The three seeded Issues carry empty canvas content — fine for exercising the mechanics, thin for judging look-and-feel now that thumbnails and every editor render real content.
- **Concurrent-edit / merge story** for one Issue's single JSON document — relevant once more than one person can edit the same Issue; out of scope while client-side/single-user.
- **Cross-canvas element-level linking**, reconsidered. ADR-0009 explicitly decided against building this now. If element-to-element navigation (e.g. one BPMN task ↔ one Object-canvas entity) turns out to matter in practice, it's new scope requiring its own ADR — not a partially-built feature waiting to be finished.
- **Real-time multiplayer editing** across all three tool-backed canvases — explicitly lower priority than format compatibility for the initial feasibility prototype; per-canvas feasibility notes live in ADR-0004/0005/0006.

## What It Does NOT Do (yet)

- No real-time multiplayer editing in any of the three tool-backed canvases out of the box (ADR-0003/0004/0005/0006) — explicitly lower priority than format compatibility for the initial feasibility prototype.
- No cross-canvas element-level linking (ADR-0009, decided against) — association only happens at the Issue level.
- No live cross-issue references (ADR-0011) — copy is a one-time snapshot, never a link that stays in sync with its source; a whole Issue is never copyable at all.
- No multi-device or multi-user access to the same Issue (ADR-0010) — the git layer is client-side only, for now.
