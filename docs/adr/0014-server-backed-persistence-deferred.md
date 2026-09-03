# ADR-0014: Server-backed persistence (deferred) — Express

- Status: Accepted — deferred, not yet implemented
- Date: 2026-09-03
- Relates to: [ADR-0001](0001-frontend-build-tooling-vite.md), [ADR-0003](0003-canvas-architecture.md), [ADR-0010](0010-persistence-and-versioning.md)

## Context

[ADR-0010](0010-persistence-and-versioning.md) chose client-side git as a deliberate starting point, not a final architecture, and names a server-backed git repo as the likely next step "once multi-device access or real-time collaboration are in scope." This ADR settles what that server is *built in*, ahead of actually needing it, so the choice doesn't get made implicitly by whatever's convenient later.

None of the four canvas engines ([ADR-0003](0003-canvas-architecture.md)) need a backend at all — they're pure client-side JS libraries; Node is only involved as build tooling (npm/Vite) today. The only thing that will actually need a server is the persistence layer, once client-side git stops being sufficient. Separately, Mermaid's plain-text format makes Object the one canvas where real-time collaborative editing is comparatively cheap (a CRDT/OT sync on a text field) if that's ever pursued.

## Decision

When a server-backed persistence layer is built, it is **Express (Node.js)**, not Python or any other language:

1. **Git library continuity** — a Node server can reuse `isomorphic-git` (or `simple-git`) and the same per-view field-diffing logic already written client-side ([ADR-0010](0010-persistence-and-versioning.md)), instead of re-deriving it in a second language.
2. **Realtime path stays open cheaply** — if Mermaid-source real-time collaboration is ever pursued, Yjs (the most mature CRDT text-sync library) is JS-native; an Express backend can add this directly.
3. **One runtime for a solo build** — Express + filesystem storage + Docker is a small, well-understood shape. A second language means a second runtime, dependency manager, and deploy target for no capability currently needed.

Scope once built: owns the server-side git repository under `issues/` and exposes it over HTTP to the frontend — replacing the client's direct `isomorphic-git`/IndexedDB access, not running alongside it. Concurrent-edit/merge handling and real-time collaboration remain separately deferred — this ADR only fixes the language/framework, not the timing or the collaboration model.

## Consequences

**Positive**

- One Node-based stack end-to-end, no second language/runtime to install or deploy.
- Git-handling logic can be shared or mirrored 1:1 between the client's current `isomorphic-git` usage and the eventual server.
- Leaves the Yjs/realtime door open for Mermaid without committing to build it now.

**Negative / risks**

- Ties the eventual server to Node's concurrency model for filesystem/git operations — acceptable, since nothing else in this project's scope calls for anything Node handles poorly.
- Fixes *language*, not *when* the server gets built or *how* concurrent multi-user edits to one Issue's JSON document are resolved — both remain open; a follow-up ADR is still needed once that work actually starts.

## Alternatives considered

- **Python backend** (e.g. FastAPI/Flask + GitPython). Rejected: no Python-specific capability is needed anywhere in current scope; would re-implement git-diffing logic already designed for `isomorphic-git`, and would need a separate Node process anyway if Yjs-based realtime is ever added.
- **No server, keep client-side git indefinitely.** Not rejected outright — correct until multi-device/multi-user access is actually needed ([ADR-0010](0010-persistence-and-versioning.md)). This ADR only pre-decides the language for when that trigger is hit.
