---
name: api-design
description: 'Project-wide HTTP API conventions for Warlock.js apps — list endpoints return `{ <pluralResourceName>, pagination }`, single-item endpoints return `{ <resourceCamelName>: <object> }`, delete returns `204 No Content` (or `{ message }`); framework response helpers map 1:1 to status codes (`response.success` / `successCreate` / `noContent` / `accepted` / `badRequest` / `unauthorized` / `forbidden` / `notFound` / `conflict` / `unprocessableEntity` / `tooManyRequests` / `serverError`); kebab-case plural URL nouns (`/ai-models`); snake_case fields inside resources; offset pagination by default, cursor for time-ordered firehose; list query params validated by a schema (caps `limit`, whitelists `orderBy`, strips unknown keys — never raw `request.all()`); typed controllers via `GuardedRequestHandler<Schema>` (guarded) / `RequestHandler<Request<Schema>>` (public) with the schema in the `schema/` folder + `request.validated()` — the per-endpoint `requests/` folder is retired; not-found is thrown from the service (`ResourceNotFoundError`) so controllers stay clean; resources are output-only (`defineResource`); RESTful routes via `router.route().list().show().create().update().destroy()`; versioning guidance for the rare app that needs it. Triggers: writing a controller, route handler, or HTTP endpoint; shaping a response body; choosing a status code; adding pagination to a list endpoint; designing a `.resource.ts`; defining a route; deciding what `request.validated()` vs `request.input(...)` returns; where the schema file lives; how to return not-found; whether to version an API; user asks "what status code", "how do we paginate", "what does the response look like", "list vs single envelope", "snake_case or camelCase in responses", "how do we structure a controller", "where does the schema go", "should I version my API". Skip: input validation rules (load `skills/security-baseline/SKILL.md` § 1); pagination performance / N+1 (load `skills/observability-and-resilience/SKILL.md`); data column naming inside models (load `skills/data-and-persistence/SKILL.md`); framework router internals — load `@warlock.js/core` route skills; CSS / UI work.'
---

# API design

**Status:** Stable
**Applies to:** Every HTTP endpoint, controller, resource, and route file in `src/app/**`.

The project-wide contract between server and client. The frontend should be able to predict the shape of any response without reading the endpoint.

> **Sub-agent rule:** Before writing any controller, route, or resource, read this file.

---

## 1. Response envelope

The project uses **three envelope shapes**, one per response kind. Each kind has its own controller pattern. Do not invent a fourth.

### 1.1 List endpoints — `{ <pluralResourceName>, pagination }`

The list lands under the **plural name of the module's resource** — `users`, `aiModels`, `orders` — paired with `pagination`. The repository returns the framework's `{ data, pagination }`; the controller re-keys `data` to the plural name so the response is self-describing.

```typescript
// ✅ list-users.controller.ts
export const listUsersController: RequestHandler = async (request, response) => {
  const { data, pagination } = await listUsersService(request.all());

  return response.success({
    users: data,
    pagination,
  });
};
```

- The key is the **plural camelCase** of the resource: `users`, `aiModels`, `aiApiKeys`, `orders`.
- `pagination` is always the framework's `PaginationResult["pagination"]` (see § 3).
- Don't return a bare `data` key — the plural name tells the consumer what the array holds without reading the URL.

### 1.2 Single-item endpoints — `{ <resourceCamelName>: <object> }`

Read, create, and update endpoints return the resource under its camelCase singular name.

**The controller never null-checks.** Not-found is thrown from the service, so the controller has no `if (!x) return response.notFound()` branch. The service owns the "does this exist" question; the controller only orchestrates the happy path.

```typescript
// ✅ get-faq.service.ts — the service throws
import { ResourceNotFoundError } from "@warlock.js/core";
import { faqsRepository } from "../repositories/faqs.repository";

export async function getFaqService(id: number | string) {
  const faq = await faqsRepository.getCached(id);

  if (!faq) {
    throw new ResourceNotFoundError("Faq resource not found!");
  }

  return faq;
}

// ✅ get-faq.controller.ts — stays clean, no null-check
export const getFaqController: RequestHandler = async (request, response) => {
  const faq = await getFaqService(request.input("id"));

  return response.success({
    faq,
  });
};
```

