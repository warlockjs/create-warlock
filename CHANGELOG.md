# Changelog — create-warlock

All notable changes to `create-warlock` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). `@warlock.js/*` packages are released in lockstep — every package shares the same version number, so a version below may list only the changes that affected this package.

## [Unreleased]

## 4.2.10

### Changed

- The project template now pins the latest `@mongez/*` versions — `@mongez/reinforcements@^3.2.0` and `@mongez/agent-kit@^1.2.0` — so freshly scaffolded apps start on current dependencies. (`@warlock.js/*` versions in the template are still rewritten to the scaffolder's own version at install time.)

## 4.2.7

### Fixed

- The published package now ships its `templates/` folder, so scaffolding a new project works from the installed package — it was missing from the build, which made the wizard fail with "Something went wrong" at the template-copy step. The rest of the family is re-published at 4.2.7 to keep the lockstep version line; no other functional changes.

## 4.2.6

### Fixed

- The published package now ships its `bin` folder again, so the `create-warlock` CLI works from the installed package — it was omitted from the 4.2.5 build. The rest of the family is re-published at 4.2.6 to keep the lockstep version line; no other functional changes.

## 4.2.5

- The feature wizard now offers **Notifications** (`@warlock.js/notifications`) under "Jobs & Messaging" — opt-in; selecting it delegates to `warlock add notifications` (ejects config + scaffolds the in-app model/migration).

## 4.1.15

- Baseline — per-package changelog tracking starts at this version.
