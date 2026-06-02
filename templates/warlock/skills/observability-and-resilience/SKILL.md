---
name: observability-and-resilience
description: 'How this project stays debuggable in production and survives flaky dependencies — `log.<level>(module, action, message, context)` from `@warlock.js/logger` with `X-Request-Id` propagation (already shipped via core middleware), structured metrics naming `<area>.<noun>.<unit>`, health endpoints (`/health/live` for liveness vs `/health/ready` for readiness), timeouts on every external call (`@warlock.js/http` `timeout` per Http instance / per request), retries with exponential backoff for idempotent ops only (never auto-retry POST without an idempotency key), idempotency keys for side effects (payments, emails, webhook deliveries), circuit breakers for flaky deps, graceful shutdown via `log.configure({ autoFlushOn: ["SIGINT", "SIGTERM", "beforeExit"] })`, N+1 detection, streaming for large payloads. Triggers: making an HTTP / AI / queue / DB call; adding a timeout or retry; designing an idempotency key for a side effect; instrumenting metrics; adding a health check; tracing a request across services; user asks "timeout", "retry policy", "idempotency", "request id", "tracing", "graceful shutdown", "health check", "circuit breaker", "N+1 query", "caching strategy", "metrics naming"; touching `@warlock.js/http` / `@warlock.js/scheduler` / `@warlock.js/ai` call sites. Skip: log call signature (load `skills/code-standards/SKILL.md` § 8); secrets in logs (load `skills/security-baseline/SKILL.md` § 8); pure-function refactors with no external I/O; cache driver setup (load `@warlock.js/cache` skills); HTTP client config in depth (load `@warlock.js/http` skills).'
---

# Observability & resilience

**Status:** Stable
**Applies to:** Every external call, every long-running operation, every production process.

Without observability you debug by guessing. Without resilience one slow dependency takes the whole service down. These rules cost a few extra lines per call site and save days of incident response.

> **Sub-agent rule:** Before making any external call or designing a long-running operation, read this file.

---

## 1. Request ID propagation

### 1.1 One ID per request

The framework's `@warlock.js/core` HTTP middleware already attaches an `X-Request-Id` header — honoured if the client sent one, generated if not. The same id is echoed back in the response and available to every log call within the request's lifetime.

### 1.2 Include it in every log line

Inside a request, pass the request id as part of the log context:

```typescript
// ✅
log.info("orders", "order-placed", "Order created", {
  orderId,
  userId,
  requestId: request.id,
});
```

Without it, debugging a production incident is archaeology — you can't correlate the upstream log line with the downstream failure.

### 1.3 Propagate downstream

When this service calls another service or a third-party API, forward the request id as `X-Request-Id` on the outgoing call. The full trace is what makes distributed debugging possible.

---

## 2. Timeouts

**Every external call has an explicit timeout.** No exceptions.

### 2.1 HTTP — `@warlock.js/http`

Set a default at the `Http` instance level; override per request when the endpoint legitimately needs more.

```typescript
// ✅ instance-level default
const stripeClient = new Http({
  baseURL: "https://api.stripe.com",
  timeout: 10_000,  // 10s — enough for most calls, short enough to fail fast
});

// ✅ per-request override for a known-slow call
await stripeClient.post("/v1/payouts/preview", body, { timeout: 30_000 });
```

### 2.2 AI calls

AI calls run longer than typical HTTP. Use the per-provider defaults from `@warlock.js/ai` adapters and override per call when streaming a known-large completion. Never leave AI calls without a timeout — a hung model = a wedged worker.

### 2.3 Database queries

Driver-level timeout (set in `config/database.ts`) + per-statement timeout for known-expensive queries. A 30-second query lock kills concurrency under load.

### 2.4 Queue ops

Set the visibility timeout to match the expected processing time of the message — long enough that the handler finishes, short enough that a crashed worker doesn't park the message for hours.

### 2.5 Why this matters

A dependency that hangs without timing out is worse than a dependency that errors. Errors are visible; hangs eat workers silently until the pool is empty and the service stops responding.

---

## 3. Retries

### 3.1 Retry only idempotent ops

