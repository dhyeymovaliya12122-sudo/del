# Code Review & Debugging Rules: WhatsApp Core Engine

This document defines the 5-component code prompt system and targeted review passes calibrated specifically for `whatsapp-core-engine`.

## Technology Context (Pre-filled Stack Variables)
- **Framework**: NestJS 10 with Express platform
- **Language**: TypeScript 5.1 (strict mode)
- **Database & ORM**: PostgreSQL, TypeORM 0.3, better-sqlite3 for local testing
- **Queues & Caching**: Redis (ioredis), BullMQ 5.4 with per-account rate limiters
- **Realtime & Sockets**: Socket.io with Redis streams/adapter, Baileys 6.7 (WhatsApp Web socket engine)
- **Media**: AWS SDK v3 / Cloudflare R2 pipeline

---

## The 5-Pass Review Workflow

### Pass 1: Security & Boundary Isolation
**When to run**: Before committing any controller, resolver, gateway, or service method handling IDs or user input.
- **Rule 1 (IDOR & Tenant Isolation)**: Always verify `accountId` and `tenantId` scoping. Never perform `findOne({ where: { id } })` without scoping to the authenticated caller's account/tenant.
- **Rule 2 (Input Validation)**: Ensure DTOs use `class-validator` decorators. Verify array lengths, string sanitization, and bounded pagination (`take`, `skip`).
- **Rule 3 (Secrets & Credentials)**: Ensure no Baileys session auth credentials, JWT secrets, or DB strings leak to client DTOs, logs, or error responses.

### Pass 2: Concurrency & Async Safety
**When to run**: On message queue workers, session hydration, and campaign dispatchers.
- **Rule 1 (Distributed vs In-Memory)**: Never use in-memory locks or local flags for multi-instance deployments. Use Redis locks (`ioredis` / BullMQ locks).
- **Rule 2 (BullMQ Queue Ownership)**: Never run long-running dispatch loops with `setTimeout` in the NestJS process. Always offload sequential and rate-limited message dispatch to BullMQ jobs.
- **Rule 3 (Atomicity)**: Avoid check-then-act sequences (`find` then `save`). Use atomic SQL increments (`INCREMENT`, `ON CONFLICT DO UPDATE`) or database transactions.

### Pass 3: Database & Query Performance
**When to run**: On any service executing queries inside loops or handling bulk contacts/recipients.
- **Rule 1 (No N+1 Queries)**: Never call `findOne`, `find`, or `save` inside loops or `updateStats` loops. Use SQL aggregations (`COUNT()`, `GROUP BY`) or bulk operations (`save(chunk)` / `insert()`).
- **Rule 2 (Chunking)**: Bulk inserts/updates over 1,000 items must be chunked (e.g., 500 rows per batch) to prevent parameter overflow in PostgreSQL.
- **Rule 3 (Streaming & Pagination)**: All list endpoints must default to capped pagination (`take: 50`, `max: 200`).

### Pass 4: Silent Failure & Resilience
**When to run**: On background jobs, webhook handlers, and socket listeners.
- **Rule 1 (No Swallowed Errors)**: Never use empty `.catch(() => null)` or empty catch blocks on state transitions.
- **Rule 2 (Auditable State)**: Ensure failed jobs transition recipient/campaign status to `failed` with an informative `errorMessage`.
- **Rule 3 (Throttled Boot Hydration)**: Never use unbounded `Promise.allSettled` on dozens of socket connections during `onApplicationBootstrap`. Batch connections with concurrency limits.

### Pass 5: Behavior-Preserving Refactoring
**When to run**: When restructuring services or extracting helper functions.
- **Rule 1 (Observable Contract)**: Preserve return types, DTO structures, and external webhook responses.
- **Rule 2 (Smallest Seam)**: Introduce testable seams via optional injected dependencies or parameter defaults rather than heavy abstractions.
