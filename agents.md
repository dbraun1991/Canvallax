# agents.md — Canvallax

## What This Is

Canvallax is a webapp for remote teams that need business and technical stakeholders to understand the same system the same way. An Issue holds a small set of shared, deliberately incomplete visual **canvases** — Process, System/Integration, Object, Interaction — plus a Backlog list, bundled together as one unit. See `README.md` for the full product framing.

**Current status: working end to end.** The Vite pipeline, the Issue-centric shell (burger-menu Issue picker, single left Backlog panel with a Presenting/Editing mode toggle, All + 4-view switcher), all four canvas engines, real git-backed persistence (client-side, `isomorphic-git`/IndexedDB), per-view history browsing and restore, cross-issue copy (views by overwrite, Backlog entries by append), All-view thumbnails (reused for Presenting mode's featured-tile reflow), the light/dark theme toggle, and computed tooltips are all built and wired up. Three example Issues, each with substantial example diagrams, seed automatically on a true first run (`src/persistence/seed-issues.js`) alongside anything created since.

## Development

```
npm install
npm run dev      # starts the Vite dev server, http://localhost:5173/
npm run build    # production build to dist/
npm run preview  # serve that build locally
```

Requires Node.js (any current LTS).

## Core Idea

Each canvas is built on the best-fit existing open tool for its notation rather than one shared canvas SDK, prioritizing standard-format compatibility over interaction consistency across canvases (ADR-0003). An Issue bundles all four canvases plus a Backlog together; the shell is issue-scoped, not canvas-scoped. Picking an Issue is an overlay, not a permanent panel — switching Issues is a heavier jump than picking between canvases, so it's summoned via the burger menu rather than parked on screen (ADR-0017). The **Backlog** panel, which covers the whole Issue rather than one canvas, takes the freed left position instead, minimizable but always present once an Issue is active. A **Presenting/Editing** mode toggle in its footer governs whether the **All** grid's tiles enter a canvas for editing or reflow in place — one tile enlarged, the other three stacked beside it — for a walk-through that never blocks the Backlog panel (ADR-0018/0019).

## Architecture

```
+-----------------------------------------------------------------------------------+
| [☰] Canvallax  |  Issue name/status  [All][Process][System][Object]...  | [Copy][History] |  <- .top-bar
+-----------+-------------------------------------------------------------+
| Backlog   |  "All": read-only grid of real per-engine thumbnails.       |
| panel     |    Editing mode: click enters that canvas's native editor,  |
| (always   |    engine + (Process only) bpmn-io properties panel.        |
| visible   |    Presenting mode: click reflows the grid in place — that  |
| once an   |    tile enlarges, the other three stack beside it. No live  |
| Issue is  |    editor mounts, no tabs shown, Backlog stays interactive. |
| active,   |                                                              |
| resizable,|                                                              |
| footer:   |                                                              |
| Presenting|                                                              |
| /Editing  |                                                              |
| toggle)   |                                                              |
+-----------+-------------------------------------------------------------+
```
`.top-bar` is one row, not two: a 1fr/auto/1fr CSS grid, not flexbox, so the
center track (Issue name/status + view-switcher) sits truly centered against
the *whole* bar width regardless of how much content the left (burger +
wordmark, always visible) or right (Copy/History) tracks hold. The burger
menu opens a small dropdown: **Change Issue** (the Issue-picker overlay —
also shown automatically, undismissably, whenever no Issue is active yet),
the **theme toggle**, and **Settings** (a mock overlay, no real content
yet). Activating an Issue always resets view -> All, Backlog -> expanded,
and closes the Issue-picker; switching views within an already-open Issue
leaves both exactly as left; `canvasMode` (Presenting/Editing) is a standing
session preference, not reset per-Issue (ADR-0017/0018/0019). The center/right
grid tracks are empty (not rendered) whenever `!activeIssue` — `.top-bar-
left` is the only part of `.top-bar` that isn't.

```
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
| `docs/adr/0001-*.md` – `0020-*.md` | Individual decisions — see the index for titles |

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
| [0008](docs/adr/0008-issue-centric-shell.md) | Issue-scoped shell: sidebar Issue browser, All + 4-view switcher, persistent minimizable Backlog panel — **superseded in full by 0017** |
| [0009](docs/adr/0009-no-cross-canvas-linking.md) | No cross-canvas element-link registry — Issue-level bundling is the association |
| [0010](docs/adr/0010-persistence-and-versioning.md) | One JSON document per Issue; every view + Backlog entry carries a UUID; git commit history is the version log (client-side for now) |
| [0011](docs/adr/0011-cross-issue-copy.md) | Copy a view (overwrite) or Backlog entry (append) from another Issue: always HEAD, `copiedFrom` provenance, never a whole Issue |
| [0012](docs/adr/0012-all-view-thumbnails.md) | All-view tiles render real SVG thumbnails per engine, content-hash cached |
| [0013](docs/adr/0013-theming-light-and-dark-mode.md) | Shell light/dark toggle; System/Interaction/Object follow it, Process stays light |
| [0014](docs/adr/0014-server-backed-persistence-deferred.md) | Server-backed persistence, once built, is Express (Node) — deferred |
| [0015](docs/adr/0015-computed-tooltips-deferred.md) | Tooltips computed live from state, never stored |
| [0016](docs/adr/0016-panel-collapse-via-drag-threshold.md) | Both side panels collapse by dragging their resize handle past a threshold; no explicit toggle button |
| [0017](docs/adr/0017-shell-navigation-restructure.md) | Burger-menu Issue picker (overlay, not a persistent sidebar); Backlog panel moves left; top brand bar |
| [0018](docs/adr/0018-presenting-and-editing-canvas-modes.md) | Presenting vs. Editing modes; Editing mode: click a tile enters it, tab-styled switcher — **enlarge mechanism superseded by 0019** |
| [0019](docs/adr/0019-presenting-mode-inline-grid-reflow.md) | Presenting mode's enlarge is an in-place grid reflow (1 featured + 3 stacked), not a lightbox overlay |
| [0020](docs/adr/0020-default-theme-is-light.md) | First-visit default theme is light, not OS-preference-based |

Naming for the canvases (Process/System/Object/Interaction/Backlog) is **not yet finalized** (`docs/adr/README.md`) — code and docs currently use the README naming. This is exactly why views and Backlog entries carry their own UUIDs (ADR-0007/0010): identity must survive a naming decision that hasn't happened yet.

## Sibling-Project Conventions Used Here

Canvallax shares this workspace with other solo-built webapps (`Climb-Buddy-Belay`, `Metroviz`, `OrgVisualizr`, and another project), each with its own `agents.md`/`AGENTS.md` and `docs/adr(s)/`. Where an ADR cites a sibling project's implementation as precedent (ADR-0008 cites `Climb-Buddy-Belay`'s mobile `<details>` collapse and that other project's resizable-sidebar drag handle; ADR-0013 cites `OrgVisualizr`'s theme toggle; ADR-0017/0018 cite the same other project's header brand cluster, modal skeleton, and sidebar-footer mode toggle), that project's source is the concrete reference to read before extending the Canvallax equivalent. (ADR-0019 has no sibling-project precedent — the in-place grid reflow was built from scratch.)

Conventions carried forward, consistent with every sibling project in this workspace:

- **ADRs are append-only** (`docs/adr/README.md`) — a changed decision gets a new ADR that supersedes the old one, never an edit to the old ADR's Decision section. A superseded ADR gets a one-line forward pointer in its metadata header only.
- **One module per concern** in both CSS and JS — `src/shell/`, `src/persistence/`, `src/canvases/*/`, `src/css/`.
- **Theme via CSS custom properties** on `:root`, `data-theme` attribute for light/dark, set before first paint to avoid a flash of the wrong theme (ADR-0013).
- **No framework-default confirm/alert.** Not yet needed anywhere in the current UI (nothing destructive enough to warrant a confirmation prompt exists yet), but the convention — a promise-based custom dialog module instead of native `confirm()`/`alert()`, matching `OrgVisualizr`'s `js/dialog.js` — applies the moment one is needed (e.g. deleting a Backlog entry).

## Module Layout

| Path | Role | ADR |
|------|------|-----|
| `src/shell/shell-state.js` | Alpine data factory: Issue selection/picker, view switching, canvas mode, Backlog panel state, resize, theme, history, copy | 0002, 0017, 0018, 0019 |
| `src/canvases/process/` | Process Canvas: bpmn-js + `@bpmn-io/properties-panel` | 0004 |
| `src/canvases/system/drawio-canvas.js` | System/Integration **and** Interaction Canvas: shared draw.io embed integration | 0005 |
| `src/canvases/object/` | Object Canvas: Mermaid text+preview | 0006 |
| `src/canvases/thumbnails.js` | All-view thumbnail orchestration across all four engines | 0012 |
| `src/persistence/git-store.js` | Client-side git layer (`isomorphic-git`/`lightning-fs`/IndexedDB): commits, history, blob reads | 0010 |
| `src/persistence/issue-store.js` | Issue CRUD, Backlog entries, copy, debounced autosave | 0007, 0010, 0011 |
| `src/persistence/seed-issues.js` | Example Issues seeded on a true first run | 0007 |
| `src/css/theme.css` | CSS custom properties, light/dark palette | 0013 |
| `src/css/shell.css` | All shell chrome and canvas-wrapper styling | — |
| `index.html` | Markup + Alpine directives for the whole shell | 0002, 0017, 0018, 0019, 0020 |

`index.html`'s markup, not a component framework, is the shell's template layer (ADR-0002) — there's no further per-panel module split (e.g. a dedicated "sidebar" or "backlog panel" file) beyond `shell-state.js`'s single data factory; that's a deliberate size call, not an oversight, and worth revisiting only if the shell's own complexity grows past what one file comfortably holds.

## Features & Future Work

Items with an ADR are designed but not built (ADR-0014). Everything else below needs direction clarified before implementing rather than guessing at exact behavior.

- **Server-backed git layer** (ADR-0010/0014) — client-side git was the deliberate starting point; a real Express/Node server is the expected next step once multi-device access or real-time collaboration are actually needed.
- **Settings overlay is a mock.** The burger menu's "Settings" opens a placeholder overlay with inert mock rows — no real settings surface behind it yet (ADR-0017). Scope of what actually belongs in it is still undefined.
- **Canvas naming finalization.** README/`docs/adr/README.md` flag Process/System/Object/Interaction/Backlog naming as provisional. Per-view UUIDs mean this can be resolved later without a data migration — but the rename itself (UI copy, `views.<name>` key vs. `id`, any docs referencing current names) is still unbuilt work when it happens.
- **Process Canvas's BPMN subset.** ADR-0004 calls for a constrained BPMN profile rather than bpmn-js's full default palette — not yet built; the canvas currently exposes bpmn-js's whole vocabulary.
- **File-manager-style Issue picker.** The Issue-picker overlay's list (ADR-0017) is still a flat, unfiltered list beyond its search field — worth revisiting (tabs, folder tree, per another project's own sidebar) once there are enough Issues that a flat list stops scaling.
- **Mobile Backlog collapse.** The single remaining side panel (Backlog) has no touch-friendly collapse mechanism below the 768px breakpoint — drag-collapse is disabled there (`.resize-handle{display:none}`) and nothing replaces it, unlike the old sidebar's `<details>` fallback. Not yet decided whether it needs one.
- **Featured tile is a static enlarge, not a live viewer.** Presenting mode's featured tile (ADR-0019) reuses the same rendered thumbnail, not a pannable/zoomable live render — fine for "look closer," a real diagram viewer is a bigger feature if that turns out to matter.
- **No transition on the grid reflow.** Switching a tile in/out of Presenting mode's featured layout (ADR-0019) is an instant snap — `grid-template-areas` changes aren't meaningfully animatable across browsers when the area count itself changes. Revisit only if it reads as jarring in practice.
- **Concurrent-edit / merge story** for one Issue's single JSON document — relevant once more than one person can edit the same Issue; out of scope while client-side/single-user.
- **Cross-canvas element-level linking**, reconsidered. ADR-0009 explicitly decided against building this now. If element-to-element navigation (e.g. one BPMN task ↔ one Object-canvas entity) turns out to matter in practice, it's new scope requiring its own ADR — not a partially-built feature waiting to be finished.
- **Real-time multiplayer editing** across all three tool-backed canvases — explicitly lower priority than format compatibility for the initial feasibility prototype; per-canvas feasibility notes live in ADR-0004/0005/0006.
- **Light/dark icons instead of a text label.** The burger menu's theme item is still plain text ("Light mode"/"Dark mode") — swap in real icons, silently drawing on `OrgVisualizr`'s icon set/pattern rather than the current text-only toggle.
- **Reconsider the Interaction canvas's underlying tool.** It currently shares draw.io with System/Integration (ADR-0005) — worth a real brainstorm on whether draw.io, Mermaid, bpmn.io, or even a per-Issue user-selectable switch (exactly one tool active at a time) is the better fit. Not decided, no direction given yet.
- **Is the Backlog footer the right place for the Presenting/Editing toggle?** Open question, not re-examined since ADR-0018 put it there.
- **Stray vertical divider next to "All."** `.issue-header`'s trailing border-right divider (meant to separate it from the tab switcher) still renders in Presenting mode even though the tab switcher itself is hidden there — worth checking whether it should be conditional on Editing mode too.
- **Move the theme toggle back to a visible top-left button?** Already moved once (ADR-0017 put it in the burger menu) — if revisited, decide it once rather than flip-flopping between the two locations again.
- **Process canvas should auto-fit and center on entry from the All grid**, not open at its default zoom/position — bpmn-js has a fit-to-viewport capability for this; inspiration from elsewhere in the workspace is fine to draw on.
- **Object canvas (Mermaid) should also fill/fit its available space on entry**, not just stay centered at its own intrinsic size the way it does today — same "auto-fit" idea as Process, for the other engine.
- **Sample screenshots in `README.md`.** The product framing doc has no visuals yet — worth adding a few once the shell's current look (burger menu, centered top bar, Presenting/Editing modes) feels settled enough to be worth capturing.

## What It Does NOT Do (yet)

- No real-time multiplayer editing in any of the three tool-backed canvases out of the box (ADR-0003/0004/0005/0006) — explicitly lower priority than format compatibility for the initial feasibility prototype.
- No cross-canvas element-level linking (ADR-0009, decided against) — association only happens at the Issue level.
- No live cross-issue references (ADR-0011) — copy is a one-time snapshot, never a link that stays in sync with its source; a whole Issue is never copyable at all.
- No multi-device or multi-user access to the same Issue (ADR-0010) — the git layer is client-side only, for now.
