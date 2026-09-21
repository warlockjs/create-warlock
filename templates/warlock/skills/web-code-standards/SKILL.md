---
name: web-code-standards
description: >-
  Strict separation-of-concerns standards for Warlock.js src/web pages and
  components: loaders delegate data and business rules to app services;
  components delegate all behavior to separate custom-hook files.
  Use alongside code-standards for web work; skip for backend-only changes.
---

# Web code standards

**Applies to:** `src/web/**` in this project. Read
[`code-standards`](../code-standards/SKILL.md) for the shared TypeScript rules,
and the relevant `@warlock.js/web` skill before using a framework feature.
This skill adds the web-specific rules; it does not override security or
module-boundary requirements. When reviewing existing code, identify debt
without expanding a requested edit into a wholesale refactor.

The bar is a page whose data flow and ownership a new teammate can explain
without tracing a large component, several implicit casts, and unrelated
network handlers. Good UI polish is not a substitute for that clarity.

## Feature directories

Keep files beside the web feature that owns them. For example, `src/web/posts/`
can own an archive, article route, reader controls, comments, and their hooks
and copy. `src/web/auth/` and `account/` own their flows; `src/web/admin/`
can own a guarded dashboard and its domain features. Root document, root
layout, error pages, home page, and shared site chrome stay at their common
ancestor.

When moving a page, check whether its URL is filesystem-derived. If it is,
moving the file changes the URL unless you first give `config` an explicit
`route`. Preserve any explicit `config.route.path` and `config.route.name`,
and keep protected pages under the layout that owns their server auth guard.
Place `locales.json` dictionaries with the feature they describe; site copy
belongs at the common physical source ancestor and admin-only copy belongs
under the admin layout. Warlock discovers these dictionaries automatically
and supplies the selected locale through request translation helpers and
`useTranslate()`. An optional nonempty `$group` replaces the inferred static
directory namespace. Every flattened translation key must have one owner;
ancestor and child dictionaries cannot redefine the same key. Keep legacy
`register()` dictionaries only where global translations are still needed.

## 1. Keep the page contract, make the implementation thin

Warlock's file-routed modules have one policy export: `config`. A page's
`route`, `cache`, `middleware`, `validation`, `metadata`, and `sitemap` all
belong in that object; do not use legacy top-level policy exports. `loader`,
`register`, `ErrorBoundary`, and the default component remain top-level
exports. Layouts, registration files, `root.tsx`, `404.page.tsx`, and
`error.page.tsx` also have framework-defined roles. These are intentional
exceptions to the generic "one primary export per file" rule; do not split
them merely to satisfy it.

Use the config type that matches the module. A page can preserve loader data
inference for metadata by satisfying `PageConfig<typeof loader>`:

```tsx
import type { PageConfig } from "@warlock.js/web";

export async function loader() {
  return { title: "Posts" };
}

export const config = {
  route: { path: "/posts", name: "posts.index" },
  middleware: [requireUser],
  validation: { query: postsQuery },
  metadata: ({ data }) => ({ title: data.title }),
  sitemap: { changefreq: "daily" },
} satisfies PageConfig<typeof loader>;

export default function PostsPage() {
  return <main>Posts</main>;
}
```

Layouts use one `config satisfies LayoutConfig` object for `prefix`,
`middleware`, `metadata`, and a sitemap default. Roots use one
`config satisfies RootConfig` object for `middleware` only: root modules do
not declare routes, prefixes, metadata, validation, cache, or sitemap policy.

```tsx
import type { LayoutConfig, RootConfig } from "@warlock.js/web";

// src/web/account/layout.tsx
export const config = {
  prefix: "/account",
  middleware: [requireUser],
  metadata: { robots: "noindex" },
  sitemap: false,
} satisfies LayoutConfig;

// src/web/root.tsx
export const config = {
  middleware: [loadRequestContext],
} satisfies RootConfig;
```

A page file declares its route contract, coordinates a controller-like loader,
and composes presentational components. The loader validates input, calls
named services under `src/app/<domain>/services/`, converts results through
their resources, and returns the page data. **Every model/repository read and
every business rule belongs in an app service, even when the loader would need
only one query.** Do not import models or repositories into page or layout
loaders. Keep service orchestration in the loader; keep business decisions,
queries, aggregations, and domain transformations in the service. A service
must have a meaningful domain name and own the operation, not exist as a
generic pass-through for a repository method.

Extract substantive view sections into cohesive components. A component
that needs any behavior gets a separate feature-named custom-hook file; a
component with no behavior stays presentational and needs no hook. Split by
responsibility, not by a mechanical line-count limit. Framework exports
remain in the page file even when their work is delegated elsewhere.

Preserve the framework's rendering boundary: `root.tsx` owns the document,
`#vessel` and `<Scripts />`; the loader runs on the server, while the rendered
component can run on the server **and** the client. Do not move request,
database, or secret access into a component or hook. If page-only exports
need server dependencies, use them only in server-side exports and follow the
web skill's import-graph rules. A new auth gate belongs in server middleware,
not a hidden link or a client-side redirect.

**Example split:** a post page's loader passes validated input to
`app/posts/services/get-public-post.service.ts` and returns its resource
output; the page composes `PostArticle`, `PostComments`, and `RelatedPosts`;
`use-post-comments.ts` owns subscription, state, and handlers for
`PostComments`. Each piece has one reason to change.

## 2. Make the server-to-browser data contract explicit

- Validate URL parameters and query input at the page boundary. Use the
  framework's validated request rather than `request.input()` casts where
  validation is available. A `page` parameter must affect a real bounded
  query; accepting and returning it without paging is misleading.
