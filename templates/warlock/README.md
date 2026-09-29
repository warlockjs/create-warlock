# Warlock.js app

A [Warlock.js](https://warlock.js.org) application — a TypeScript framework for
building APIs and, optionally, server-rendered React pages on the same server.

Full documentation: [warlock.js.org](https://warlock.js.org).

## Requirements

- Node.js **22.13** or newer
- The database you picked when scaffolding (MongoDB or PostgreSQL), running and
  reachable with the settings in `.env` — skip this if you scaffolded with no
  database

## Getting started

The scaffolder already installed dependencies and created `.env` from
`.env.example`. Start the development server:

```bash
npm run dev
```

The app listens on `http://localhost:2030` by default (`HTTP_PORT` in `.env`).
It restarts on file changes.

> The commands below use `npm run`. Use your package manager's equivalent —
> `pnpm dev`, `yarn dev`, `bun run dev` — if you picked another one.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with live reload |
| `npm run build` | Type-check and build for production |
| `npm run start` | Run the production build (run `build` first) |
| `npm run migrate` | Run pending database migrations |
| `npm run migrate.fresh` | Drop everything and re-run all migrations |
| `npm run migrate.list` | List migrations and their status |
| `npm run seed` | Run the database seeders |
| `npm run jwt` | Generate a JWT secret into `.env` |
| `npm run tsc` | Type-check without building |
| `npm run lint` | ESLint, auto-fixing what it can |
| `npm run format` | Prettier over `src/` |
| `npm run skills:sync` | Refresh the AI agent skills (see below) |

The `warlock` CLI has more than the scripts expose — run `npx warlock --help`
for the full list. Two worth knowing:

```bash
npx warlock routes   # every registered route, with filters (--method, --path, --name)
npx warlock doctor   # boots the app read-only and reports on routes, config, connectors and drivers
```

## Production

```bash
npm run build
npm run start
```

`start` prints its "started" line only once the server is actually serving.
Set `NODE_ENV=production` and your production `.env` values on the host.

## Project structure

```
src/
├── app/                 # one module per domain (users, auth, posts, …)
│   └── <module>/
│       ├── main.ts          # module entry, auto-loaded
│       ├── routes.ts        # the module's routes, auto-loaded
│       ├── controllers/
│       ├── services/
│       ├── models/          # models + their migrations
│       ├── repositories/
│       ├── resources/       # response shaping
│       └── schema/          # request validation
├── config/              # app, database, cache, http, mail, storage, …
└── web/                 # SSR pages — only when you chose the web stack
warlock.config.ts        # framework configuration
storage/                 # local file storage
.env                     # environment (not committed)
```

The example modules (`users`, `auth`, `posts`) are there to show the patterns —
keep, change or delete them.

## Generating code

```bash
npm run gen -- <module>                    # a whole module
npm run gen.c -- <module>/<name>           # controller
npm run gen.s -- <module>/<name>           # service
npm run gen.m -- <module>/<name>           # model
npm run gen.r -- <module>/<name>           # repository
npm run gen.rs -- <module>/<name>          # resource
npm run gen.mig -- <module>/<model>        # migration for a model
```

## Web pages (web stack only)

If you scaffolded with the web stack, `src/web` holds server-rendered React
pages served by the same process as the API:

- `src/web/root.tsx` — the HTML document every page renders inside
- `src/web/home/index.page.tsx` — the page at `/`
- `src/web/404.page.tsx` — the not-found page
- `*.page.tsx` files under `src/web` are pages; the folder path is the URL

Styles live in imported CSS files (`src/web/app.css`). The API-only stack has no
`src/web`; add it later with `npx warlock add web`.

## Adding features later

Anything you didn't pick when scaffolding can be added afterwards:

```bash
npx warlock add test          # Vitest, plus test / test:watch / test:coverage scripts
npx warlock add redis queue   # several at once
```

Run `npx warlock add --list` for the available features.

## Tests

Tests need the `test` feature. If you picked it, run:

```bash
npm test
```

Otherwise add it with `npx warlock add test`.

## AI coding agents

This project ships instructions and skills for AI coding agents:

- `AGENTS.md` — the source of truth for agent instructions. Tool-specific files
  (`CLAUDE.md`, …) are generated from it; edit `AGENTS.md`, then run
  `npm run skills:sync`.
- `skills/` — project conventions (code standards, API design, testing, …).
  Package skills for every `@warlock.js/*` dependency are synced in on install.

## Learn more

- [Documentation](https://warlock.js.org)
- [Changelog](https://warlock.js.org/changelog)
