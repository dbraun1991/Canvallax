# ADR-0010: Persistence — one JSON document per Issue, client-side git-backed versioning

- Status: Accepted
- Date: 2026-09-03
- Relates to: [ADR-0007](0007-issue-and-backlog-data-model.md), [ADR-0011](0011-cross-issue-copy.md), [ADR-0014](0014-server-backed-persistence-deferred.md)

## Context

Every view needs its own history — browse and revisit past versions of one canvas, independent of the others — and the persisted representation has to be designed with versioning in mind from the start. Every canvas's native format (BPMN XML, mxGraph XML, Mermaid text) is plain text, so git diffs against it meaningfully: **git commit history already is a change log with revisit-any-point built in**, worth taking literally rather than inventing a custom version-log format.

## Decision

Each Issue is `issues/<issueId>.json` ([ADR-0007](0007-issue-and-backlog-data-model.md) for the exact schema). The `issues/` directory is a git repository (`src/persistence/git-store.js`, `isomorphic-git` over `@isomorphic-git/lightning-fs`/IndexedDB — fully client-side, no server); every save is one commit touching one file. Git commit history *is* the version log — no separate version-number field or snapshot array inside the JSON itself.

- **Save cadence**: discrete actions (create Issue, add/delete a Backlog entry, restore a version, copy) commit immediately. Free-text edits (Issue name, entry name/description, canvas content) go through `scheduleSave()` — a 1500ms debounce per Issue — so rapid typing doesn't produce one commit per keystroke.
- **Per-view history is derived, not stored**: `getViewHistory(issueId, view)` walks `git log` on the Issue's file and, for each commit, diffs `views[view].content` against the previous commit — only commits where that specific field actually changed count as a "version" of that view. The same walk, filtered on a different field, gives every other view's independent history from the same commit log.
- **Restoring** an old version writes that commit's content back as current and commits again (`restoreView()`) — it never rewrites git history, matching the append-only philosophy already used for `docs/adr/`.
- **Author identity**: every commit uses a fixed placeholder author (`{name: 'Canvallax', email: 'local@canvallax.app'}`) — no auth/identity system exists yet; this is still single-user, local-only.

**Client-side git is a starting point, not a final architecture call.** It's the cheaper, faster path to a working prototype and needs no deployment decision to start proving the versioning model out. A server-backed git repo ([ADR-0014](0014-server-backed-persistence-deferred.md)) is the expected next step once multi-device access or real-time collaboration are in scope — client-side git has no story for a second person or device seeing the same Issue.

## Consequences

**Positive**

- One JSON document is the whole Issue — simple to reason about, export, or hand to another tool.
- No custom version-log format to design or keep consistent — git already solves "list versions," "diff two versions," and "restore an old version."
- Each `views.<name>.content` string stays a portable, standalone file in its native format.

**Negative / risks**

- No multi-device or multi-user access to the same Issue — everything lives in one browser's IndexedDB. Acceptable for a feasibility prototype; revisit before anything beyond single-user, single-device use is expected.
- A single JSON file per Issue means concurrent edits to *different* views of the same Issue by different people would still touch the same file — a merge/conflict story is needed once multi-user editing is in scope.
- Field-level diffing assumes a commit's diff can be attributed cleanly to whichever view was actually edited; a commit that happens to touch several views at once (e.g. a bulk import) would show up in more than one view's history — probably correct, not yet validated against real usage.

## Alternatives considered

- **One file per view** (`process.bpmn`, `system.drawio`, etc. in a per-issue directory), each with independent git history. Not chosen: cleanly separates concerns, but turns every Issue-level operation (list Issues, show metadata) into a multi-file read instead of one; worth revisiting if per-view git history at the filesystem level ever matters more than single-document convenience.
- **Custom in-JSON version array**, hand-maintained. Rejected: duplicates what git already does correctly, plus its own pruning/storage-growth story.