The framework maps `ResourceNotFoundError` to a `404` response automatically — the controller doesn't translate it.

- The key is the **singular camelCase** of the resource: `faq`, `aiModel`, `aiApiKey`, `user`, `order`.
- Never `{ data: <object> }` for a single item — `data` is reserved for arrays.
- Never spread the object at the top level (`return response.success({ ...faq })`) — the named wrapper preserves room for future siblings (`meta`, `warnings`, etc.).

### 1.3 Delete endpoints — `204 No Content` (preferred)

```typescript
// ✅ default — nothing to say, say nothing
export const deleteFaqController: RequestHandler = async (request, response) => {
  await deleteFaqService(request.input("id"));

  return response.noContent();
};
```

- Default to `204 No Content` — a successful delete has no body worth sending.
- `{ message: "Faq deleted successfully" }` via `response.success(...)` is acceptable when the client genuinely needs a human-readable confirmation. Pick one per route and stay consistent across the module.
- As with reads, the service throws `ResourceNotFoundError` if the row doesn't exist — the controller doesn't null-check.

### 1.4 Error responses

Use the framework's status helpers — never hand-roll an error body.

```typescript
// ✅
return response.notFound(); // { error: "notFound" }, 404
return response.unauthorized(); // { error: "unauthorized" }, 401
return response.conflict({ error: "Order already cancelled" });
return response.badRequest({ error: "Validation failed", otherInfo: "whatever" });

// ❌
return response.send({ error: "..." }, 404); // bypassing the helper
return response.success({ error: "..." }); // 200 with an error body — never
```

Never `200 OK` with an `error` field — the status code carries the outcome.

---

## 2. HTTP status codes

One canonical mapping. Use the framework helpers; the helper's name **is** the status code's semantic.

| Helper                               | Code | When                                              |
| ------------------------------------ | ---- | ------------------------------------------------- |
| `response.success(data)`             | 200  | Success with a body                               |
| `response.successCreate(data)`       | 201  | Resource created                                  |
| `response.accepted(data)`            | 202  | Async op accepted; processing started             |
| `response.noContent()`               | 204  | Success without a body (idempotent deletes)       |
| `response.badRequest(data)`          | 400  | Malformed request — broken JSON, wrong type       |
| `response.unauthorized(data)`        | 401  | No or invalid credentials                         |
| `response.forbidden(data)`           | 403  | Known caller, not allowed                         |
| `response.notFound(data)`            | 404  | Resource doesn't exist (or caller may not see it) |
| `response.conflict(data)`            | 409  | State collision — already exists, version clash   |
| `response.contentTooLarge(data)`     | 413  | Payload exceeds the limit                         |
| `response.unprocessableEntity(data)` | 422  | Well-formed but semantically invalid              |
| `response.tooManyRequests(data)`     | 429  | Rate limit hit                                    |
| `response.serverError(data)`         | 500  | Server bug — never the client's fault             |

**The 401 vs 403 distinction:** 401 means "I don't know who you are." 403 means "I know who you are, and you can't do this." Mixing them leaks information.

**404 vs 403 on private resources:** if revealing existence is itself a leak ("this private workspace exists, you just can't see it"), return 404. The framework default `{ error: "notFound" }` is fine — don't expose internal reasons.

---

## 3. Pagination

**Mandatory on every list endpoint.** No endpoint returns an unbounded array, even if today's dataset has 12 rows.

### 3.1 Offset pagination — the default

Returned by `RepositoryManager.list` and `listCached`. Use for catalog-style lists, admin tables, anywhere the user thinks in pages.

```typescript
{
  data: T[],
  pagination: {
    limit: number;     // requested per-page size
    result: number;    // items in THIS page (≤ limit)
    page: number;      // 1-indexed
    total: number;     // total items across all pages
    pages: number;     // total page count
  }
}
```

### 3.2 Cursor pagination — for time-ordered firehoses

Use when the dataset is large, append-mostly, and time-ordered: chat messages, event logs, AI trips. Counting `total` would be wasted work; `hasMore` + `nextCursor` is enough.

```typescript
{
  data: T[],
  pagination: {
    limit: number;
    result: number;
    hasMore: boolean;
    nextCursor?: string | number;
    prevCursor?: string | number;
  }
}
```

### 3.3 Request shape

