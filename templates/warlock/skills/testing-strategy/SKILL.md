---
name: testing-strategy
description: 'Test pyramid posture for Warlock.js apps — Vitest co-located (`foo.ts` → `foo.spec.ts`); **when testing is enabled in the project (a `test`/`test:*` script in package.json OR a `vitest.config.*` / `vite.config.*` file), it is mandatory that every service ships a co-located `.service.spec.ts` and every HTTP controller / request handler ships a test — a new service or endpoint without a spec is incomplete**; unit tests dominate (~70%), integration tests via `@testcontainers/mongodb` + `@testcontainers/postgresql` (~25%), e2e for critical user journeys only (~5%); coverage is a smoke detector not a target (`yarn test:coverage` via `@vitest/coverage-v8`); flaky-test zero-tolerance (quarantine in 24h, fix or delete in 7); test isolation (no shared state, no order dependency); AAA structure with blank-line phases; mock at the boundary not deep inside; `MockSDK` from `@warlock.js/ai` for AI calls; real DB via testcontainers for integration; snapshot tests only for small deterministic output; contract tests for external integrations. Triggers: deciding whether to write a unit / integration / e2e test for a change; setting up a new `.spec.ts`; debugging a flaky test; reviewing the test plan in a PR; user asks "should I unit test this", "what is our coverage policy", "this test keeps failing intermittently", "what should I mock", "test pyramid", "integration test vs unit test", "snapshot tests", "how do I test a service that hits the DB", "how do I test AI code". Skip: Vitest assertion API mechanics — that''s the testing framework''s docs; language / runtime questions; load testing / performance benchmarking; framework-package internals — load the relevant `@warlock.js/*` skill.'
---

# Testing strategy

**Status:** Stable
**Applies to:** Every test in the project, and every code change that should but doesn't have one.

Tests are insurance, not ceremony. The right tests prevent the right bugs at the right cost. Wrong-shape tests slow the team down and rot until everyone ignores them.

> **Sub-agent rule:** Before writing tests, read this file to decide what kind of test belongs here.

---

## 0. When this skill applies — and the mandate

This skill governs projects that have **opted into testing**. Testing is **enabled** when **either** is true:

- `package.json` has a `test` (or `test:*`) script, **or**
- a `vitest.config.*` / `vite.config.*` file exists at the project root.

When the `test` feature is selected at scaffold time, both land automatically (Vitest, `@vitest/coverage-v8`, testcontainers, and a per-worker DB/cache test setup).

### 0.1 If testing is enabled, tests are mandatory — not optional

- **Every service** ships a co-located unit spec: `place-order.service.ts` → `place-order.service.spec.ts`. Cover the happy path, every branch, and every error path. Mock the repository — the service's logic is the unit under test.
- **Every HTTP controller / request handler** ships a test: a unit test with mocked services for its branch / validation / authorization logic, **or** an integration test through the route when the wiring is the point. A new endpoint without a test is an incomplete endpoint.

Write the spec in the **same change** that adds the service or controller. A reviewer treats a missing spec as a blocking defect, not a follow-up.

### 0.2 If testing is NOT enabled

No `test` script and no vitest/vite config — e.g. a scaffold created without the `test` feature. **Do not** add tests or testing dependencies unprompted, and don't invent a `vitest.config`. If the project is outgrowing prototype stage, *suggest* enabling the `test` feature — but never scaffold a suite the project didn't ask for.

---

## 1. The pyramid

```
        /\
       /  \      e2e        (~5%)  — slow, full system, critical journeys only
      /----\
     /      \   integration (~25%) — real DB / queue, exercises wiring
    /--------\
   /          \  unit       (~70%) — fast, isolated, pure logic
  /____________\
```

### 1.1 Unit — most of the suite

- Services with mocked repositories
- Utility functions (pure)
- Model getters, validators, computed fields
- Resource mappers
- Error class construction

Fast (< 50ms each), isolated (no I/O), pinned to a single function or class.

### 1.2 Integration — real wiring

- Services + real DB (via testcontainers)
- Repository queries against a real DB
- Queue producer + consumer wired together
- Auth flow through the framework's middleware

Medium (100ms–2s each), real dependencies, fewer than unit tests.

### 1.3 E2E — critical journeys

- "User can sign up and place an order"
- "User can log in, hit rate-limit, recover"
- Payment + webhook handshake

