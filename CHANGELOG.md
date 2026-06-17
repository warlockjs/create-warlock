# Changelog — create-warlock

All notable changes to `create-warlock` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). `@warlock.js/*` packages are released in lockstep — every package shares the same version number, so a version below may list only the changes that affected this package.

## [Unreleased]

## 4.2.6

### Fixed

- The published package now ships its `bin` folder again, so the `create-warlock` CLI works from the installed package — it was omitted from the 4.2.5 build. The rest of the family is re-published at 4.2.6 to keep the lockstep version line; no other functional changes.

## 4.2.5

- The feature wizard now offers **Notifications** (`@warlock.js/notifications`) under "Jobs & Messaging" — opt-in; selecting it delegates to `warlock add notifications` (ejects config + scaffolds the in-app model/migration).

## 4.1.15

- Baseline — per-package changelog tracking starts at this version.