- Offset: `?page=1&limit=20`
- Cursor: `?limit=20&cursor=<value>`
- Hard cap `limit` at a sensible ceiling (e.g. 100) so a malformed client can't ask for 50,000 rows.

### 3.4 Filter and sort

Filters go in query params named after the filterable field (`?status=active&type=basic`). The query schema (§ 3.5) validates each value's type; the repository's `filterBy` rules then map accepted fields to WHERE clauses.

Sort: `?orderBy=created_at&orderDir=desc`. Default sort lives on the repository's `defaultOptions`.

### 3.5 Validate the query — schema first, strip unknown

List endpoints validate their query params with a `@warlock.js/seal` schema, exactly like write endpoints — `request.validated()`, never raw `request.all()`. The schema and the repository's `filterBy` are **complementary**: the schema is the boundary type-guard, `filterBy` is the field→WHERE mapping.

The schema earns its place three ways:

- **Kills operator injection.** Declaring `status: v.enum(OrderStatus)` rejects a smuggled `{ $ne: null }` at the boundary — `filterBy` alone may pass it straight through (see `skills/security-baseline/SKILL.md` § 4.2).
- **Makes the limit cap real.** `limit: v.int().min(1).max(100)` turns the § 3.3 ceiling into enforcement — `?limit=9999999` becomes a `422`, not a table scan.
- **Whitelists `orderBy`.** Restricting sort to known indexed columns closes the slow-query vector.

```typescript
// ✅ schema/list-orders.schema.ts
import { v, type Infer } from "@warlock.js/seal";
import { OrderStatus } from "../types/order-status.type";

export const listOrdersSchema = v.object({
  status: v.enum(OrderStatus).optional(),
  page: v.int().min(1).default(1),
  limit: v.int().min(1).max(100).default(20),
  orderBy: v.literal("created_at", "total_cents").optional(),
});

export type ListOrdersSchema = Infer<typeof listOrdersSchema>;

// ✅ controller — validated, not request.all()
const { data, pagination } = await listOrdersService(request.validated());
```

**Strip unknown keys — don't disallow them.** Seal strips extra keys by default, which is exactly right for query strings: they routinely carry incidental params (`?utm_source=...`, cache-busters `?_=1718`). Throwing a `422` on those is hostile. Reserve disallow-unknown for request *bodies*, where an unexpected key usually signals a client bug or a renamed field.

---

## 4. URLs and routes

### 4.1 Naming

- **Plural, kebab-case nouns:** `/ai-models`, `/ai-api-keys`, `/contacts`.
- **Nested resources only one level deep:** `/orders/:id/items`. If you need two levels (`/orders/:id/items/:itemId/refunds`), the inner resource probably deserves to be top-level.
- **Actions use verb suffixes on the resource path:** `POST /orders/:id/cancel`, not `POST /cancel-order`. The verb is the second-to-last segment.
- **Query params are filters, never identity.** Identity goes in the path (`/orders/:id`), filters in the query string (`?status=paid`).

### 4.2 Route registration — the RESTful builder

Use `router.route(...).list().show().create().update().destroy()` from `@warlock.js/core`. The framework maps each verb to its conventional HTTP method.

```typescript
// ✅ routes.ts
import { router } from "@warlock.js/core";
import { guarded } from "app/shared/utils/router";

guarded(() => {
  router
    .route("/ai-models")
    .list(listAiModelsController)
    .show(getAiModelController)
    .create(createAiModelController)
    .update(updateAiModelController)
    .destroy(deleteAiModelController);
});
```

- Wrap auth-required routes in `guarded(() => { ... })`.
- Public routes go outside `guarded`.
- One `routes.ts` per module. Never define routes spread across multiple files within the same module.

### 4.3 Custom actions

For endpoints that don't fit the RESTful five (e.g. `POST /orders/:id/cancel`), use `router.post(...)` / `router.get(...)` directly inside the same module's `routes.ts`.

---

## 5. Resources (`.resource.ts`)

A resource is the **wire format** for a model. Output-only. No reconciliation, no hydration, no computed side effects — those live in services or model accessors (see project memory `feedback_resources_output_only`).

### 5.1 Definition

