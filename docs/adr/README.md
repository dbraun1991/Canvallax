# Architecture Decision Records

Numbered, append-only decision log for Canvallax. Each ADR captures the context, the decision, and its consequences at the time it was made — if a decision changes later, add a new ADR that supersedes it rather than editing the old one. A superseded ADR gets a one-line forward pointer added to its metadata header only (e.g. "Superseded by: ADR-00xx"); its own Context/Decision/Consequences stay untouched.

This tree was rebuilt from scratch on 2026-09-03, consolidating what had been twenty iterative ADRs in this project's earlier prototype (under the name ParallAlign) down to the fifteen below — each one written to describe the decision as it actually stands today, not the path that was taken to get there. From here forward, new decisions get new ADRs on top of this set, following the same append-only rule.

| # | Title | Status |
|---|---|---|
| [0001](0001-frontend-build-tooling-vite.md) | Frontend build tooling: npm + Vite | Accepted |
| [0002](0002-shell-ui-reactivity-alpinejs.md) | Shell UI reactivity: Alpine.js | Accepted |
| [0003](0003-canvas-architecture.md) | Canvas architecture: specialized engine per canvas, no unified SDK | Accepted |
| [0004](0004-process-canvas-bpmn-js.md) | Process Canvas: bpmn-js | Accepted |
| [0005](0005-system-and-interaction-canvases-drawio.md) | System/Integration and Interaction Canvases: draw.io | Accepted — Interaction Canvas superseded by 0021 |
| [0006](0006-object-canvas-mermaid.md) | Object Canvas: Mermaid | Accepted |
| [0007](0007-issue-and-backlog-data-model.md) | Issue and Backlog data model | Accepted |
| [0008](0008-issue-centric-shell.md) | Issue-centric shell: sidebar, All + 4-view switcher, persistent Backlog panel | Superseded in full by 0017 |
| [0009](0009-no-cross-canvas-linking.md) | No cross-canvas element-link registry | Accepted |
| [0010](0010-persistence-and-versioning.md) | Persistence: one JSON document per Issue, client-side git-backed versioning | Accepted |
| [0011](0011-cross-issue-copy.md) | Cross-issue copy: views overwrite, Backlog entries append, never a whole Issue | Accepted |
| [0012](0012-all-view-thumbnails.md) | All-view renders real per-canvas thumbnails | Accepted |
| [0013](0013-theming-light-and-dark-mode.md) | Theming: shell light/dark toggle; canvases follow it except Process | Accepted — first-visit default superseded by 0020; Interaction's theming mechanism superseded by 0021 |
| [0014](0014-server-backed-persistence-deferred.md) | Server-backed persistence: Express (deferred, not yet implemented) | Accepted — deferred |
| [0015](0015-computed-tooltips-deferred.md) | Computed tooltips | Accepted |
| [0016](0016-panel-collapse-via-drag-threshold.md) | Panel collapse via drag-past-threshold on the resize handle, not an explicit toggle button | Accepted |
| [0017](0017-shell-navigation-restructure.md) | Shell navigation restructure: burger-menu Issue picker, single left Backlog panel, top brand bar | Accepted |
| [0018](0018-presenting-and-editing-canvas-modes.md) | Presenting vs. Editing canvas modes | Accepted — enlarge mechanism superseded by 0019 |
| [0019](0019-presenting-mode-inline-grid-reflow.md) | Presenting mode's enlarge is an in-place grid reflow, not a lightbox overlay | Accepted |
| [0020](0020-default-theme-is-light.md) | First-visit default theme is light, not OS-preference-based | Accepted |
| [0021](0021-interaction-canvas-excalidraw.md) | Interaction Canvas: Excalidraw, not draw.io | Accepted |
| [0022](0022-static-hosting-github-pages.md) | Static hosting: GitHub Pages, deployed via GitHub Actions | Accepted |
| [0023](0023-fixed-four-canvases-no-user-configurable-set.md) | Exactly four canvases, not a user-configurable count/style — with an in-app reminder why | Accepted |

Naming for the canvases (Process/System/Object/Interaction/Backlog) is not yet finalized — these ADRs use the current README naming and should be updated if it changes. This is why every view and Backlog entry carries its own UUID independent of that naming (ADR-0007) — identity has to survive a naming decision that hasn't happened yet.