Slow (5–30s each), small number (10–30 per app), only for journeys whose breakage is a business-impacting incident.

### 1.4 The 70 / 25 / 5 split

Not enforced numerically. Enforced culturally — when a reviewer sees ten new e2e tests for one feature, they push back.

---

## 2. What to test, what not to

### 2.1 Test

- **Public surface of a module** — services, controllers, resources, models' public methods
- **Branches and edge cases** — every `if` / `else` worth its salt has a test
- **Error paths** — what happens when the dependency fails / the input is invalid / the user lacks permission
- **Security-sensitive logic** — auth, authorization, input validation, rate limiting
- **Money and time arithmetic** — these break silently; tests are the only safety net
- **Business rules** — anything where "the spec says X" matters more than "the code does Y"

### 2.2 Don't test

- **The framework** — `@warlock.js/*` has its own tests. Don't re-test that `response.success()` returns 200.
- **Trivial getters / setters** — `cart.totalCents` returning `this.get<number>("total_cents", 0)` doesn't need a test
- **One-line passthroughs** — `loginService(...)` just calling `authService.login(...)` doesn't need a unit test (an integration test of the wiring is better)
- **Generated code** — migrations, resource scaffolds

### 2.3 The rule of thumb

If a future change to this function could silently break behaviour someone cares about, write a test. If a future change would either be obviously broken or obviously fine, skip it.

---

## 3. Test isolation — non-negotiable

### 3.1 No shared mutable state

Each test sets up and tears down its own world. No `let users = []` at the top of the file mutated across tests.

### 3.2 Test order independence

`vitest --shuffle` should still pass. If it doesn't, you have shared state somewhere — fix it before adding more tests.

### 3.3 Database tests

Use transactions that roll back, or use testcontainers with a fresh container per file. Never share rows across tests.

The project's testcontainers setup makes "fresh DB per test file" cheap — use it.

### 3.4 Time and randomness

Stub `Date.now()` / `Math.random()` / UUID generation when the test depends on the value. `vi.useFakeTimers()` and `vi.spyOn()` are your tools.

---

## 4. Mocking philosophy

### 4.1 Mock at the boundary

Mock the HTTP client, not the internal functions that use it. Mock the AI provider, not the service that calls it. The further from the boundary you mock, the more your tests describe implementation rather than behaviour.

### 4.2 AI calls — `MockSDK`

Never hit a real provider in tests. Use `MockSDK` from `@warlock.js/ai`:

```typescript
// ✅
import { MockSDK } from "@warlock.js/ai";

const ai = MockSDK({
  responses: [{ text: "mocked response" }],
});

const result = await summarizeContentService(input, { provider: ai });
expect(result).toBe("mocked response");
```

See `@warlock.js/ai/skills/run-ai-agent/SKILL.md` for the full mock surface.

### 4.3 Database — real, via testcontainers

For integration tests, run a real Mongo or Postgres container via `@testcontainers/mongodb` or `@testcontainers/postgresql`. The cost (a few seconds at suite start) is worth the fidelity (catching real-world query issues, real index usage, real type coercion).

For pure-unit tests of services, mock the repository — the service's logic is the unit under test, not the DB.

### 4.4 Time — stub, don't sleep

```typescript
// ❌
await sleep(1000);

// ✅
vi.useFakeTimers();
vi.advanceTimersByTime(1000);
```

A test that sleeps is a test that's slow and flaky. Stub the clock.

---

## 5. AAA structure

Every test has three phases, separated by blank lines:

```typescript
it("denies cart updates after checkout", async () => {
  // Arrange
  const cart = await cartFactory.create({ status: CartStatus.CHECKED_OUT });
  const update = { totalCents: 99999 };

  // Act
  const promise = updateCartService(cart.id, update, mockUser);

  // Assert
  await expect(promise).rejects.toThrow(CartLockedError);
});
```

### 5.1 One assertion target per test

Multiple `expect` calls are fine if they all verify one outcome. A test that asserts five unrelated things hides which one broke.

### 5.2 Descriptive `it(...)` names

The name describes the expected behaviour, not the implementation. "rejects cart updates after checkout" beats "throws CartLockedError when status is CHECKED_OUT" (the implementation detail is irrelevant to the reader scanning the suite).

---

## 6. Coverage policy

