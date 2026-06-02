# create-warlock — backlog

Findings and deferred work from the release-quality polish pass.

## Template drift — fixed

- **`text(N)` column helper arity.** The three migration templates (`posts`, `users`, `auth/otp`) called
  `text(255)` / `text(500)` / `text(20)` / `text(50)`. The current cascade helper
  `text()` (`@warlock.js/cascade` → `src/migration/column-helpers.ts:105`) takes **zero arguments**, and
  `ColumnMap` types column values as `DetachedColumnBuilder`, so every `text(N)` was a TypeScript
  compile error (`Expected 0 arguments, but got 1`) in the generated project — `yarn tsc` / `warlock dev`
  would fail on a freshly scaffolded app. Fixed by switching sized columns to `string(N)`
  (`column-helpers.ts:77`, the varchar helper that takes a length) and keeping bare `text()` for the
  unbounded `posts.description` column. Import lists updated accordingly (12 call sites, 3 files).

## Template drift — verified clean (no change needed)

The `requests/*.request.ts` → `schema/*.schema.ts` + `controller.validation = { schema }` refactor that was
already in the working tree was cross-checked against current source and is internally consistent:

- `RequestHandler<TRequest>` + `validation?: { schema?: ObjectValidator }` — `core/src/router/types.ts`.
- `Request<TPayload>` + `request.validated()` / `input()` / `all()` — `core/src/http/request.ts`.
- `v` / `Infer` from `@warlock.js/seal`; `v.file().image().maxSize().saveTo()`, `v.email()`, `v.computed()`,
  `v.embed()` (cascade plugin), `v.boolean().default()` — all present.
- `Migration.create(model, columns, options?)`, column helpers `string/integer/bool/json/timestamp` and
  `.unique()/.index()/.nullable()/.notNullable()` — cascade.
- `defineResource({ schema })` with cast strings `number/string/boolean/object/storageUrl` — `core/src/resource`.
- `authService.login/logout/revokeAllTokens/refreshTokens`, `Auth`, `authMiddleware` — `@warlock.js/auth`.
- `useHashedPassword`, `useComputedSlug`, `storage`, `Image`, `response.sendFile/sendImage`, `testGet`,
  `RepositoryManager`, `CACHE_FOR` (cache), `fileExistsAsync` (fs), `Scheduler` (scheduler) — all present.

## Latent bugs — logged, not fixed (would change behavior / model)

- **`updatePackageJson` string-replaces every `"yarn"` occurrence.** `App.updatePackageJson()` runs
  `this.package.replaceAll("yarn", getPackageManager())` across the whole stringified `package.json`. The
  template has `"serve": "yarn build && nohup ..."` and huskier hooks `"yarn format"` etc. With `--pm=npm`
  these become `"npm build"` / `"npm format"` — invalid (npm needs `npm run <script>`). pnpm is fine.
  Fix would require teaching the substitution to emit `npm run <x>` for script bodies; out of scope for a
  behavior-preserving pass.

- **Dead helpers in `src/helpers/project-builder-helpers.ts`.** `updateEnvFile`, `copyTemplateFiles`, and
  `allDone` are unused by the live flow (`createWarlockApp` uses `App` methods instead) and reference a
  `.env.shared` file the template no longer ships. Safe to delete in a follow-up; left untouched to keep this
  pass scoped to drift + tests + docs.

- **`templates/warlock/package.json` has typo'd generator scripts.** `"gen.s": "warlock.generate.service"`,
  `"gen.m": "warlock.generate.model"`, `"gen.c": "warlock.generate.controller"` use dots instead of spaces
  (should be `warlock generate.service` etc., matching the sibling `gen.mig` / `gen.md` entries). Cosmetic —
  these scripts just won't resolve as written. Pinned-version rule does not apply to script strings, but left
  for a dedicated template-hygiene pass to avoid mixing concerns.

- **`tsconfig.json` uses deprecated options.** `moduleResolution: "node"` (node10) and `baseUrl` raise
  `TS5107` / `TS5101` deprecation errors under the workspace's TypeScript 6+ (they stop functioning in TS 7.0).
  Pre-existing; no effect on the shipped scaffolder behavior. Migrate to `moduleResolution: "bundler"` (or add
  `ignoreDeprecations: "6.0"`) in a config-hygiene pass.

## Folded from the old TODO.md

Most original TODO items are now done (the wizard covers DB / features / auth / cache / mail / websockets via
the feature multiselect, and a scheduler helper ships). Still-relevant remainders:

- **Offer a minimal / "plain" project option.** Today the template is always the full ready-made app (auth +
  users + posts + uploads). A lighter starter (no sample modules) would help users who want a blank slate.
- **Sitemap generator example module.** A small built-in example module demonstrating dynamic route output.

## Testing notes

- Added `specs/scaffolder.spec.ts` (18 tests) + `vitest.config.ts`. Run with
  `cd "<monorepo>/@warlock.js" && npx vitest run --root create-warlock` (per-package `npx vitest` is broken by
  the workspace symlink). Tests cover `parseFlags`, `database-drivers`, `features-map`, and `App` template
  emission (copy, `_.gitignore`→`.gitignore` rename, `.env` creation, name + DB-driver substitution,
  scoped-name flattening) using OS temp dirs.
- The tests validate scaffolder *behavior*; they do not run a full `npm install` of a generated project (no
  network). Template TS correctness against the live framework API was verified by reading source.
