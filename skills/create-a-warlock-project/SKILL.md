---
name: create-a-warlock-project
description: 'Scaffold a brand-new Warlock.js project with `create-warlock` — the interactive wizard and its non-interactive flag set. A single `--yes` command scaffolds the entire app from flags. Every flag (`--name`, `--db`, `--pm`, `--features`, `--ai`, `--git/--no-git`, `--jwt/--no-jwt`, `--no-db`, `--yes`), every valid database-driver / feature / AI-provider key, opting out of a database (`--db=none` / `--no-db`, which removes `src/config/database.ts`), and the directory tree the template emits. Triggers: `create-warlock`, `yarn create warlock`, `npm create warlock`, `npx create-warlock`; "scaffold a warlock app", "start a new warlock project", "create-warlock flags", "non-interactive warlock scaffold", "scaffold without a database", "which features can I pass to create-warlock". Skip: running an already-created project (`@warlock.js/core/run-app/SKILL.md`); adding a feature to an existing project (`warlock add`, `@warlock.js/core/add-connector/SKILL.md`); generating a module inside a project (`@warlock.js/core/create-module/SKILL.md`).'
---

# create-warlock — scaffold a new project

`create-warlock` builds a fresh Warlock.js project: it copies the `warlock` template, substitutes the project name, wires the chosen database driver into `.env` (or, when you opt out with `--db=none`, removes `src/config/database.ts`), then delegates every optional package install to the project's own `warlock add` so dependency versions are never duplicated by the scaffolder.

## The shape

```bash
# Interactive wizard (recommended for humans)
yarn create warlock
# or: npm create warlock@latest / pnpm create warlock / npx create-warlock

# Non-interactive (CI, agents, reproducible setups) — one command scaffolds the whole app
npx create-warlock my-app --yes --db=postgres --features=test,redis --ai=ai-openai

# No database at all
npx create-warlock my-api --yes --no-db --features=test
```

The first positional argument is the project name; it also becomes the directory created under the current working directory. If that directory already exists, the command aborts — it never overwrites.

## Interactive flow

The wizard asks, in order:

1. **Project name** — required.
2. **Package manager** — chosen from the managers detected on the system (npm is always offered; yarn / pnpm appear if installed).
3. **Database driver** — a single select: a driver, or **None** to scaffold without a database (see keys below).
4. **Features** — a multiselect of optional packages (`react` is pre-checked).
5. **AI providers** — a multiselect; picking any one pulls `@warlock.js/ai` automatically.
6. **Initialize Git?** — yes/no.
7. **Generate JWT secret keys?** — yes/no. If no, the cache is warmed instead.

## Non-interactive flags

Pass `--yes` (or `-y`) to skip every prompt and build from flags with defaults.

| Flag                     | Takes value | Default        | Purpose                                                              |
| ------------------------ | ----------- | -------------- | ------------------------------------------------------------------- |
| `<positional>` / `--name`| yes         | — (required)   | Project name + target directory.                                    |
| `--db`                   | yes         | `mongodb`      | Database driver key (`mongodb`, `postgres`, or `none`).             |
| `--no-db`                | no          | —              | Opt out of a database — shorthand for `--db=none`.                  |
| `--pm`                   | yes         | auto-detected  | Package manager (`npm` / `yarn` / `pnpm`).                           |
| `--features`             | yes (CSV)   | none           | Comma-separated optional feature keys.                              |
| `--ai`                   | yes (CSV)   | none           | Comma-separated AI provider keys (auto-pulls `@warlock.js/ai`).     |
| `--git` / `--no-git`     | no          | off            | Initialize a Git repo (`git init` + `main` branch + initial commit).|
| `--jwt` / `--no-jwt`     | no          | off            | Generate JWT secrets via the project's `jwt` script.               |
| `--yes` / `-y`           | no          | off            | Non-interactive mode.                                               |

Value flags accept either `--db=postgres` or `--db postgres`. Unknown `--features` / `--ai` keys fail fast before any install.

