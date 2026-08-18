# Changelog — create-warlock

All notable changes to `create-warlock` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). `@warlock.js/*` packages are released in lockstep — every package shares the same version number, so a version below may list only the changes that affected this package.

## 4.15.0

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
