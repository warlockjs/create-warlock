---
name: code-standards
description: 'Project-level TypeScript code standards for apps built on Warlock.js — `interface` vs `type`, access modifiers, no `any`, no inline-duplicated unions, file-naming suffixes (`.contract.ts` / `.type.ts` / `.service.ts` / `.model.ts` / `.resource.ts` / `.spec.ts`), single-responsibility files, FP-factory + internal-class pattern, brace-every-control-block readability with blank lines between consecutive blocks, JSDoc on public surface and non-obvious logic, error classes extending framework errors, async/await + `Promise.all`, `undefined` over `null`, Vitest co-located, ESLint + Prettier. Triggers: writing/editing any `.ts` / `.tsx` file in this project; user asks "what are the code standards / style rules / conventions"; spawning a sub-agent that will write code; reviewing a diff for style issues; deciding `interface` vs `type`, when to use a class, where helpers live, how to name a file, or whether something needs JSDoc. Skip: pure-Markdown / JSON / YAML edits with no code change; runtime / behavior questions about a specific framework primitive — load the relevant `@warlock.js/<pkg>` skill instead; package-publishing or CI workflow questions.'
---

# Code Standards

**Status:** Stable
**Applies to:** All TypeScript in this project — services, models, resources, modules, app code, scripts.

> **Sub-agent rule:** Before writing any code, read this file end-to-end and apply every rule. When spawning a sub-agent that will write code, prepend: _"First, read `skills/code-standards/SKILL.md` and apply every rule."_

The bar is **senior-level clean code**. Not "it compiles" — code that the next person on this codebase can read in one pass.

---

## 1. TypeScript

### 1.1 `interface` for contracts, `type` for data

- `interface` describes a **contract** — anything with methods, anything a class implements, anything that holds actions.
- `type` describes a **data shape** — plain objects, unions, tuples, mapped types, discriminated unions.

```typescript
// ✅ contract — has behaviour
export interface PaymentGateway {
  readonly name: string;
  charge(amount: number, token: string): Promise<ChargeResult>;
}

// ✅ data shape
export type ChargeResult = {
  id: string;
  status: "succeeded" | "failed";
  amount: number;
};

// ❌ don't use interface for plain data
export interface ChargeResult {
  id: string;
  status: "succeeded" | "failed";
  amount: number;
}
```

### 1.2 Access modifiers on every class member

Never omit `public` / `private` / `protected`. Explicit is faster to read than inferring.

```typescript
// ✅
export class CartService {
  public readonly currency: string;
  private items: CartItem[] = [];
  public add(item: CartItem) { /* ... */ }
}

// ❌
export class CartService {
  readonly currency: string;     // missing public
  items: CartItem[] = [];        // missing private
  add(item: CartItem) {}         // missing public
}
```

### 1.3 No `any`

Never. Use `unknown` when the type is genuinely unknown and narrow at the boundary. If you reach for `any`, you've skipped a design decision.

### 1.4 No inline-duplicated unions or literals

If a union appears in more than one place, extract it to a named exported type once.

```typescript
// ✅
export type OrderStatus = "pending" | "paid" | "shipped" | "cancelled";

export type Order = { status: OrderStatus; /* ... */ };
export type OrderEvent = { status: OrderStatus; /* ... */ };

// ❌ inline duplication — changing the set means N edits and N chances to miss one
export type Order = { status: "pending" | "paid" | "shipped" | "cancelled"; /* ... */ };
export type OrderEvent = { status: "pending" | "paid" | "shipped" | "cancelled"; /* ... */ };
```

### 1.5 Constrain generics

Open generics are almost always wrong. If `T` has a contract, declare it.

```typescript
// ✅
export function publish<T extends DomainEvent>(event: T): void { /* ... */ }

// ❌
export function publish<T>(event: T): void { /* ... */ }
```

### 1.6 Prefer `undefined` for "absent"

