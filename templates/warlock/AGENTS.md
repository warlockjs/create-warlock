# AGENTS.md

> This file is the single source of truth for instructions given to AI coding
> agents working in this project. Tool-specific files (`CLAUDE.md`,
> `.gemini/GEMINI.md`, `.github/copilot-instructions.md`, `CONVENTIONS.md`, …)
> are **derived** from this file by
> [agent-kit](https://github.com/hassanzohdy/agent-kit). Edit **this** file, then
> run `yarn skills:sync` (or `npx agent-kit sync`) to regenerate them — never edit
> the derived files directly.

## Project overview

This is a [Warlock.js](https://warlock.js.org) application — a TypeScript, Node.js
framework for building APIs. The framework and its companion libraries ship under
the `@warlock.js/*` scope (`core`, `cascade`, `cache`, `seal`, `auth`, `logger`,
`fs`, `scheduler`, …). Application code lives under `src/app/**`, organized one
module per domain noun.

## Skills come first — read them before anything else

**Before you work out how any package or framework feature works, read the
matching skill.** Skills are the authoritative, maintained source of truth for how
to use this project's packages and conventions. They are short and task-focused.

Whenever you need to know how to use a package (`@warlock.js/*`, `@mongez/*`) or
how to do a task (write a controller, define a model, add a migration, validate
input, cache, schedule a job, …), follow this order **strictly**:

1. **Read the relevant `SKILL.md` first.** Match the package name or the task to a
   skill's `name` / `description` / triggers, load that skill, and follow it.
2. **Only if no skill matches**, fall back to the package's own
   types / source / README under `node_modules/<pkg>`.
3. **The public internet is the last resort, not the first.** Do not web-search
   for how a `@warlock.js/*` or `@mongez/*` API works while a skill for it exists —
   the skill is more current and project-correct than anything online.

**Do not reverse-engineer how a package works by grepping for similar or existing
source files and copying their usage before you have checked the skills.** Existing
code can be outdated, mid-refactor, or simply wrong; the skill is the contract.
The rule is: **skill first, source second, web last.**

## Where skills live

- **Project conventions** — hand-authored skills in this repo's `skills/`
  directory (architecture, code standards, API design, etc. — listed below).
- **Package skills** — how to use each installed `@warlock.js/*` / `@mongez/*`
  package. These are synced from `node_modules` into your agent's skills
  directory on every install (Claude Code → `.claude/skills/`, Cursor →
  `.cursor/skills/`, GitHub Copilot → `.github/skills/`, Codex → `.codex/skills/`,
  and the equivalent directory for other agents).

If a skill you expect is missing, run `yarn skills:sync` (it also runs
automatically on `postinstall`).

## Available project skills (`skills/`)

- **api-design** — HTTP conventions: response envelopes, status codes, pagination,
  typed controllers, resources, and routes.
- **code-standards** — TypeScript style: `interface` (contracts) vs `type` (data),
  access modifiers on every class member, no `any`, single-responsibility files
  with the documented naming suffixes, JSDoc on the public surface.
- **data-and-persistence** — modeling, storing, and migrating data with
  `@warlock.js/cascade` (money as integer minor units, migrations, indexes).
- **module-boundaries** — how modules under `src/app/**` relate; one domain noun
  per module; what may import what.
- **security-baseline** — input validation at every boundary via `@warlock.js/seal`
  schemas, authentication, and secrets handling.
- **observability-and-resilience** — structured logging, retries, timeouts, and
  avoiding N+1 work.
- **testing-strategy** — Vitest test pyramid with co-located `*.spec.ts` files.
- **git-workflow** — conventional commits, branching, PRs, and CI gates.

## Commands

- `yarn dev` — start the dev server (`warlock dev`)
- `yarn build` — type-check then build for production (`tsc && warlock build`)
- `yarn start` — start the production server (`warlock start`)
- `yarn migrate` / `yarn migrate.fresh` / `yarn migrate.list` — run migrations
- `yarn seed` — run database seeders
- `yarn lint` / `yarn format` / `yarn tsc` — lint (eslint --fix), format
  (prettier), and type-check (`tsc --noEmit`)
- `yarn skills:sync` — re-sync skills from `node_modules` and regenerate the
  derived per-agent files from this `AGENTS.md`

## Code style

Follow the **code-standards** skill (`skills/code-standards/SKILL.md`) for all
TypeScript — read it before writing or reviewing any `.ts` / `.tsx`. In short:
`interface` for contracts and `type` for data shapes, no `any`, access modifiers
on every class member, single-responsibility files with the documented naming
suffixes, and JSDoc on the public surface. The bar is senior-level clean code, not
"it compiles."

## Boundaries

- Respect **module-boundaries** — do not reach across module internals.
- Never weaken the **security-baseline** — always validate input at boundaries.
- Follow **git-workflow** for commits and branches; do not commit or push unless
  explicitly asked.
- When you are unsure how a package or feature works, **stop and read its skill**
  rather than guessing from other files or the web.