## Valid keys

**Database drivers** (`--db`):

| Key        | Default port | Status      |
| ---------- | ------------ | ----------- |
| `mongodb`  | 27017        | available   |
| `postgres` | 5432         | available   |
| `mysql`    | 3306         | coming soon (disabled in the wizard) |
| `none`     | —            | opt out — no driver, no driver package, `src/config/database.ts` removed |

**Features** (`--features`): `react`, `react-email`, `mail`, `ses`, `image`, `s3`, `redis`, `scheduler`, `herald`, `socket`, `swagger`, `postman`, `test`.

**AI providers / packages** (`--ai`): `ai-openai`, `ai-google`, `ai-anthropic`, `ai-bedrock`, `ai-ollama`, plus the capability packages `ai-tools`, `ai-panoptic`, `ai-workspace`. Any pick auto-pulls the core `@warlock.js/ai` package.

> The scaffolder holds **no dependency versions** for these — the keys map to `warlock add <key>`, whose feature map in `@warlock.js/core` is the single source of truth. A feature that resolves there will install; one that does not is rejected.

## What gets generated

```
my-app/
├─ .env                         # copied from .env.example, name + DB driver/port substituted
├─ .env.example
├─ .gitignore                   # renamed from the template's _.gitignore
├─ package.json                 # "name" set to the project name
├─ tsconfig.json
├─ warlock.config.ts
└─ src/
   ├─ config/                   # app, auth, cache, database, http, log, mail, repository, storage, tests, validation
   └─ app/
      ├─ auth/                  # controllers, schema, services, requests, utils, OTP model + migration
      ├─ users/                 # model, migration, resource, repository, create + list controllers, schema, events, seeds, commands
      ├─ posts/                 # sample module — model, migration, resource, schema, create + update controllers
      ├─ uploads/               # file-serving controller (fetch-uploaded-file)
      └─ shared/                # router/locale utils, home page, scheduler, global columns schema
```

The template ships a working auth module (login / logout / logout-all / refresh / me / forgot + reset password via OTP), a `users` module, and a sample `posts` module — all using the current framework surface: schemas via `v` from `@warlock.js/seal`, controllers typed with `GuardedRequestHandler` carrying a `.validation = { schema }`, models on `@warlock.js/cascade`, and declarative migrations via `Migration.create`.

## Setup steps the scaffolder runs

1. Copy template → substitute name → wire `DB_DRIVER` / `DB_PORT` into `.env` (or, for `--db=none`, remove `src/config/database.ts`).
2. Install base dependencies (so the `warlock` binary exists).
3. `warlock add <driver> <features...> <ai...> --no-install`, then one batched install. The `<driver>` is omitted for `--db=none`.
4. `git init` (if `--git`).
5. `jwt` script (if `--jwt`) — otherwise `warlock --warm-cache`.

Failures surface the error and halt; there is no rollback. After it finishes, `cd my-app` and run the dev server.

## Gotchas

- **The target directory must not already exist** — the command exits rather than merge into it.
- **`--db=none` / `--no-db` scaffolds without a database** — no driver, no driver package, and `src/config/database.ts` is deleted. The framework's database connector is gated on that file, so the app boots with no database. The `DB_*` lines stay in `.env` (harmless) as a template for adding one back later.
- **`--ai` never takes `ai` itself.** Pick a provider (`ai-openai`, …); the core `@warlock.js/ai` package is pulled in transitively.
- **`mysql` is disabled** in the wizard; passing `--db=mysql` resolves the driver record but the driver is marked coming-soon.
- **Versions are not the scaffolder's job.** If a feature installs the wrong version, the fix is in core's `warlock add` feature map, not here.

## See also

- `@warlock.js/core/run-app/SKILL.md` — `warlock dev` / `build` / `start` once the project exists.
- `@warlock.js/core/create-module/SKILL.md` — generate a new module inside the project.
- `@warlock.js/core/add-connector/SKILL.md` — what `warlock add` wires when a feature pulls a connector.