Use `undefined` everywhere — optional properties, optional parameters, "not found" returns. Optional chaining (`?.`) and default values (`??`) compose naturally with `undefined`. Use `null` **only** when an external API hands you `null` (e.g. a database driver, a third-party SDK) and convert at the boundary.

```typescript
// ✅
export type User = { id: string; phone?: string };
function find(id: string): User | undefined { /* ... */ }

// ❌ mixed
export type User = { id: string; phone: string | null };
```

---

## 2. Imports

### 2.1 Use the project's path aliases, not deep relatives

The project ships a `tsconfig.json` path alias for the app root — `app/*` → `src/app/*`. Use it for every cross-module import. If you see `../../../../something` in an import, you're bypassing it.

```typescript
// ✅
import { listUsersService } from "app/users/services";
import { OrderStatus } from "app/orders/types/order.type";

// ❌
import { listUsersService } from "../../users/services";
```

### 2.2 Barrel files — sub-folder level, not module level

Barrels (`index.ts`) make a module easier to consume **at the sub-folder level** — `services/`, `utils/`, `types/`. They become a problem when you put one at the **module root** and turn it into a giant re-export of everything inside.

The right shape:

```
✅ app/users/services/index.ts         ← barrels each service file
   app/users/services/list-users.service.ts
   app/users/services/create-user.service.ts
   app/users/utils/index.ts            ← barrels each util
   app/users/types/index.ts            ← barrels each type

❌ app/users/index.ts                  ← module-root barrel re-exporting everything
```

Imports stay short and intent-revealing:

```typescript
// ✅ targeted — reader knows it's a service
import { listUsersService } from "app/users/services";
import { formatUserName } from "app/users/utils";

// ❌ everything-from-everywhere
import { listUsersService, formatUserName, User } from "app/users";
```

The module-root barrel is the one that causes circular imports and tree-shaking misses. Sub-folder barrels are safe because they only group siblings of the same role.

### 2.3 No file extension in import paths

Always bare: `from "./order.service"`, never `from "./order.service.ts"` or `.js`.

---

## 3. File naming

| Suffix         | Purpose                              | Example                |
| -------------- | ------------------------------------ | ---------------------- |
| `.contract.ts` | Interface only (blueprint)           | `payment.contract.ts`  |
| `.type.ts`     | Types only (data shapes)             | `order.type.ts`        |
| `.service.ts`  | Service class                        | `cart.service.ts`      |
| `.model.ts`    | Domain model class                   | `user.model.ts`        |
| `.resource.ts` | Output mapper (model → wire format)  | `order.resource.ts`    |
| `.spec.ts`     | Co-located test for a sibling `.ts`  | `cart.service.spec.ts` |

**One primary export per file.** If a `.contract.ts` also defines closely-related data types used only by that contract, that's fine — but the primary export is the interface.

---

## 4. Code organization

### 4.1 One responsibility per file, class, and function

If the file's description needs an "and", split it. The same goes for classes and functions. A 300-line service that handles orders **and** sends emails **and** writes audit logs is three files.

**File-level SRP.** If a file has more than one top-level helper that isn't a direct implementation detail of the main export, extract helpers into a `utils/` folder — one helper per file. The main file imports from leaf paths.

```
❌ cart.service.ts holds CartService + calculateTax + formatLineItem + applyDiscount
✅ cart.service.ts holds CartService only
   utils/calculate-tax.ts
   utils/format-line-item.ts
   utils/apply-discount.ts
```

### 4.2 Public API is functional, classes are an implementation detail

The default shape of a public primitive is a **factory function returning a plain object**. Users of your service never call `new`.

Reach for a `class` in exactly three cases:

1. **Long-lived state across calls.** A client, a cache, a connection pool. Example: a `PaymentClient` that owns an HTTP connection and an auth token for its lifetime.
2. **Per-call state across phases.** A single operation has 4+ phases that share mutable state (intermediate results, accumulated errors, events). Instantiate fresh per call inside the factory; keep the class unexported.
3. **Immutable builder pattern.** A value type whose methods each return a new snapshot of itself. The class gives you prototype method sharing and `instanceof` narrowing. Still front it with a factory so callers never see `new`.