- **Safe to retry**: `GET`, `PUT`, `DELETE`, reads, lookups, queries
- **Never auto-retry**: `POST` without an idempotency key, queue ops without dedup, payment charges

A naive retry on a failed payment charge double-charges the customer. Don't.

### 3.2 Exponential backoff with jitter

A retry storm against a recovering service brings it down again. Backoff with jitter spreads the load:

```
attempt 1 → fail
wait 100ms ± 50ms
attempt 2 → fail
wait 250ms ± 100ms
attempt 3 → fail
wait 600ms ± 200ms
```

### 3.3 Bounded

Max retries: small (3–5). Past that, surface the failure to the caller and let them decide. Infinite-retry-with-backoff is just a slower hang.

### 3.4 Retry budget

When a dependency is clearly down (sustained failure rate > 50% over 30s), stop retrying entirely and fast-fail. See § 5 circuit breakers.

---

## 4. Idempotency keys

### 4.1 What needs one

Any operation whose accidental retry would cause real-world harm:

- Payment charges, refunds, payouts
- Outbound emails, SMS, push notifications
- Webhook deliveries
- Third-party POSTs that mutate state

### 4.2 Key generation

- **Server-internal calls**: generate the key at the call site (UUID / nanoid), store it.
- **Client-originated mutations** (e.g. "place order" from a mobile app): the client generates the key and sends it as a header (`Idempotency-Key`); the server stores `key → result`.

### 4.3 Storage

Persist `key → result` with a TTL longer than your retry window (24h is typical). On retry with the same key, return the stored result without re-executing.

### 4.4 Pattern

```typescript
// ✅
export async function chargePaymentService(input, idempotencyKey) {
  const cached = await idempotencyRepository.find({ key: idempotencyKey });
  if (cached) {
    return cached.result;
  }

  const result = await stripeClient.post("/v1/charges", input);
  await idempotencyRepository.create({ key: idempotencyKey, result, expiresAt: in24h });

  return result;
}
```

---

## 5. Circuit breakers

### 5.1 When to add one

For any dependency that's flaky enough that retries alone aren't enough — typically third-party APIs, edge services, anything outside your operational control.

### 5.2 States

- **Closed** — normal operation, calls pass through.
- **Open** — failure rate exceeded threshold; calls fail fast without hitting the dependency.
- **Half-open** — after a cooldown, allow a few calls through to probe recovery.

### 5.3 Fallback behaviour

When the breaker is open, the call site needs a plan:

- Return a cached value (if the data is cacheable)
- Queue for later (if the operation can wait)
- Fail-fast to the user (if neither — at least the user knows immediately)

Never silently swallow.

---

## 6. Health checks

### 6.1 Two endpoints, two semantics

- **`/health/live`** — liveness. Is the process alive? Almost always returns 200; the only way it returns non-200 is if it's about to crash anyway. Used by the orchestrator to decide whether to kill and restart.
- **`/health/ready`** — readiness. Can the process serve traffic? Checks DB connectivity, queue connectivity, warm-up completion. Used by the load balancer to decide whether to route traffic.

### 6.2 Don't conflate them

Returning 503 from `/health/live` because the DB is down causes the orchestrator to restart the process — which doesn't fix a DB problem and adds restart-loop chaos to an outage. Use `/health/ready` for "I can't serve right now" so the LB drains traffic without the orchestrator interfering.

### 6.3 No internal details leaked

Health endpoints return a status code, not internal version info, env names, dependency hostnames, or stack traces. Those are information leaks under a different name.

---

## 7. Metrics

### 7.1 Three primitive types

- **Counter** — things that happened, monotonically increasing (`orders.placed.total`, `auth.login.failed.total`)
- **Gauge** — current value (`queue.depth`, `connections.active`, `cache.size_bytes`)
- **Histogram** — distribution (`http.request.duration_ms`, `ai.completion.tokens`)

### 7.2 Naming — `<area>.<noun>.<unit>`

Match the log `module` / `action` convention. The metric `orders.placed.total` corresponds to the log call `log.success("orders", "order-placed", ...)`. Symmetry across observability surfaces makes incidents debuggable.