### 6.1 Coverage is a smoke detector

Low coverage = guaranteed gaps. High coverage = no guarantee of correctness. Treat it as a "definitely look here" signal, not a quality metric.

### 6.2 Suggested floors

- `src/app/**/services/**` — ≥ 70% line coverage
- `src/app/**/utils/**` — ≥ 80% (pure code, easy to test)
- `src/app/**/resources/**` — no floor (output-only, low risk)
- `src/app/**/models/**` — no floor (mostly getters; framework tests cover the rest)
- `src/app/**/types/**` — no floor (no runtime behaviour)

### 6.3 Aim for "the meaningful paths are tested", not 100%

Chasing the last 5% of coverage produces brittle tests over edge-case code that nobody cares about. Spend the time on tests that catch real regressions.

### 6.4 The `yarn test:coverage` command

Runs Vitest with `@vitest/coverage-v8` (already in dependencies). Add coverage as a CI gate per the floors above once the suite is large enough.

---

## 7. Flaky test policy — zero tolerance

A test that fails intermittently is a bug, not a nuisance.

### 7.1 The deadline

- **24 hours** to quarantine (mark `.skip` with a tracking ticket).
- **7 days** to fix or delete.

### 7.2 Why the deadline matters

Once a team accepts flakes, the suite dies. Every flake makes the next failure easier to dismiss ("probably flaky"). The signal-to-noise ratio collapses, real failures get ignored, the suite stops being trusted, the team stops writing tests.

Guard against this actively — flake reports are first-priority bugs.

### 7.3 Common causes

- Shared state between tests (see § 3)
- Real I/O without proper teardown
- Timing assumptions (`setTimeout`, polling)
- Test order dependency
- Race conditions in the code under test (test exposed a real bug — fix the code)

---

## 8. Snapshot tests

### 8.1 Use for

- Small structured output that's deterministic
- Error response shapes
- Resource serialization output (small ones)

### 8.2 Don't use for

- Large objects (the diff becomes unreadable; reviewers rubber-stamp)
- Non-deterministic output (timestamps, generated ids — stub them first or omit)
- HTML / large strings (use targeted string assertions instead)

### 8.3 Update with care

`vitest -u` regenerates snapshots. **Read every line of the diff before committing the update.** A blind `-u` is how silent regressions land.

---

## 9. Contract tests

### 9.1 What and why

For any external integration whose shape might drift (third-party API, partner webhook):

- **Provider contract** — what we send, what we expect back
- **Consumer contract** — what they send us, what we expect to handle

Run against a recorded fixture in CI (fast, deterministic). Run against the real endpoint in a nightly job — if their API drifts, you catch it within 24h instead of in production.

### 9.2 Where they live

Co-located with the integration: `src/app/payments/clients/stripe-client.contract.spec.ts`.

---

## 10. File layout

```
src/app/orders/services/
  place-order.service.ts
  place-order.service.spec.ts       ← unit test, mocks repository
  place-order.service.integration.spec.ts  ← integration, real DB
```

- `.spec.ts` — default suffix; covers unit tests
- `.integration.spec.ts` — when the test needs real I/O (DB, queue)
- `.e2e.spec.ts` — full-system journey tests (sparse; one per critical flow)

Tests live next to the file under test, always. Never in a separate `__tests__/` or `test/` folder — colocation makes the link obvious and survives refactors.

---

## 11. Review checklist

Before merging a change that should include tests (testing enabled — see § 0):

- [ ] Every new/changed **service** has a co-located `.service.spec.ts`
- [ ] Every new/changed **HTTP controller / request handler** has a test (unit with mocked services, or integration through the route)
- [ ] New public function has at least one test
- [ ] Branches / error paths / edge cases covered
- [ ] No real provider API hit in tests (use `MockSDK` for AI, mock HTTP clients otherwise)
- [ ] Integration tests use testcontainers, not mocked DBs
- [ ] AAA structure, blank-line phase separation
- [ ] One assertion target per test (where practical)
- [ ] No `await sleep(...)` — fake timers instead
- [ ] No shared mutable state between tests
- [ ] Test names describe behaviour, not implementation
- [ ] No `.only`, no `.skip` without a tracking ticket
- [ ] Snapshots reviewed line-by-line if updated
- [ ] `yarn test --run` passes; `yarn test:coverage` doesn't drop the floor