If state fits in local variables of a single function, **don't make a class** — a closure is cleaner.

```typescript
// ✅ public factory, internal class for per-call phases
export function placeOrder(config: OrderConfig) {
  return {
    async execute(input: OrderInput) {
      return new PlacementRun(config, input).run();
    },
  };
}

class PlacementRun {
  private items: ResolvedItem[] = [];
  private total = 0;
  public async run(): Promise<OrderResult> { /* ... */ }
  private async validate(): Promise<void> { /* ... */ }
  private async charge(): Promise<void> { /* ... */ }
}
```

### 4.3 No single-file folders

Never create a folder to hold one file and an `index.ts` that re-exports it. Put the file in the parent.

```
❌ src/services/cart/cart.service.ts
   src/services/cart/index.ts        ← only re-exports
✅ src/services/cart.service.ts
```

A folder earns its keep at **two or more related files**.

### 4.4 Readability beats terseness

Code is read far more than it's written. Optimize for the reader.

- **Always brace.** Never single-line `if (x) doIt();`, never braceless bodies, never inline for-loop bodies. The one exception: a guard clause that ends the function — `if (!user) return;` is fine on a single line.
- **Full, descriptive identifiers.** No cryptic abbreviations. Write `systemPrompt`, `tripIndex`, `request`, `response`, `error`, `message`, `tool`. Not `sp`, `i`, `req`, `res`, `err`, `msg`, `t`. This includes arrow-function parameters — `.find((tool) => ...)`, never `.find((t) => ...)`. Local scope isn't a license to abbreviate — the reader has the **least** context locally.
- **One statement per line.** No chaining three actions onto a single `if`. No packing two branches into a ternary when `if/else` reads clearer.
- **Avoid deeply nested ternaries.** If a ternary wraps or has three branches, rewrite as `if/else`.
- **One class per file.** Always.

### 4.5 Blank lines separate consecutive logical blocks

Consecutive control structures (`if`, `for`, `while`, `try`, `switch`) **are not a wall** — each one is its own logical step. Put a blank line **between** them.

```typescript
// ❌ wall — hard to scan
if (!user) {
  return notFound();
}
if (!user.verified) {
  return forbidden();
}
for (const item of items) {
  await process(item);
}

// ✅ each block breathes
if (!user) {
  return notFound();
}

if (!user.verified) {
  return forbidden();
}

for (const item of items) {
  await process(item);
}
```

Same rule inside a function — put a blank line before a `return` and between phases that "finish a thought" (e.g. a `.push()` that ends an accumulation step before the next phase begins). Don't over-apply it inside a single block — code inside one `if` body usually doesn't need internal blank lines.

### 4.6 Comments — default to none

Identifiers carry the meaning. Add a comment only when the **why** is non-obvious: a hidden constraint, a subtle invariant, a workaround for a bug elsewhere. **Never** describe what the code does — if the reader can't see it from the code, the code is the problem.

```typescript
// ❌ noise
// Loop over items
for (const item of items) { /* ... */ }

// ✅ the WHY isn't obvious from the code
// Stripe returns idempotency_key on retry but not on first call —
// fall back to the order id so downstream dedup still works.
const key = response.idempotency_key ?? order.id;
```

### 4.7 Pure helpers live outside classes

If a function doesn't touch the class's state and isn't part of the class's interface, it's not a method. Move it to a sibling utility file. Methods are for behaviour that operates on the instance.

---

## 5. Errors

### 5.1 Extend framework error classes

Never throw bare `Error`. Every project error extends a framework error so the dispatcher, logger, and HTTP layer can classify it correctly. Match the closest base — `HttpError` for request-failure cases, a domain root for business-rule violations.

