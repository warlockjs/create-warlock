---
name: data-and-persistence
description: 'How this project models, stores, and migrates data with `@warlock.js/cascade` — money as integer minor units (`total_cents`, `amount_cents`) with `currency` alongside, time as UTC `Date` columns named `<verb>_at` (e.g. `synced_at`, `checked_out_at`, `abandoned_at`), opaque IDs in URLs (UUID / nanoid), audit columns auto-managed by the framework (`created_at` / `updated_at`), soft-delete via cascade''s delete strategy (`@warlock.js/cascade/configure-delete-strategy/SKILL.md`), schemas defined with `v.object` and inferred into `Infer<>` types, models declared via `@RegisterModel()` + `Model<Schema>` + typed getters (`this.get<T>(key, default)`), migrations via `Migration.create(Model, {...columns}, { unique })` with column types `text() / integer() / double() / bool() / json() / arrayText()`, relations via `@BelongsTo("Name")` and `@HasMany("Name")`, snake_case columns + camelCase getters. Triggers: defining a model / schema / cascade blueprint; writing a migration; choosing a column type for currency, prices, totals, balances, refunds, fees; choosing how to store a timestamp / date; deciding ID format; adding audit columns; designing soft-delete vs hard-delete; defining relations (BelongsTo, HasMany); user asks "how do we store money", "UTC vs local time", "what ID format do we use", "should this be soft-deleted", "migration rules", "BelongsTo vs HasMany", "what does the model look like", "how do I add a column". Skip: API response shape (load `skills/api-design/SKILL.md`); query performance / N+1 / caching (load `skills/observability-and-resilience/SKILL.md`); pure business-logic refactors with no schema change; framework primitive deep-dive — load the relevant `@warlock.js/cascade/*` skill (define-model, paginate-results, configure-delete-strategy, etc.).'
---

# Data & persistence

**Status:** Stable
**Applies to:** Every model, schema, migration, and persisted entity in `src/app/**`.

How we store data so it survives a year of new requirements, a currency conversion bug, and a timezone-aware feature request. Framework mechanics live in `@warlock.js/cascade/skills/*` — this skill is the **project-level conventions** layered on top.

> **Sub-agent rule:** Before writing any model, schema, or migration, read this file.

---

## 1. Money — integer minor units, always

### 1.1 The rule

- Store money as **integers in the currency's smallest unit** — cents for USD, halalas for SAR.
- Column name carries the unit: `total_cents`, `amount_cents`, `fee_cents`, `discount_cents`.
- A `currency` column lives next to every money column (or once per row if the entity is mono-currency).

The Cart model is the project's canonical example:

```typescript
// ✅ from cart.model.ts
export const cartSchema = v.object({
  /* ... */
  total_cents: v.number().default(0),
  total_items: v.number().default(0),
  currency: v.string().default("USD"),
  /* ... */
});
```

### 1.2 Why never floats

```typescript
0.1 + 0.2 === 0.3        // false
1234.567 * 100           // 123456.69999999999
```

Compound a million orders' subtotals across a payout report and you'll be off by enough to matter. Integer cents prevents this entire class of bug.

### 1.3 The AI-pricing exception

`ai-models.input_price` and `ai-models.output_price` are stored as `v.number()` — not cents. This is **deliberate**: AI provider pricing is sub-cent per token (e.g. $0.000002), where integer minor units round to zero. The exception is *only* AI / token pricing; business money (orders, products, payments, balances, refunds) follows the cents rule.

### 1.4 Display formatting at the edge

Formatting (`$12.99`, `12.99 SAR`) is the resource layer's job — see `skills/api-design/SKILL.md` § 5. The model and service work in cents; the resource converts.

---

## 2. Time — UTC at rest, convert at the edge

### 2.1 Storage

- All timestamp columns store **UTC**, full stop.
- The column type is `date()` in the migration; the schema type is `v.date()` returning `Date`.

### 2.2 Naming — `<verb>_at`

Time columns end with `_at` and describe what happened, in past tense:

| Column          | Meaning                          |
| --------------- | -------------------------------- |
| `created_at`    | row was created                  |
| `updated_at`    | row was last updated             |
| `synced_at`     | row was synced from a source     |
| `checked_out_at`| cart was checked out             |
| `abandoned_at`  | cart was marked abandoned        |
| `expires_at`    | row will become invalid          |

