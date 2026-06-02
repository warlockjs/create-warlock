---
name: module-boundaries
description: 'Architecture rules for how modules under `src/app/**` relate — each module owns one domain noun (`orders`, `users`, `carts`, `payments`); standard layout per module (`controllers/`, `services/`, `models/<noun>/`, `repositories/`, `schema/`, `resources/`, `types/`, `utils/`, `events/`, `errors/`, `routes.ts`); public surface exposed through sub-folder barrels (`services/index.ts`, `utils/index.ts`, `types/index.ts`) — NEVER a module-root `index.ts` re-exporting everything; no module reaches into another module''s internal files; zero circular dependencies between modules; inter-module communication is explicit — direct service call OR `@mongez/events` bus, never shared mutable globals; cross-cutting helpers live in `src/app/shared/`. Triggers: adding a new module under `src/app/**`; importing from another module; deciding where new code belongs; circular import error; ESLint `import/no-restricted-paths` violation; user asks "can module A use module B''s internals", "how should modules talk", "where should this code live", "I''m getting a circular dependency", "what folders does a module need", "what goes in shared". Skip: intra-module file organization (load `skills/code-standards/SKILL.md` § 4); barrel mechanics within a module (load `skills/code-standards/SKILL.md` § 2.2); deploying / packaging / monorepo questions; framework primitive details — load relevant `@warlock.js/*` skill.'
---

# Module boundaries

**Status:** Stable
**Applies to:** Every module under `src/app/**` and every import that crosses between modules.

A module is a unit of substitution. If two modules are tangled, you can't refactor either without touching both. These rules keep modules independent enough that any one can be rewritten, extracted, or deleted with a contained blast radius.

> **Sub-agent rule:** Before adding a new module or importing across modules, read this file.

---

## 1. One domain noun per module

### 1.1 The rule

A module is named after the noun it owns: `users`, `orders`, `carts`, `payments`, `ai-models`, `chats`. Lowercase, kebab-case, plural.

### 1.2 If the name needs an "and", split it

`orders-and-payments/` is two modules. So is `users-and-auth/`. Each gets its own folder.

### 1.3 Cross-cutting concerns live in `shared/`

Auth helpers, logging adapters, enum definitions, router utilities — anything used by more than one domain module — lives in `src/app/shared/`. The existing `src/app/shared/{enums.ts, get-random-color.ts, locales.ts, router.ts, ...}` is the pattern.

### 1.4 Match modules to domain boundaries

If the business has an "orders team" and a "payments team", you probably have an `orders` module and a `payments` module — not one `commerce` module. Module boundaries should mirror who owns the code and who gets paged when it breaks.

---

## 2. Standard module layout

Every module follows this folder shape. Not every folder is required — only the ones the module actually uses.

```
src/app/<module>/
  controllers/              ← HTTP handlers (one per endpoint)
    <verb>-<noun>.controller.ts
  services/                 ← business logic (one per use case)
    index.ts                ← sub-folder barrel ✅
    <verb>-<noun>.service.ts
  models/
    <noun>/                 ← model folder (Cascade convention)
      <noun>.model.ts
      index.ts
      migrations/
        <timestamp>-<noun>.migration.ts
  repositories/             ← Cascade RepositoryManager subclasses
    <nouns>.repository.ts
  schema/                   ← seal schemas (v.object + Infer<>), value + type per file
    <verb>-<noun>.schema.ts
  resources/                ← output mappers (defineResource)
    <noun>.resource.ts
  types/                    ← TypeScript types and enums
    index.ts                ← sub-folder barrel ✅
    <noun>-status.type.ts
  utils/                    ← pure helpers used inside the module
    index.ts                ← sub-folder barrel ✅
    <verb>-<noun>.ts
  events/                   ← if the module emits events
    <noun>-<verb>.event.ts
  errors/                   ← custom error classes
    <noun>-not-found.error.ts
  routes.ts                 ← the module's route registrations
  README.md                 ← module purpose, public surface, ownership
```

### 2.1 Empty folders are fine to omit

Don't create `events/` if the module emits nothing. Don't create `errors/` until you have an error to put there. The layout is a vocabulary, not a checklist.

### 2.2 No module-root `index.ts`

This is the one absolute rule:

```
❌ src/app/orders/index.ts                ← banned
✅ src/app/orders/services/index.ts        ← good (sub-folder barrel)
✅ src/app/orders/utils/index.ts           ← good
✅ src/app/orders/types/index.ts           ← good
```

See `skills/code-standards/SKILL.md` § 2.2 for the reasoning.

---

## 3. Public vs private surface

### 3.1 Public (importable from other modules)

- `src/app/<module>/services` (the sub-folder barrel)
- `src/app/<module>/utils` (the sub-folder barrel)
- `src/app/<module>/types` (the sub-folder barrel)
- `src/app/<module>/resources/<noun>.resource.ts`
- `src/app/<module>/models/<noun>` (the model folder — for `BelongsTo("Name")` registrations and typed references)
- `src/app/<module>/errors/<noun>-<reason>.error.ts`

### 3.2 Private (not importable from other modules)

- `src/app/<module>/controllers/*` — controllers serve HTTP; nobody else should call them
- `src/app/<module>/repositories/*` — repositories are a service-internal detail; other modules go through services
- `src/app/<module>/schema/*` — schemas belong to the endpoint that uses them
- `src/app/<module>/routes.ts` — registers routes for the framework, nobody imports it

### 3.3 Enforce with ESLint

Add `eslint-plugin-import/no-restricted-paths` rules:

```js
// eslint.config.js — proposed addition
{
  rules: {
    "import/no-restricted-paths": ["error", {
      zones: [
        { target: "src/app/*/controllers", from: "src/app/*/controllers", except: ["./"] },
        { target: "src/app", from: "src/app/*/repositories", except: ["./*/services"] },
        { target: "src/app", from: "src/app/*/schema", except: ["./*/controllers"] },
      ],
    }],
  },
}
```

The exact rule shape depends on the eslint config — but the principle is: cross-module imports go through services / utils / types / resources / models / errors, never through the private folders.

---

## 4. No reaching across module internals

```typescript
// ✅ public surface — the module's barrel
import { listUsersService } from "app/users/services";

// ✅ public — a typed type
import { type User } from "app/users/types";

// ✅ public — model class for relations
import { User } from "app/users/models/user/user.model";

// ❌ private — repository is service-internal
import { usersRepository } from "app/users/repositories/users.repository";

// ❌ private — controller is HTTP-internal
import { listUsersController } from "app/users/controllers/list-users.controller";
```

If you find yourself needing another module's internals, the boundary is wrong. Either:

- The internal API should be promoted to public (add a service that exposes it).
- The functionality belongs in `shared/`.
- The two modules should be merged.

---

## 5. Zero circular dependencies

### 5.1 What a cycle looks like

`app/orders` imports `app/users/services`, and `app/users` imports `app/orders/services`. Even one level deep, this is a cycle.

### 5.2 Why it's banned

- Runtime import-order bugs that only surface in production
- Refactor blast radius: changing either module forces changes in both
- Module-level reasoning breaks down — you can't think about either in isolation

### 5.3 The fix

Almost always: extract the shared concept into a third module.

```
❌  orders ↔ users        (cycle)
✅  orders → users-shared  ← shared types / events
    users  → users-shared
```

Or, if the shared concept is purely cross-cutting (not a domain), it goes to `app/shared/`.

### 5.4 Detect in CI

`eslint-plugin-import/no-cycle` catches cycles at lint time. Enable it.

---

## 6. Inter-module communication

### 6.1 Direct call — when you need a result

`app/orders` needs the user's name to format an order confirmation: import `getUserService` from `app/users/services`, call it, use the result.

This is the default. Most inter-module communication is direct calls.

### 6.2 Event bus — when you don't need a result

`app/orders` finishes placing an order; `app/notifications` wants to send a confirmation email; `app/analytics` wants to log the event. None of those need to block the order-placement flow, and orders shouldn't know about either.

Use `@mongez/events`:

```typescript
// ✅ orders module emits
import { events } from "@mongez/events";
events.trigger("order.placed", { orderId, userId });

// ✅ notifications module listens
events.subscribe("order.placed", async ({ orderId, userId }) => {
  await sendOrderConfirmationEmail(userId, orderId);
});
```

### 6.3 Pick rule

- "I need a result" → direct service call
- "Interested parties may want to know" → event
- "I need both" → direct call for the result + emit event for the others

### 6.4 Never shared mutable globals

```typescript
// ❌
// app/orders/state.ts
export let currentOrderCount = 0;

// app/dashboard/services/get-stats.service.ts
import { currentOrderCount } from "app/orders/state";
```

Top-level mutable exports across modules are the worst kind of coupling — invisible, untyped, untestable. Always go through a service or an event.

---

## 7. Where shared code lives

| If the code is...                       | Put it in                                     |
| --------------------------------------- | --------------------------------------------- |
| Used by 2+ modules, stable, cross-domain | `src/app/shared/`                            |
| Used by 2+ modules, domain-specific      | Extract a new domain module                   |
| Used by exactly 1 module                 | Stays inside that module's `utils/`           |
| Third-party integration glue (SDK wrappers) | `src/app/shared/` (or a dedicated module)  |
| Build-time config                        | `src/config/` (one file per concern)          |

### 7.1 Promotion to `shared/` is a deliberate choice

If a util is duplicated across two modules, that's a signal — but the right answer isn't always "move to shared". Sometimes the two utils have drifted intentionally; sometimes one module is about to absorb the other. Promote only when the abstraction is genuinely stable.

### 7.2 `shared/` is not a junkyard

Every file in `shared/` has a clear single purpose. If `shared/utils/` grows past ~20 files, split it by concern (`shared/strings/`, `shared/dates/`, etc.) before it becomes the codebase's attic.

---

## 8. Adding a new module — the checklist

When you create a new module:

1. **Pick the noun.** Single domain concept. Lowercase, kebab-case, plural.
2. **Create the folder.** `mkdir src/app/<noun>`.
3. **Add `README.md`** at the module root. One paragraph: what the module owns, who owns the code, public surface.
4. **Scaffold only what you need.** Don't pre-create `events/` and `errors/` if you won't use them today.
5. **Add sub-folder barrels** only where you have 2+ files. A single service doesn't need a `services/index.ts` yet — but it will the moment a second service lands.
6. **Wire `routes.ts`** for any HTTP endpoints, register events for any emitted signals.
7. **Verify no module-root `index.ts`** was created.

---

## 9. Review checklist

Before merging a change that adds, restructures, or imports across modules:

- [ ] New module is named after a single domain noun
- [ ] Standard folder layout from § 2 (only the folders the module needs)
- [ ] No module-root `index.ts` created
- [ ] Sub-folder barrels exist for `services/`, `utils/`, `types/` where applicable
- [ ] No imports from another module's `controllers/`, `repositories/`, `schema/`
- [ ] No circular imports between modules (ESLint `no-cycle` clean)
- [ ] Cross-module communication uses direct service call or `@mongez/events` — never shared mutable globals
- [ ] Shared code that's used by 2+ modules lives in `src/app/shared/`, not duplicated
- [ ] Module has a `README.md` describing purpose, public surface, and ownership