### 7.3 Cardinality discipline

**Never** include high-cardinality values as labels: user-id, request-id, order-id, email. Each unique value creates a new metric series; a million users = a million series = your monitoring backend's invoice goes vertical.

Use logs for high-cardinality data, metrics for aggregates.

### 7.4 What to instrument

Start with the four golden signals:

- **Latency** — `http.request.duration_ms` histogram, by route
- **Traffic** — `http.requests.total` counter, by route + status
- **Errors** — `http.requests.errors.total` counter, by route + error class
- **Saturation** — queue depth, connection pool usage, memory

Add business metrics on top (`orders.placed.total`, `revenue.cents.total` — taking care with cardinality).

---

## 8. Graceful shutdown

### 8.1 The sequence

SIGTERM (or SIGINT) →

1. Stop accepting new requests / new queue messages (close the listeners).
2. Finish in-flight work with a hard timeout (30s typical).
3. Flush logs.
4. Close DB / external connections cleanly.
5. Exit 0.

### 8.2 Logger flush

`@warlock.js/logger` covers step 3 when you configure it correctly:

```typescript
// ✅ config/log.ts (or equivalent boot file)
log.configure({
  channels: [/* ... */],
  autoFlushOn: ["SIGINT", "SIGTERM", "beforeExit"],
});
```

Without `autoFlushOn`, buffered log entries are lost on shutdown — exactly when you most want them.

### 8.3 The hard timeout matters

If in-flight work doesn't finish in 30s, kill it anyway. The alternative is hanging forever waiting for one stuck request, which makes deploys / restarts unreliable.

---

## 9. Performance defaults

These belong here because performance failures present as resilience failures — a slow query starves the pool, a missing index turns a 10ms call into a 5-second call, an unbounded list returns 50k rows and OOMs the response serializer.

### 9.1 N+1 queries are bugs, not warnings

A list endpoint that fires one query per item is a bug. Either eager-load relations (Cascade's `.with("relation")`) or batch-fetch the related ids in a single query and join in-process.

A code review that lets an N+1 through is doing its job poorly. Add it to the review checklist (already in `skills/api-design/SKILL.md`).

### 9.2 Pagination always

See `skills/api-design/SKILL.md` § 3. No unbounded list ever, even if today's dataset is 12 rows.

### 9.3 Stream large payloads

For responses > 1MB or uploads > 1MB, stream end-to-end. Never buffer a 50MB file into memory to send it.

### 9.4 Cache invalidation strategy

Pick one and stick to it per surface:

- **TTL** — simplest; tolerable staleness for a fixed window. Good for read-mostly catalog data.
- **Write-through** — invalidate on the corresponding write. Good for user-owned data where staleness is visible.
- **Event-driven** — invalidate on a published event. Good across multiple services.

`repository.listCached(...)` exists for hot read paths — use it where the dataset changes rarely. Invalidate on the corresponding write through the repository's hooks.

### 9.5 No sync I/O on the request path

`readFileSync`, `execSync`, sync DB drivers — all banned in handler code. They block the event loop and crater throughput under load.

---

## 10. Review checklist

Before merging a change that touches an external call, long-running op, or production wiring:

- [ ] Request id propagated in every log line within the request lifecycle
- [ ] External call has an explicit timeout (HTTP, AI, queue, DB)
- [ ] Retries only on idempotent ops; non-idempotent ops have an idempotency key
- [ ] Idempotency keys persisted with a TTL longer than the retry window
- [ ] Circuit breaker considered for any flaky third-party dependency
- [ ] Health endpoints split — `/health/live` separate from `/health/ready`
- [ ] No high-cardinality values (user-id, request-id) as metric labels
- [ ] Metric names follow `<area>.<noun>.<unit>`, mirror log `module.action`
- [ ] `log.configure({ autoFlushOn: ["SIGINT", "SIGTERM", "beforeExit"] })` set
- [ ] No N+1 introduced — relations eager-loaded or batched
- [ ] No unbounded list endpoint
- [ ] No sync I/O on the request path
- [ ] Cache invalidation strategy declared for any new cache surface
