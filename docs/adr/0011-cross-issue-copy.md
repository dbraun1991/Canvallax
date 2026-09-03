# ADR-0011: Cross-issue copy — views overwrite, Backlog entries append, never a whole Issue

- Status: Accepted
- Date: 2026-09-03
- Relates to: [ADR-0007](0007-issue-and-backlog-data-model.md), [ADR-0009](0009-no-cross-canvas-linking.md), [ADR-0010](0010-persistence-and-versioning.md)

## Context

Reusing material from another Issue should be possible without turning it into a live reference — [ADR-0009](0009-no-cross-canvas-linking.md) already ruled out cross-issue links, so a copy is a one-time, one-directional snapshot, always of the source's current state, never a pointer that could later be re-resolved against a different point in its history. A view (one of the four canvases) and a Backlog entry need different copy semantics, because a view is a single named slot on the Issue while `backlogEntries` is a list.

## Decision

Two copy operations (`src/persistence/issue-store.js`: `copyView`, `copyBacklogEntry`), both reading the source at its current HEAD (`getHeadCommitOid`) — never a historical version selected from that view's own history browser — and both recording provenance as structured JSON, never re-resolved after the copy:

- **View copy — overwrite.** The chosen view's (`process`/`system`/`object`/`interaction`) content replaces the destination's corresponding view content, keeping the destination's own view `id`. `copiedFrom: {issueId, viewId, commit, at}` is recorded on the copied view. Destructive by design — the destination's pre-copy content survives in its own history ([ADR-0010](0010-persistence-and-versioning.md)), so nothing is unrecoverably lost, but the UI (`copy-picker-note` in `index.html`) says so explicitly.
- **Backlog-entry copy — append, not overwrite.** A **new** entry (new `id`) is appended to the destination's `backlogEntries`, with `name`/`description` cloned from the source and `copiedFrom: {issueId, entryId, commit, at}` anchored on the source entry's own `id`. Not destructive at all — nothing existing is touched.
- **A whole Issue is never copyable as one unit.** There is no "duplicate this Issue" action. Reusing material from an older Issue means creating a new (empty) Issue, then copying whichever specific views and entries are actually relevant, individually, as many times as wanted — not a bulk clone of everything an old Issue happened to contain.

`copiedFrom` anchors on the source's view/entry `id`, not its `views.<name>` key or display text ([ADR-0007](0007-issue-and-backlog-data-model.md)) — names can change, provenance shouldn't break when they do.

## Consequences

**Positive**

- "Always current HEAD" removes an entire axis of complexity (picking a source version) from the copy UI.
- Two different copy semantics (overwrite vs. append) each match their target's actual shape — a view is a singleton slot, entries are a list.
- Explicitly ruling out whole-Issue copy keeps the feature narrow and matches the actual want: selective reuse, not duplication.

**Negative / risks**

- Two different copy semantics in one feature is a source of potential UI confusion — the copy picker states "overwrites" vs. "adds a new entry" explicitly per target type (`index.html`'s `copy-picker-note`) rather than leaving it implicit.
- `copiedFrom` pointing at a `sourceIssueId` that's later deleted becomes a dangling reference — acceptable (it's a historical fact, not a live dependency), though Issues aren't currently deletable at all, so this hasn't been exercised.
- No bulk "import everything relevant from Issue X" shortcut — pulling in several entries and canvases from the same source means repeating the copy action per item.

## Alternatives considered

- **Let the user pick a specific historical version of the source**, not just HEAD. Rejected: conflates this feature's scope with the per-view history browser's own job.
- **Overwrite semantics for entry copy too.** Rejected: entries are a list, not a singleton slot — there's no natural "which existing entry does this replace" target the way a view copy has one obvious destination field.
- **Allow whole-Issue duplication** as a shortcut alongside per-piece copy. Rejected: selective reuse via individual copies is the only supported path.
