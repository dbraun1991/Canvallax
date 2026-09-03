# ADR-0007: Issue and Backlog data model

- Status: Accepted
- Date: 2026-09-03
- Relates to: [ADR-0003](0003-canvas-architecture.md), [ADR-0008](0008-issue-centric-shell.md), [ADR-0010](0010-persistence-and-versioning.md), [ADR-0011](0011-cross-issue-copy.md)

## Context

Backlog has no existing open standard or file format to adopt — it's Canvallax's own domain model, not a diagram notation. The Backlog is a list of small, discrete needed changes for an Issue ("what needs to change to get from the current system to the pursued one"), not one text blob and not a 1:1 card attached to the Issue — so the Issue itself only needs to carry its own minimal identity, while the list of entries carries the actual content.

## Decision

**Build the Backlog as Canvallax-native data** — no external file-format dependency, persisted directly as fields on the Issue document itself, not as a fifth diagram engine (see [ADR-0003](0003-canvas-architecture.md)).

**Issue schema** (`issues/<id>.json`, `schemaVersion: 2`):

```json
{
  "id": "8f14e...-uuid",
  "schemaVersion": 2,
  "name": "Improve checkout flow",
  "status": "open",
  "createdAt": "2026-09-02T09:00:00Z",
  "updatedAt": "2026-09-02T09:00:00Z",
  "views": {
    "process":     { "id": "...-uuid", "format": "bpmn-xml",   "content": "..." },
    "system":      { "id": "...-uuid", "format": "drawio-xml", "content": "..." },
    "interaction": { "id": "...-uuid", "format": "drawio-xml", "content": "..." },
    "object":      { "id": "...-uuid", "format": "mermaid",    "content": "..." }
  },
  "backlogEntries": [
    {
      "id": "...-uuid",
      "name": "Add partial-refund support to the billing API",
      "description": "Free text — as long as needed.",
      "createdAt": "2026-09-02T09:05:00Z",
      "updatedAt": "2026-09-02T09:05:00Z"
    }
  ]
}
```

- **Issue** is deliberately minimal: `id`, `name`, `status` (`open` / `mapped` / `decided`, describing the Issue as a whole), plus `views` and `backlogEntries`. No `theme` or `notes` field at the Issue level — grouping and free-text detail live on individual entries instead. `name`/`status` are edited in the view-switcher tab bar (`.issue-header` in `index.html`), not inside the Backlog panel, since there's little enough there that it doesn't need a dedicated panel.
- **`backlogEntries`** is a list, each entry `{id, name, description, createdAt, updatedAt}` — **no status field**. An entry either exists (still a needed change) or is deleted (resolved or dropped); presence in the list *is* the status. Git history ([ADR-0010](0010-persistence-and-versioning.md)) already records what once existed and got removed, so nothing is lost by not tracking a status explicitly.
- **`views`** and its per-view UUID / history-diffing model are covered by [ADR-0010](0010-persistence-and-versioning.md) — this ADR only fixes the Issue's own scalar fields and the `backlogEntries` shape.
- Every Issue and every entry carries its own `id` (UUID), assigned once at creation and never reused, independent of its `name`/`description` — names can change, ids stay clean, and copy provenance ([ADR-0011](0011-cross-issue-copy.md)) anchors on these ids rather than on display text.

## Consequences

**Positive**

- Matches the actual need directly: a backlog is a list of discrete needed changes, not one text field or a 1:1 card.
- A minimal Issue (`name`+`status`) fits naturally in the tab bar instead of needing its own panel.
- No entry-level status removes an entire state machine (and the ambiguity of "what does 'mapped' mean for one backlog line item") in favor of "it's here or it's deleted" — simpler to build and matches how entries are actually used.
- Full control over the data model, including the entry/view UUIDs the four external diagram tools don't share a common ID space for.

**Negative / risks**

- No "for free" editor — the Backlog list UI (add/rename/describe/delete) is fully custom, unlike the four diagram canvases.
- Unconstrained by any third-party tool's license, watermark, or format quirks — but also gets none of their maturity for free.

## Alternatives considered

- **Keep a `theme` field on the Issue** for grouping/filtering. Considered, not chosen — easy to reintroduce as its own ADR once there's a concrete need (e.g. filtering the Issue sidebar), rather than kept now on a guess.
- **Give entries a lightweight status** (e.g. a boolean "done") instead of deletion. Rejected: deletion-as-resolution is simpler and already has a safety net (git history, [ADR-0010](0010-persistence-and-versioning.md)).
