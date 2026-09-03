# ADR-0015: Computed tooltips (deferred)

- Status: Accepted — deferred, not yet implemented
- Date: 2026-09-03
- Relates to: [ADR-0007](0007-issue-and-backlog-data-model.md), [ADR-0011](0011-cross-issue-copy.md)

## Context

Several places in the shell already show short or truncatable text standing in for something longer: the Issue name in the sidebar list, Backlog entry names/descriptions, status badges, and `copiedFrom` provenance lines (currently a fixed sentence — "Copied from another Issue" — with no detail on which Issue or when). None currently offer a way to see the full value without opening the Issue and reading the field directly.

[ADR-0007](0007-issue-and-backlog-data-model.md) already narrowed the persisted schema down to exactly the fields the UI needs, with no derived/denormalized fields anywhere. A separately-stored tooltip string would be new persisted state purely for a hover affordance — a maintenance burden (goes stale independently of the field it describes) with no benefit over computing it live.

## Decision

**Tooltips are computed directly, on demand, from the same in-memory Issue object already bound to the element** — never persisted, never cached. Each tooltip is a plain string expression evaluated where the element is rendered — an Alpine `:title` binding, a native browser tooltip, no new UI component:

- **Issue name / Backlog entry name and description** — the full text, so CSS-truncated long values are still readable on hover.
- **`copiedFrom` provenance** — computed from the `copiedFrom` object's own fields (`issueId` resolved to that Issue's current `name` via a live lookup in `issues`, plus the stored `at` timestamp) rather than the current fixed sentence, so hovering answers "copied from which Issue, when" instead of just "copied from somewhere." A renamed source Issue is reflected immediately, since the lookup is live, not a name frozen at copy time.

Scope is broad by design: any UI text that's truncated, abbreviated, or a fixed placeholder standing in for more specific state gets a computed tooltip — the pattern (bind `:title` to a live expression) is the decision, not an exhaustive element list.

## Consequences

**Positive**

- Zero new persisted state — nothing to keep in sync, nothing that goes stale independently of the field it describes.
- Native `title` means no new component, no hover-timing/positioning logic, and free accessibility behavior.
- `copiedFrom` provenance becomes actually informative using data [ADR-0011](0011-cross-issue-copy.md)'s copy operations already record — no schema change needed.

**Negative / risks**

- Native `title` tooltips are plain-text only with browser-inconsistent show-delay/styling — acceptable for supplementary detail, not a fit for richer tooltips later.
- A live `copiedFrom.issueId` → name lookup shows nothing useful if the source Issue was deleted after the copy — acceptable since Issues aren't currently deletable at all.

## Alternatives considered

- **Store a denormalized tooltip/label string on write** (e.g. snapshot the source Issue's name into `copiedFrom` at copy time). Rejected: duplicates data one lookup away, and goes stale the moment the source Issue is renamed.
- **A custom tooltip component** (styled, multi-line, positioned manually). Rejected for now — native `title` covers every case identified above.