Define the class once, then throw it from the call site by name — the type itself carries the meaning.

```typescript
// ✅ define
import { HttpError } from "@warlock.js/core";

export class CartLockedError extends HttpError {
  public readonly statusCode = 409;
  public constructor(public readonly cartId: string) {
    super(`Cart ${cartId} is locked`);
  }
}

// ✅ throw — the class name is the error code, the message stays useful
import { CartLockedError } from "app/cart/errors/cart-locked.error";

if (cart.isLocked) {
  throw new CartLockedError(cart.id);
}

// ❌ bare Error — no status code, no type to catch, no classification
throw new Error("cart locked");
```

### 5.2 Handle at boundaries, not in the middle

Wrap a `try / catch` only at system boundaries — an HTTP handler, a queue consumer, a CLI entry point — or when you're **enriching** the error with context before re-throwing. Internal function calls should let errors propagate; the boundary catches once and decides the response.

### 5.3 Never swallow

A bare `catch {}` or `catch (e) { console.log(e); }` is a bug, not error handling. If you can't recover, re-throw. If you can recover, log the cause and continue with an explicit fallback value.

---

## 6. Async

### 6.1 Parallelize independent awaits

Two independent async calls in a row is two round-trips. Use `Promise.all`.

```typescript
// ❌ serial — twice the latency for no reason
const user = await loadUser(id);
const orders = await loadOrders(id);

// ✅ parallel
const [user, orders] = await Promise.all([loadUser(id), loadOrders(id)]);
```

### 6.2 Pass `AbortSignal` where supported

If a framework call (HTTP, AI, queue) accepts a signal, plumb one through. Long-running operations that ignore cancellation leak resources on user disconnect.

### 6.3 No floating promises

Every promise is either awaited, returned, or explicitly `.catch()`'d. A "fire and forget" call that throws will crash the process or vanish silently — both bad.

```typescript
// ❌
sendWelcomeEmail(user);  // floating — if it rejects, you'll never know

// ✅
await sendWelcomeEmail(user);

// ✅ deliberate fire-and-forget with logged failure
sendWelcomeEmail(user).catch((error) => logger.error("welcome-email-failed", error));
```

---

## 7. Documentation (JSDoc)

Project-level JSDoc is **lighter** than framework-package JSDoc — the audience already knows the codebase. JSDoc earns its place when it tells the reader something the code can't.

### 7.1 Required

- **Every exported function, class, and type that crosses a module boundary.** One-line purpose, plus `@example` if the call shape isn't obvious.
- **Every class with more than one public method.** A class-level block stating the role and what it owns / doesn't own. Don't make the next reader infer the architecture from method bodies.
- **Any function whose logic isn't obvious from its name.** Regex, state machines, multi-branch business rules, performance-driven code, anything with a non-obvious constraint.

### 7.2 Not required

- Private and protected methods, unless the **why** is non-obvious.
- Trivial getters, setters, and one-line helpers.
- Internal functions whose name and signature already say everything.

### 7.3 Purpose, not restatement

The first line states the **role** — what this thing is for, not what its name already says.

```typescript
// ❌ adds nothing
/** Builds the message list. */
private buildMessages(): void { /* ... */ }

// ✅ explains the role and the position in the flow
/**
 * Resolve the system prompt, prepend history, append the user input.
 * Produces the initial messages array sent on the first trip. Runs once
 * per execution before the trip loop starts.
 */
private buildMessages(): void { /* ... */ }
```

---

## 8. Logging

Use the `log` singleton from `@warlock.js/logger`. Never `console.log` in committed code.

Every call has the same shape — **`module`**, **`action`**, **`message`**, optional **`context`**:

```typescript
import { log } from "@warlock.js/logger";

// ✅ four arguments — module, action, message, context
log.success("orders", "order-placed", "Order has been created successfully", {
  orderId,
  userId,
  total,
});

log.error("payments", "charge", new Error("Card declined"), { userId, attemptId });

// ❌ interpolated string — unstructured, can't be queried
log.info(`Order ${orderId} placed for user ${userId} totaling ${total}`);

// ❌ wrong arity — missing module/action
log.info("order-placed", { orderId, userId, total });
```

**Five levels** — `debug`, `info`, `warn`, `error`, `success`. Pick the one that matches the event semantics. `success` is its own level (not a flavour of `info`) — use it for explicit completions a human cares about.

**Other rules:**

- Log at boundaries (request in, request out, error caught) — not every internal step.
- **Redact at the source.** Tokens, passwords, credit card numbers, personal identifiers never appear in log context. Configure redaction once via `log.configure({ redact: ... })` — see `@warlock.js/logger/redact-sensitive-log-fields/SKILL.md`.
- `module` is the area of the app (`"orders"`, `"auth"`, `"payments"`), `action` is the verb-noun event (`"order-placed"`, `"login-failed"`, `"refund-issued"`). Both are searchable indexes — keep them consistent across the codebase.

---

## 9. Non-negotiable defaults

Senior-team baseline rules. Each one prevents a real class of bug or incident. Each one is short because each one is unconditional. Deeper coverage lives in sibling skills — `skills/security-baseline/`, `skills/data-and-persistence/`, `skills/api-design/`, `skills/observability-and-resilience/`.

### 9.1 Validate untrusted input at the boundary

Every input from outside the process — request body, query params, headers, file uploads, env vars, queue messages, webhook payloads — is validated against a schema before any code consumes it. TypeScript types are runtime lies; only a validator gives you actual guarantees.

Use `@warlock.js/seal`. Schemas live in the module's `schema/` folder, exported alongside the inferred type.

```typescript
// ✅ schema + inferred type — colocated, single source
import { v, type Infer } from "@warlock.js/seal";

export const createOrderSchema = v.object({
  cartId: v.string(),
  paymentToken: v.string(),
});

export type CreateOrderSchema = Infer<typeof createOrderSchema>;

// ❌ trust the type — no runtime check, any payload passes
const input = request.body as CreateOrderSchema;
```

Validation runs once at the route boundary; everything inward consumes the typed result. See `skills/security-baseline/SKILL.md` for the full input-trust model.

### 9.2 Money is integer minor units, time is UTC at rest

