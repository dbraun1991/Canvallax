# ADR-0031: Canvas naming stays provisional — not finalized now

- Status: Accepted — deferred, revisit on demand
- Date: 2026-09-17
- Relates to: [ADR-0007](0007-issue-and-backlog-data-model.md), [ADR-0010](0010-persistence-and-versioning.md), `docs/adr/README.md`'s standing "naming not yet finalized" note

## Context

Canvas naming (Process/System/Object/Interaction/Backlog) has been flagged as provisional since this ADR tree's 2026-09-03 rebuild — README and `docs/adr/README.md` both carry the caveat, and ADR-0007/0010's per-view UUIDs exist specifically so identity survives a naming decision that hasn't happened yet. Asked directly whether now is a good time to finalize it, direction given: leave it as-is.

## Decision

Canvas naming stays provisional, indefinitely — no rename undertaken now, and no target date or trigger condition set for revisiting it. This closes the "is now the time" question rather than leaving it open: it isn't, until a concrete reason to rename actually comes up (real user-facing confusion, a naming decision forced by some other change, etc.) — not a scheduled or otherwise anticipated revisit.

Because the rename itself is genuinely free of data-migration cost (ADR-0007/0010's UUIDs), this is a pure "no strong reason to spend the effort yet" deferral, not one blocked by any technical constraint — the same shape ADR-0014 already used for deferring server-backed persistence.

## Consequences

**Positive**

- No naming churn without a clear replacement in mind, and no time spent bikeshedding a decision with zero technical urgency behind it.

**Negative / risks**

- README's and `docs/adr/README.md`'s "not yet finalized" caveat continues indefinitely — a minor, ongoing conspicuousness cost, not a functional one.

## Alternatives considered

- **Finalize naming now.** Rejected — no strong candidate names were actually on the table; deciding in a vacuum risks picking names that don't hold up once a concrete reason to rename does surface, which is exactly the scenario this defers to.