```typescript
// ✅ ai-model.resource.ts
import { defineResource } from "@warlock.js/core";

export const AiModelResource = defineResource({
  schema: {
    id: "string",
    provider: "string",
    name: "string",
    description: "string",
    provider_model_id: "string",
    is_free: "boolean",
    input_price: "number",
    output_price: "number",
    capabilities: "object",
    features: "array",
    created_by: "string",
    updated_by: "string",
  },
});
```

### 5.2 Field naming — snake_case

Field names inside the resource schema use **snake_case**, matching the framework's wire convention: `provider_model_id`, `is_free`, `created_by`. The model layer above uses camelCase; the resource is where the convention shifts to wire format.

Top-level envelope keys (the wrapper around the resource: `aiModel`, `aiModels`, `pagination`, `message`) remain camelCase.

### 5.3 Rules

- A resource never reaches into another model — if you need composed data, the service composes the result and passes one final object to the resource.
- A resource never runs business logic — if a value is computed (e.g. `total_spent_cents`), compute it in the service and pass the already-computed field.
- Sensitive fields are omitted at the resource level, not redacted at the log layer.

---

## 6. Validation and request handling

### 6.1 Schema + controller — two files, no `requests/`

A write endpoint is **two files**: the schema in the module's `schema/` folder, and the controller. The old per-endpoint `requests/` folder is retired — the controller is typed directly via a generic request-handler type, so no separate `Request<Schema>` wrapper file is needed.

List endpoints follow the **same** two-file shape — a `list-<noun>.schema.ts` validates the query string (see § 3.5). Only single-identifier reads (`get-<noun>` by id) skip the schema and use `request.input("id")`.

```
schema/create-lead.schema.ts           ← v.object({...}) + Infer<>
controllers/create-lead.controller.ts  ← typed handler + attached schema
```

The schema file exports **both** the value and the inferred type:

```typescript
// ✅ schema/create-lead.schema.ts
import { v, type Infer } from "@warlock.js/seal";

export const createLeadSchema = v.object({
  name: v.string(),
  email: v.string(),
});

export type CreateLeadSchema = Infer<typeof createLeadSchema>;
```

The controller imports both, types itself with the schema as the request payload, and attaches the schema for the framework to validate against:

```typescript
// ✅ controllers/create-lead.controller.ts — guarded route
import { type GuardedRequestHandler } from "app/auth/requests/guarded.request";
import { type CreateLeadSchema, createLeadSchema } from "../schema/create-lead.schema";
import { createLeadService } from "../services/create-lead.service";

export const createLeadController: GuardedRequestHandler<CreateLeadSchema> = async (
  request,
  response,
) => {
  const lead = await createLeadService(request.validated());

  return response.success({
    lead,
  });
};

createLeadController.validation = {
  schema: createLeadSchema,
};
```

### 6.2 Picking the handler type

| Route kind                       | Controller type                       | What it adds                          |
| -------------------------------- | ------------------------------------- | ------------------------------------- |
| Guarded (auth required) + body   | `GuardedRequestHandler<Schema>`       | typed `request.validated()` + `request.user` |
| Public + body                    | `RequestHandler<Request<Schema>>`     | typed `request.validated()`           |
| Read / list (no body)            | `RequestHandler`                      | nothing extra                         |

`GuardedRequestHandler<Schema>` (defined in `app/auth/requests/guarded.request.ts`) is `RequestHandler<GuardedRequest<Schema>>` — it both types the validated payload and guarantees `request.user` is present.

### 6.3 Accessing inputs

- `request.validated()` — typed access to the schema-validated body. Use this in every write endpoint. The type comes from the handler's generic, so no cast is needed.
- `request.input(name)` — single named input (path / query / body fallback). Use for read endpoints that take a single identifier.
- `request.all()` — raw, unvalidated payload. **Avoid it.** List endpoints take a query schema and use `request.validated()` just like writes (see § 3.5); `request.all()` bypasses the boundary type-guard and should never appear on a public route.

### 6.4 Validation failures

The framework returns `422 Unprocessable Entity` with field-level errors automatically when `controller.validation.schema` rejects the input. Do not handle validation errors inside the controller — let the framework boundary do it.

---

## 7. Caching

### 7.1 Response headers

Set `Cache-Control` on every `GET` endpoint, even if the value is `no-store`. Explicit beats default.