- **Money:** integer cents (or the currency's smallest unit). Never a `number` field for prices, totals, balances, refunds. Floats break the first time you sum them.
- **Time:** store UTC in the database, work in UTC across services, convert to the user's timezone **only** at the response layer.

```typescript
// ✅
type Order = { totalCents: number; placedAtUtc: Date };

// ❌
type Order = { total: number; placedAt: string };  // float money, ambiguous tz
```

See `skills/data-and-persistence/SKILL.md`.

### 9.3 IDs in URLs are opaque

Use UUIDs or nanoids for any identifier that crosses a process boundary — URLs, response bodies, log lines, webhooks. Never expose sequential primary keys: they leak business volume (anyone can tell `/orders/1042` means you've placed 1042 orders) and invite enumeration attacks.

Sequential keys are fine as internal database primary keys. They just don't leave the database.

### 9.4 Every external call has a timeout

HTTP, AI, queue, database driver — every call to something outside this process has an explicit timeout. No timeout = a slow dependency takes down the whole service.

`@warlock.js/http` accepts `timeout` per request and `timeout` per `Http` instance. Set a default at the instance level; override per request when a specific endpoint needs more.

See `skills/observability-and-resilience/SKILL.md`.

### 9.5 Idempotency keys for external side effects

Payments, emails, webhook deliveries, third-party charges — any operation whose accidental retry could double-charge a customer or send a duplicate notice needs an idempotency key. Generate the key at the call site, store the result keyed by the idempotency key, return the stored result on retry.

This is the difference between "the network blipped" and "the customer got billed twice".

### 9.6 One response envelope across the project

Every HTTP response in the project uses the same shape — success and failure both. Pick once, document in `skills/api-design/SKILL.md`, use everywhere. The moment this rule lands, the frontend stops writing per-endpoint special cases.

### 9.7 Config validated at boot, no scattered `process.env`

Every environment variable is read through `env()` inside a `src/config/*.ts` file — one typed config object per concern (`app`, `database`, `mail`, …), each with a sensible default. App code never touches `process.env.X`; it reads resolved values through the `config` accessor from `@warlock.js/core`.

```typescript
// ✅ src/config/app.ts — env() with defaults, typed config object
import { env, type AppConfigurations } from "@warlock.js/core";

const appConfig: AppConfigurations = {
  appName: env("APP_NAME", "Warlock"),
  baseUrl: env("BASE_URL", "http://localhost:2030"),
};

export default appConfig;

// ✅ read a resolved value anywhere via the config accessor
import { config } from "@warlock.js/core";

const appName = config.key<string>("app.appName");
const database = config.get("database"); // whole typed group

// ❌ scattered, unvalidated process.env reads in app code
const url = process.env.BASE_URL;
```

A secret with no safe default (a payment key, a signing secret) should fail loudly at boot — give the config file an explicit guard rather than letting a missing value surface three hours in on the first request.

---

## 10. Testing

- **Vitest**, co-located: `cart.service.ts` → `cart.service.spec.ts` in the same folder.
- **Test the public surface.** If a private method needs testing, the public method that calls it does — test through it. If you can't reach the behaviour from outside, it shouldn't exist.
- **Arrange / Act / Assert** structure per test. Blank lines between phases. One assertion target per test where practical.
- **Mock at the boundary.** Use `MockSDK` from `@warlock.js/ai` for AI calls. Mock HTTP at the HTTP client level, not deep inside services.
- **Don't snapshot large objects.** Assert specific fields. A snapshot diff with 200 lines of noise hides the regression you actually care about.

---

## 11. Tooling

Ship a `.eslintrc` with at least these rules on:

- `@typescript-eslint/explicit-member-accessibility` — enforces § 1.2
- `@typescript-eslint/no-explicit-any` — enforces § 1.3
- `@typescript-eslint/consistent-type-definitions` — supports § 1.1
- `@typescript-eslint/no-floating-promises` — enforces § 6.3
- `@typescript-eslint/await-thenable`
- `curly` — enforces braces (§ 4.4)
- `no-console` — enforces § 8

Match the project's `.prettierrc` exactly. If two configs are present and disagree, the one closer to the file wins (Prettier's resolution order). Don't fight the formatter — configure it, then trust it.

---

## 12. Review checklist

Before any change ships:

**Craft**
- [ ] All class members have access modifiers
- [ ] No `any`
- [ ] No inline-duplicated unions or literal sets
- [ ] `interface` for contracts, `type` for data
- [ ] File suffix matches content
- [ ] Imports use project path aliases, not deep relatives
- [ ] No module-root barrels, no single-file folders
- [ ] Blank lines separate consecutive control blocks
- [ ] No floating promises, no swallowed catches
- [ ] Errors extend framework error classes
- [ ] JSDoc on every public export and every multi-method class
- [ ] No `console.log`, `log.<level>(module, action, message, context)` signature used correctly
- [ ] Tests co-located, public-surface-driven
- [ ] `tsc --noEmit` and `eslint` pass clean

**Non-negotiable defaults**
- [ ] Every untrusted input has a `@warlock.js/seal` schema at the boundary
- [ ] Money fields are integer minor units, time stored as UTC
- [ ] IDs exposed in URLs are opaque (UUID / nanoid)
- [ ] Every external call (HTTP, AI, queue, DB) has an explicit timeout
- [ ] External side effects (payments, emails, webhooks) use idempotency keys
- [ ] Response shape matches the project's canonical envelope
- [ ] No `process.env.X` outside the config module