- Have the app service query only what the view needs. Filter, sort, limit,
  and paginate in the data source **before** serialization or rendering. Use
  a count/aggregate query for totals instead of loading a table to count it.
  Batch related reads; do not do one author lookup or image transformation
  per row on an archive page. Cache does not make an unbounded cold path safe.
- Treat resources as the wire-format gate. Send the resource's deliberate
  public shape, never a raw model, secret field, or request object to the
  browser. Do not scatter `toJSON() as unknown as SomeRow` through pages:
  fix or explicitly validate the resource contract at a single boundary so
  refactors cannot silently invalidate loader data.
- Publicly cached pages must not contain viewer-specific state. Keep optional
  identity in an appropriate request-scoped boundary and review cache keys,
  invalidation, and private-page behaviour when the rendered data changes.
- A deferred key needs a meaningful loading state and an error boundary at
  the consuming section. Keep essential page data non-deferred. Do not wrap
  already-resolved markup in more Suspense boundaries merely to appear
  optimized; measure a real hydration or streaming benefit first.
- Metadata, canonical links, and sitemap entries should derive from the
  same validated, public data as the page. Keep private routes out of public
  discovery, and do not generate database-backed assets on every GET.

## 3. Components render; custom hooks own all behavior

**No behavior in React component bodies, even when it is small.** A
component may declare props, call its dedicated custom hook if needed,
and render JSX from its props and the hook's returned values. Put `useState`,
`useEffect`, subscriptions, timers, browser API calls, derived-value
calculations, event handlers, mutations, and navigation decisions in a
separate custom-hook file. Keep pure domain calculations in `src/app`
services; a hook may call a small pure UI helper outside the component.
Do not put a one-line callback or inline computation in JSX because it
"doesn't warrant a hook". Pure presentational components need no hook.
JSX conditionals that only select which markup to show are presentation,
not a license to implement business rules in render.

Render must be deterministic for the same props and request data. Read
`window`, `document`, `localStorage`, browser clocks, and capabilities in
hook handlers or effects, not during server rendering or initial hydration.
Use request-provided data for the first client frame; do not silently render
another value and hope hydration reconciles it.

Identify the source of truth for each value. Loader data is server truth;
hook state is for an interaction or an intentional optimistic change.
Avoid copying props into hook state without a plan for refresh and client
navigation. Avoid setting another state variable inside a state-updater
callback. Prefer deriving display values from one authoritative state.

Effects own their subscriptions and timers: unsubscribe, cancel, or ignore
stale async work on unmount or entity change. A failed script/socket load
must not leave a permanently rejected shared promise or silently disable a
feature for the rest of the session. Realtime events can arrive twice or
out of order; dedupe by stable identity and reconcile with refreshed data.

## 4. Keep mutations and forms cohesive

Client mutations belong in the feature's custom hook, **never inside the
component or its JSX callback**. The hook owns the path from input to API
request to success/error state to refresh or navigation. App services own
the operation's business rules; the browser must not reimplement them.
Never assume an HTTP promise cannot reject. Do not swallow a failed mutation
or network subscription; show actionable UI feedback and log at the
appropriate boundary without leaking user data.

Share a create/edit form's fields, request encoding, and validation-error
mapping when they are the same contract. Keep differences explicit (such as
required-on-create image versus optional-on-edit). Do not build a generic
form engine for one pair of pages. Use typed request and response shapes;
`unknown` is for a genuine boundary and must be narrowed before use.

Keep secrets and access tokens out of browser storage. Client affordances
are not authorization; protected page loaders and mutation endpoints must
enforce the same policy independently. Use a full navigation when an auth or
document boundary requires it, otherwise prefer the framework's navigation
and refresh primitives so state and loader data stay in sync.

## 5. Ship usable, localizable presentation

- Use semantic landmarks, headings, buttons, links, and explicit form labels.
  A placeholder is not a label. Put validation feedback next to its input;
  announce asynchronous success and failure accessibly. Preserve visible
  keyboard focus, reduced-motion preferences, and useful empty/loading/
  failure states.
- Reuse design tokens and cohesive feature components. Keep utility classes
  readable; extract repeated semantics or interactions, not an abstraction
  for every repeated class string.
- If the UI offers a language switch, translate first-party visible copy,
  metadata, and accessible names for supported locales. User-generated
  content can remain in its original language. Do not claim a locale is
  complete when only the navigation is translated.
- Comments explain non-obvious constraints or measured tradeoffs. They do not
  narrate ordinary JSX or promise performance gains without evidence.
  Remove stale starter examples and unexplained debugging writes before
  shipping.

## 6. Review and enforcement

Apply the shared `code-standards` rules to web TypeScript as well: `type` for
plain props/data, no `any`, no swallowed catches, no unsafe assertions used
to hide an unknown data contract. Configure non-mutating ESLint and formatting
checks to enforce rules that can be automated; do not rely on a lint command
that rewrites files as the only quality gate.

When tests are enabled, cover high-value behaviour through the public page
and component contracts: server render and hydration, pagination/filtering,
auth and error boundaries, form success/failure, navigation refresh, and
realtime cleanup. Co-locate focused tests per the testing-strategy skill.
Review accessibility and locale behavior in the actual supported modes.

Before approving a web change, ask:

1. Can a reader identify the page's server data, browser state, and side
   effects without untangling unrelated responsibilities?
2. Does every loader obtain data and business decisions from a named app
   service, with models/repositories kept out of the web layer?
3. Does each behavioral component delegate all state, effects, derived
   values, event handlers, and mutations to its own custom hook file?
4. Is the service query bounded, the resource shape intentional, and the
   cache scope safe?
5. Do refresh, navigation, errors, retries, and cleanup leave the UI correct?
6. Are forms and interactions accessible and translated to the degree the
   interface promises?
7. Are the relevant quality rules enforced or covered by focused tests,
   rather than described only in comments?