- Read endpoints on stable data: `Cache-Control: public, max-age=60`
- Read endpoints on user-specific data: `Cache-Control: private, max-age=30`
- Mutations: `Cache-Control: no-store` (always)
- Auth-related responses: `Cache-Control: no-store, private`

### 7.2 Repository-level caching

`repository.listCached(...)` exists for hot read paths. Use it on list endpoints whose data changes rarely. Invalidate on the corresponding write via the repository's cache invalidation hooks.

---

## 8. Versioning

Most apps on this template are single monoliths with a frontend that ships alongside the backend — so the default is **no versioning at all**: change the API and the frontend together, ship additive changes, never break a field that's in use.

But some apps genuinely need it — a public API with third-party consumers you don't control, a mobile app where old versions linger in users' pockets for months. When that's the case:

### 8.1 Default — additive-only, no prefix

- Add fields freely; they don't break existing clients.
- Never remove or rename a field that's in use — see § 9 deprecation for the retire path.
- Never change a field's type or meaning under the same name.

This carries a surprising distance. Reach for explicit versioning only when additive-only genuinely can't express the change.

### 8.2 When you must version — URL prefix

Prefix the route: `/v1/orders`, `/v2/orders`. It's the most observable option — visible in logs, trivial to route per-version at the load balancer, obvious to the consumer.

```typescript
// ✅ versioned route group
router.prefix("/v1", () => {
  router.route("/orders").list(listOrdersControllerV1);
});
```

### 8.3 Carve a whole version, not one endpoint

When a breaking change forces `/v2`, move the **entire namespace** to `/v2` at once — don't scatter `/v2/orders` next to `/v1/users`. A consumer should be able to pin "I speak v1" or "I speak v2", not track a per-endpoint matrix.

### 8.4 Header-based versioning — avoid

`Accept: application/vnd.app.v2+json` works but is invisible in logs, painful to test by hand, and easy to get wrong. Stick to the URL prefix unless a specific consumer contract demands the header form.

---

## 9. Deprecation

When a field, endpoint, or shape needs to retire:

1. **Announce in response headers** — `Deprecation: true`, `Sunset: <RFC 1123 date>`.
2. **Document in the module's README** with the removal date.
3. **Track usage** via metrics — never remove until traffic is near-zero.
4. **Removal lands in a new route or new version**, never silently mid-version.

Minimum lead time before removal: **60 days** for internal-only callers, **90 days** for any externally-consumed surface.

---

## 10. Review checklist

Before merging any controller / route / resource change:

- [ ] List endpoints return `{ <pluralResourceName>, pagination }` — not a bare `data` key
- [ ] Single-item endpoints return `{ <resourceCamelName>: <object> }`
- [ ] Delete endpoints return `204 No Content` (or `{ message }` when confirmation is genuinely needed)
- [ ] Not-found is thrown from the service (`ResourceNotFoundError`) — controllers do not null-check
- [ ] Status code comes from a framework helper (`response.success`, `notFound`, etc.) — no hand-rolled `send(data, 4xx)`
- [ ] No `200 OK` with an `error` field
- [ ] List endpoint has pagination — no unbounded arrays
- [ ] List endpoint validates its query with a schema (`request.validated()`, not `request.all()`) — caps `limit`, whitelists `orderBy`, strips unknown keys
- [ ] URL is kebab-case plural noun; custom actions use verb suffix
- [ ] Routes registered via `router.route(...).list().show().create().update().destroy()` (or explicit `router.<verb>(...)` for custom actions)
- [ ] Auth-required routes wrapped in `guarded(() => { ... })`
- [ ] Write endpoint: schema in `schema/` folder, controller typed `GuardedRequestHandler<Schema>` / `RequestHandler<Request<Schema>>`, `controller.validation = { schema }`, no separate `requests/` file
- [ ] Read endpoint uses `request.input(...)` for identity, not `request.all()`
- [ ] Resource is output-only — no logic, no reaching into other models
- [ ] Resource field names are snake_case
- [ ] `Cache-Control` set explicitly on `GET` endpoints
- [ ] Versioning: additive-only by default; explicit `/vN` prefix only when a real breaking change forces it
- [ ] Deprecated fields announced via `Deprecation` / `Sunset` headers, not silently changed