```typescript
// ✅ from cart.model.ts
synced_at: v.date().optional(),
abandoned_at: v.date().optional(),
checked_out_at: v.date().optional(),
```

### 2.3 Conversion happens at the response layer

Services and models work in UTC `Date` objects. Timezone conversion (UTC → user's local timezone) happens once, at the resource / response layer, using the authenticated user's preference. Never store timezone-adjusted timestamps.

### 2.4 Date library

The project uses `dayjs` for time arithmetic and formatting (already in dependencies). Never `moment`, never hand-rolled UTC math. The framework's `@mongez/time-wizard` provides typed helpers on top of dayjs — prefer it where available.

---

## 3. IDs

### 3.1 The rule

- **Internal primary keys** may be sequential — they're cheap, indexed, and never leave the database.
- **Any ID that crosses a process boundary** (URL, response body, log line, webhook) is opaque — UUID or nanoid.

### 3.2 Project default

Cascade generates string IDs by default for new records. Use those as the public identifier. Don't expose `_id` (Mongo) or sequential integers (Postgres serial) in URLs even if they exist internally.

### 3.3 Why

Sequential keys leak business volume (`/orders/42178` tells anyone you've placed ~42k orders) and invite enumeration attacks (incrementing the path to find someone else's resource). Opaque IDs prevent both.

---

## 4. Audit columns

### 4.1 Framework-managed

Cascade auto-adds `created_at` and `updated_at` to every model. You do **not** add them to the schema or migration — the framework handles them.

### 4.2 Author tracking

For entities where "who created this" matters (most business entities), add author columns to the resource:

```typescript
// ✅ from ai-model.resource.ts
created_by: "string",
updated_by: "string",
deleted_by: "string",
```

These store the user-id of the actor at the time of the action. Wire them in the service:

```typescript
await ordersRepository.create({ ...input, created_by: user.id });
```

### 4.3 What to audit

Every entity that's user-mutable: yes. Read-only reference data (countries, currencies, system enums): no — audit columns are noise there.

---

## 5. Soft-delete vs hard-delete

### 5.1 Default to soft-delete for user-visible entities

Soft-delete keeps the row, sets `deleted_at` + `deleted_by`. The entity is excluded from default queries but recoverable.

### 5.2 Hard-delete for ephemeral data

Use hard-delete for:

- Sessions, OTPs, refresh tokens (expired = gone)
- Cache entries
- Idempotency-key records past their TTL
- GDPR right-to-erasure requests (when triggered)

### 5.3 Mechanics

Configure the delete strategy at the model level — see `@warlock.js/cascade/configure-delete-strategy/SKILL.md` for the framework's per-model knobs (`paranoid`, `forever`, `cascade`).

### 5.4 Restore is admin-only

If an entity supports restore, expose it through an admin endpoint, never end-user UI (unless the feature is explicitly "trash / undelete" — a deliberate UX, not an accident).

---

## 6. Migrations

### 6.1 Forward-only

Never edit a shipped migration. Once it's on `main`, the only change is a new migration on top.

### 6.2 File location

Migrations live inside the model folder: `src/app/<module>/models/<model>/migrations/<timestamp>-<noun>.migration.ts`. The framework's `yarn cli migrate` discovers them.

### 6.3 Definition shape

```typescript
// ✅ from ai-model.migration.ts
import { arrayText, bool, double, integer, json, Migration, text } from "@warlock.js/cascade";
import { AiModel } from "../ai-model.model";

export default Migration.create(
  AiModel,
  {
    provider: text().notNullable(),
    code: text().notNullable(),
    name: text().notNullable(),
    context: integer().notNullable(),
    is_free: bool().notNullable(),
    input_price: double().notNullable(),
    config: json().nullable(),
    features: arrayText().nullable(),
  },
  {
    unique: [{ columns: ["provider", "provider_model_id"] }],
  },
);
```

Column type helpers: `text()`, `integer()`, `double()`, `bool()`, `json()`, `arrayText()`, `date()`. Always declare `.notNullable()` or `.nullable()` explicitly — never leave nullability implicit.

### 6.4 Backfill separately from schema change

Two migrations, not one:

1. Schema change (add column nullable, or add column with default).
2. Backfill (populate the column from existing data).

This keeps each migration short, fast, and safe to revert in stages.

### 6.5 Long-running backfills

If a backfill is going to touch millions of rows, gate it behind a feature flag and run it as a background job — not inside the migration runner. The migration just creates the schema; the backfill is application code.

---

## 7. Indexes

### 7.1 Every query path has a supporting index

- Foreign keys are indexed by default.
- Any column you filter or sort on regularly gets an index.
- Composite indexes match query order (`WHERE org_id = ? AND status = ?` → index `(org_id, status)`).

### 7.2 Add the index alongside the query

If a new query is introduced, the index lands in the same PR. Don't push slow queries to production and patch later.

### 7.3 Tooling

`yarn db.indexes` runs the framework's index management. Define indexes declaratively in the migration's options.

---

## 8. Schema conventions

### 8.1 Column naming — snake_case

All database column names use `snake_case`: `created_at`, `total_cents`, `provider_model_id`. This matches the wire-format convention in resources.

### 8.2 Foreign keys — `<noun>_id`

`user_id`, `organization_id`, `cart_id`. Always singular, always `_id` suffix. Cascade's `@BelongsTo("Name")` decorator wires the relation off this column by convention.

### 8.3 Booleans — affirmative

`is_active`, `is_free`, `has_shipped`, `was_refunded`. Never negative (`is_not_deleted`, `is_unverified`) — negative booleans break readability under negation (`!isNotDeleted` reads as a riddle).

### 8.4 Enums — string in the column, enum in the schema

```typescript
status: v.enum(CartStatus).default(CartStatus.ACTIVE),
```

The enum is defined once in `app/<module>/types/<noun>-status.type.ts` and referenced everywhere. Never use raw string literals for status fields outside the type definition.

### 8.5 Defaults

Declare defaults in the schema (`v.string().default("USD")`), not just in the migration. The schema default keeps `Infer<>` clean and gives the service a sensible starting value.

---

## 9. Models — structural rules

### 9.1 File layout

```
src/app/<module>/models/<noun>/
  <noun>.model.ts        ← @RegisterModel() + schema + class + getters
  index.ts               ← re-export
  migrations/
    <timestamp>-<noun>.migration.ts
```

### 9.2 The model file shape (Cart is the gold standard)

```typescript
// 1. schema first
export const cartSchema = v.object({ /* columns */ });
export type CartSchema = Infer<typeof cartSchema>;

// 2. class with decorator
@RegisterModel()
export class Cart extends Model<CartSchema> {
  public static table = "carts";
  public static schema = cartSchema;

  // 3. relations
  @BelongsTo("Organization")
  public organization?: Organization;

  @HasMany("CartItem")
  public items?: CartItem[];

  // 4. typed getters — one per persisted field accessed from app code
  public get totalCents() {
    return this.get<number>("total_cents", 0);
  }
}
```

### 9.3 Typed getters over `.get<T>("field")` at call sites

This is project policy (see memory `feedback_use_model_getters`). Every column accessed from application code gets a typed getter on the model. One line beats `cart.get<number>("total_cents")` across N call sites.

### 9.4 Class-level JSDoc for non-obvious domain logic

The Cart model has a multi-paragraph JSDoc explaining identity ownership, lead linkage, source-of-truth rules, and currency snapshotting. Mirror this for any model whose semantics aren't obvious from the columns alone.

---

## 10. Review checklist

Before merging a change that touches a model, schema, or migration:

- [ ] Money columns are `integer cents` with `currency` alongside (AI-pricing is the only exception)
- [ ] Time columns end with `_at`, store UTC `Date`
- [ ] No timezone-adjusted timestamps in storage
- [ ] IDs exposed in URLs / responses are opaque
- [ ] Audit columns (`created_by`, `updated_by`) wired where author tracking matters
- [ ] Soft-delete strategy chosen deliberately, configured via cascade
- [ ] Migration is forward-only, not editing a shipped file
- [ ] Backfill is a separate migration / background job from the schema change
- [ ] Every new query path has a supporting index
- [ ] Column names snake_case, foreign keys `<noun>_id`
- [ ] Booleans are affirmative (`is_active`, never `is_not_deleted`)
- [ ] Enums defined once in `types/`, never repeated as string literals
- [ ] Defaults declared in the schema, not only in the migration
- [ ] Every accessed column has a typed getter on the model
- [ ] Class-level JSDoc on the model if domain semantics aren't obvious
