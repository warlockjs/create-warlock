---
name: security-baseline
description: 'Project-level security floor for Warlock.js apps — input validation at every boundary via `@warlock.js/seal` schemas, authentication via `@warlock.js/auth` (JWT + refresh) with `userType` config, server-side authorization never trusting client-supplied `userId`/`organizationId`, secrets only via `env(...)` + typed config files (never `process.env.X` scattered), parameterized queries through Cascade ORM (never raw concatenation), rate limiting via `@fastify/rate-limit` configured in `config/http.ts`, PII / token redaction in logs (`log.configure({ redact })`), `bcryptjs` for password hashing, `@mongez/encryption` for symmetric encryption, dependency vulnerability scanning (`yarn audit`). Triggers: writing a route handler / controller that accepts external input; touching auth, login, signup, session, token, JWT, password, refresh-token; reading secrets / API keys / env vars; writing a Cascade query or repository filter; handling file uploads, webhook payloads, queue messages; setting rate limits; user asks "is this secure", "input validation", "SQL / NoSQL injection", "XSS", "CSRF", "rate limiting", "secrets management", "authentication vs authorization", "where does X env var go"; importing `@warlock.js/seal` or `@warlock.js/auth` or `bcryptjs`. Skip: pure UI / styling that handles no data; code-style questions (load `skills/code-standards/SKILL.md`); HTTP envelope shape (load `skills/api-design/SKILL.md`); cryptography internals / writing your own crypto — stop and use a vetted lib; advanced auth flows (OAuth, SAML) — load `@warlock.js/social-auth` skill.'
---

# Security baseline

**Status:** Stable
**Applies to:** Every code path that touches external input, identity, secrets, persistence, or the public network.

The non-negotiable security floor for any project on this template. Each rule maps to a real class of incident — most production breaches trace back to one of these eight being absent or sloppy.

> **Sub-agent rule:** Before writing any code that handles external input, identity, or secrets, read this file. Code-style rules live in `skills/code-standards/SKILL.md` — this skill is about what the code must do, not how it must look.

---

## 1. Input trust model

TypeScript types are runtime lies. The only thing standing between a malicious payload and your service is a runtime validator. Use `@warlock.js/seal`.

### 1.1 What counts as untrusted input

Anything that crosses the process boundary:

- Request bodies, query params, path params, headers
- File uploads (the binary AND the filename AND the MIME type)
- Webhook payloads
- Queue messages
- Env vars (validated once at boot — see § 3)
- Database rows from a *different* service (treat them as external if you don't own the writer)

### 1.2 Where validation runs

At the boundary, exactly once. Never inside services.

The Warlock pattern: schema lives in the module's `schema/` folder, the controller types itself with the schema and attaches it via `controller.validation.schema`. See `skills/api-design/SKILL.md` § 6 for the full controller shape.

```typescript
// ✅ schema/create-order.schema.ts
import { v, type Infer } from "@warlock.js/seal";

export const createOrderSchema = v.object({
  cartId: v.string(),
  paymentToken: v.string(),
  shippingAddress: v.object({
    street: v.string().min(1),
    city: v.string().min(1),
    postalCode: v.string().min(1),
    country: v.string().min(2).max(2),
  }),
});

export type CreateOrderSchema = Infer<typeof createOrderSchema>;

// ✅ controller — framework rejects invalid input with 422 before the handler runs
import { type GuardedRequestHandler } from "app/auth/requests/guarded.request";
import { type CreateOrderSchema, createOrderSchema } from "../schema/create-order.schema";

export const createOrderController: GuardedRequestHandler<CreateOrderSchema> = async (
  request,
  response,
) => {
  const order = await placeOrderService(request.validated()); // already typed + safe
  return response.success({ order });
};

createOrderController.validation = { schema: createOrderSchema };
```

The framework returns `422 Unprocessable Entity` with structured field errors automatically. **Never** catch validation errors in the controller — the boundary handles them.

### 1.3 File uploads

- Cap the size at the route level (`fileUploadLimit` in `config/http.ts` is the project floor; tighten per-route).
- Sniff the real MIME type from the bytes; don't trust the `Content-Type` header.
- Never use the client-supplied filename as a path component — generate a server-side identifier.
- Quarantine until processed; scan if user-visible.

### 1.4 Webhook payloads

- **Verify the signature first**, schema-validate second. A signature failure aborts before any other work.
- Reject requests older than the provider's replay window (typically 5 minutes).
- Idempotency-key the handler (see `skills/observability-and-resilience/SKILL.md` § 4) — providers retry.

---

## 2. Authentication vs authorization

AuthN proves who you are. AuthZ decides what you can do. Conflating them is how incidents start.

### 2.1 Identity comes from the session, never the request body

```typescript
// ❌ trusting the client
const order = await ordersRepository.find({ id, userId: request.input("userId") });

// ✅ identity from the authenticated session
const user = request.user;
const order = await ordersRepository.find({ id, userId: user.id });
```

Any field whose value would determine permission (`userId`, `organizationId`, `roleId`, `isAdmin`) is read from the authenticated session — never from the request body, query, or header.

### 2.2 Authentication via `@warlock.js/auth`

The project's auth stack: JWT access tokens (1h) + refresh tokens (30d), configured in `config/auth.ts`. Password hashing via `bcryptjs`. The framework's `authService` (`@warlock.js/auth`) is the single entry point:

```typescript
// ✅ thin wrapper service — the framework does the work
import { authService } from "@warlock.js/auth";
import { User } from "app/users/models/user/user.model";

export async function loginService(credentials, deviceInfo) {
  return authService.login(User, credentials, deviceInfo);
}
```

### 2.3 Authorization happens server-side, every endpoint, every time

A `guarded(() => { ... })` wrapper around routes enforces authentication. **Authorization is separate** — being authenticated proves identity, not permission.

Pattern: at the start of every mutating service, check ownership and role:

```typescript
// ✅
export async function updateOrderService(orderId: string, input, user) {
  const order = await ordersRepository.find({ id: orderId });

  if (!order) {
    throw new OrderNotFoundError(orderId);
  }

  if (order.userId !== user.id && !user.isAdmin) {
    throw new ForbiddenError("not your order");
  }

  // ... mutate
}
```

Resource ownership checks live in the service, not the controller. The controller only orchestrates.

### 2.4 Role checks

Use centralized role helpers, never inline string comparisons (`user.role === "admin"` is a typo waiting to happen). Define roles as an enum in `app/shared/utils/enums.ts`.

---

## 3. Secrets management

### 3.1 `.env` is never committed

- `.env.local` and `.env` are in `.gitignore` from day one.
- `.env.example` is committed and documents every variable the app needs.
- Production secrets come from the deployment platform's secret manager (Doppler, AWS Secrets Manager, Kubernetes secrets), not files on disk.

### 3.2 Secrets enter through validated config

The pattern is already established in `src/config/*.ts`. Every config file reads `env(...)` and exports a typed object. Never read `process.env.X` outside `config/`.

```typescript
// ✅ config/auth.ts — the project's actual pattern
import { type AuthConfigurations } from "@warlock.js/auth";
import { env } from "@warlock.js/core";

const authConfigurations: AuthConfigurations = {
  userType: { user: User },
  jwt: {
    secret: env("JWT_SECRET"),
    expiresIn: "1h",
    refresh: { /* ... */ },
  },
};
```

A missing critical env var should fail loudly at boot. Don't silently fall back to a default for security-relevant values (`JWT_SECRET` has no sensible default).

### 3.3 Secrets never appear in logs

The logger redaction layer is the safety net, but the first line of defence is not putting them in context at all.

```typescript
// ❌
log.info("auth", "login", "User authenticated", { user, password, token });

// ✅
log.info("auth", "login", "User authenticated", { userId: user.id });
```

Configure `log.configure({ redact: { paths: ["password", "token", "*.secret", "*.apiKey"] } })` at startup — see `@warlock.js/logger/redact-sensitive-log-fields/SKILL.md`.

### 3.4 Token lifetimes

Short-lived access tokens (≤ 1h), longer-lived refresh tokens (≤ 30d) with rotation on every refresh, revocation on logout. The default in `config/auth.ts` matches this — don't extend access-token lifetime to "make it easier" for the frontend.

---

## 4. Injection prevention

### 4.1 Cascade ORM — always parameterized

Never compose query strings from user input. Cascade's repository and query builder are parameterized by default; never reach for a raw query mode.

```typescript
// ✅
const orders = await ordersRepository.list({ status: input.status });

// ❌ string-built filter with user value
const orders = await ordersRepository.raw(`status = '${input.status}'`);
```

### 4.2 NoSQL operator injection

If a request body is `{ status: { $ne: null } }`, a naive `find({ status: input.status })` becomes a `$ne: null` match — returns every row. The seal schema is what prevents this: declaring `status: v.string()` rejects an object value at the boundary.

This applies to **query strings too**, not just bodies — a `?status[$ne]=` smuggled through the query is the same attack. That's why list endpoints validate the query with a schema and never pass raw `request.all()` to the repository (see `skills/api-design/SKILL.md` § 3.5).

This is a real reason § 1 is non-negotiable.

### 4.3 Command execution

- Avoid `exec` / `spawn` with user input entirely.
- If unavoidable, use the array-args form (`spawn(cmd, [arg1, arg2])`), never the string form.
- Validate the input against a strict allowlist.

### 4.4 Path traversal

- Never concatenate user input into a file path.
- Canonicalize (`path.resolve`) and verify the result starts with the expected prefix.
- File uploads land under a server-generated path, never a client-supplied one.

---

## 5. Output safety

### 5.1 HTML escaping

For any user-controlled string rendered into HTML (email templates, server-rendered pages), escape at the template engine level. React Email handles this by default; if you reach for a raw string, you've taken on the responsibility.

### 5.2 JSON responses

The framework sets `Content-Type: application/json` for `response.success(...)` automatically. Don't override unless you genuinely mean to return a different type.

### 5.3 Open redirects

If you implement a "redirect back to where the user came from" feature, validate the destination URL against a whitelist of internal paths. Never blindly follow a user-supplied URL.

### 5.4 CORS

`config/http.ts` controls the CORS policy. The template default `origin: "*"` is **fine for early development** — but before production:

- Replace `*` with the explicit frontend origin(s).
- If credentials cross the boundary (cookies, auth headers), `*` is no longer allowed by the spec anyway.

---

## 6. Rate limiting and abuse

### 6.1 Default limiter

`config/http.ts` ships with `rateLimit: { max: 260, duration: 60_000 }` — 260 requests per minute per IP. That's the project floor for all routes.

### 6.2 Aggressive limiter on `/auth/*`

Login, signup, password-reset, and refresh-token endpoints get a much tighter limit (e.g. 10/min/IP, 5/hour/email). Brute-force is the cheapest attack; defending it is cheap too.

### 6.3 Account-targeted limits

For `/auth/login` and `/auth/reset-password`, key the limiter on the **email or user-id** in the payload as well as the IP — otherwise an attacker rotating IPs has free rein on a target account.

### 6.4 Progressive lockout

After N failed login attempts:
- 3 failures → 1-minute delay
- 5 failures → 5-minute delay + email notification
- 10 failures → temporary account lock + manual review

Never silently succeed-and-fail (returning 200 with no body to hide whether the account exists) — that's a UX disaster and doesn't actually slow attackers. Honest `401` + rate limiter is the right answer.

---

## 7. Dependency hygiene

### 7.1 `yarn audit` in CI

CI runs `yarn audit --level=high` on every PR. High and critical vulnerabilities block merge. Moderate goes on the backlog with a fix-by date.

### 7.2 Lockfile committed

`yarn.lock` is checked in. Always. CI installs with `--frozen-lockfile`.

### 7.3 No `latest` in `package.json`

Every dependency is pinned or carets-pinned. Never `"some-dep": "latest"` — that's a supply-chain attack waiting to happen.

### 7.4 Prefer framework / std lib

Every dependency is future risk. Before adding a 5-line utility, ask whether it's already covered by `@warlock.js/*`, `@mongez/*`, or the standard library.

---

## 8. Logging and PII

See `skills/code-standards/SKILL.md` § 8 for the call signature. This is the **what not to log** list:

### 8.1 Never log

- Passwords (raw or hashed), API keys, JWT tokens, session ids, refresh tokens
- Authorization headers
- OTP codes
- Payment data — card numbers, CVVs, card-holder data of any kind
- Cookies

### 8.2 Redact unless required

- Personal identifiers: email, phone, full name, address
- IP address (legal in some jurisdictions, regulated in others — check)
- Device identifiers

When a debugging incident genuinely needs personal data, route it through a separate, access-controlled channel — never the default log stream.

### 8.3 Configure once

```typescript
log.configure({
  redact: {
    paths: ["password", "token", "*.secret", "*.apiKey", "authorization", "cookie"],
  },
  channels: [/* ... */],
});
```

See `@warlock.js/logger/redact-sensitive-log-fields/SKILL.md` for the additive per-channel layer.

---

## 9. Review checklist

Before merging a change that touches input, identity, secrets, or persistence:

- [ ] Every untrusted input has a `@warlock.js/seal` schema attached at the controller
- [ ] No identity field (`userId`, `organizationId`, role) is read from the request body
- [ ] Ownership / authorization check runs in the service, not the controller
- [ ] No `process.env.X` outside the `config/` folder
- [ ] No secret value appears in any log call
- [ ] All DB queries go through Cascade — no raw string-built queries
- [ ] Rate limit appropriate for the route family (default for general, aggressive for auth)
- [ ] No `.env` or secrets file in the commit
- [ ] `yarn audit --level=high` passes
- [ ] Logger redaction config covers any new sensitive field introduced
- [ ] File uploads cap size, sniff MIME, server-generate the stored filename
- [ ] Webhooks verify signature before any other work
