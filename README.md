# Create Warlock

This package is used to generate a [Warlock.js](https://warlock.js.org) project.

## Usage

Run the following command:

```bash
npx create-warlock
```

Or

```bash
yarn create warlock
```

Or

```bash
pnpm create warlock
```

Then follow the instructions, it is easy as that!

### Flags

```bash
create-warlock --help       # or -h — print usage and exit, no scaffolding runs
create-warlock --version    # or -v — print the installed version and exit
```

Both exit before any prompt, filesystem write, or network call — including
before a positional project name or any other flag is honoured.

## Developing this package locally

`bin/create-app.js` imports `../esm/index.mjs` — a build output, not the
TypeScript source under `src/`. There is no `esm/` directory in the checkout,
so **the local bin only works after a build has produced it.** Running
`node bin/create-app.js` (or the linked `create-warlock` bin) against a fresh
checkout fails with a module-not-found error until that build step has run.
During development, use `npm run start` (`tsx ./index.dev.ts`), which runs the
TypeScript source directly and needs no build.

### The manifest is rewritten at publish time — on purpose

`package.json` in this checkout declares:

- `"main"/"module"/"typings": "./src/index.ts"` — pointing at TypeScript
  source, not the compiled `esm/` output the published bin actually imports;
- `"@warlock.js/fs": "*"` — a wildcard, not a real semver range.

Neither is a bug. This package is published in lockstep with the rest of the
`@warlock.js/*` family; the release tooling compiles `src/` to `esm/` and
rewrites both the entry-point fields and every `@warlock.js/*` dependency to
the version being released, as the last step before `npm publish`. Outside
that tooling — i.e. everywhere in this checkout — those fields stay as
source-pointers and wildcards deliberately, so local development never has to
chase a version that has not been cut yet.

**Coverage seam:** the rewrite itself lives in release tooling outside this
package's write fence, so nothing under `specs/` exercises it. `specs/`
proves the CLI's own behavior (flag parsing, `--help`/`--version`,
`createNewApp` wiring); it does not — and cannot, from in here — assert that
the publish step produces a correct `esm/index.mjs` or correctly rewritten
dependency versions. That remains unresolved from this package's fence and
should be verified against a real published (or `--install-links`) install,
not from source.

## CI

`.github/workflows/ci.yml` runs two jobs:

- **`specs`** — on pushes to `main`/`master` and on pull requests: `node scripts/check-resolver-boundaries.mjs`
  (below), a smoke test that the built CLI's `--version` output matches `package.json`, then
  `vitest`.
- **`scaffold-typecheck`** — scaffolds a real project with the current scaffolder, installs
  it, and runs that project's own `tsc --noEmit` (`npm run typecheck:scaffold`; see the
  header of `scripts/typecheck-scaffold.mjs` for why this can't be done by typechecking
  `templates/warlock/` in place).

Both jobs also run nightly (`cron "0 4 * * *"`) and on `workflow_dispatch`, in addition to
push/PR — `scaffold-typecheck` installs the framework from the registry, so a framework
release alone can turn it red without anyone touching this repo, and the nightly run is what
surfaces that the same day rather than when the next contributor happens to run it.

### Resolver-boundary check

`scripts/check-resolver-boundaries.mjs` treats every `package.json` in the checkout as an
independent publish boundary. It walks each package's `tsconfig.json` `compilerOptions.paths`
and any `vite.config.*` / `vitest.config.*` alias, and fails (exit 1, one line per violation)
if a target resolves outside that package's own directory. An alias inside the package (e.g.
pointing `app/*` at its own `src/*`) is fine; one that reaches into a sibling checkout is not
— it resolves in this monorepo today and breaks the moment the package is installed on its
own, which nothing else here catches before publish. Run it directly with
`node scripts/check-resolver-boundaries.mjs [root]` (defaults to this package's root); its
pure logic is exported as `findResolverBoundaryViolations` and covered by
`specs/resolver-boundaries.spec.ts`.

## License

This project is licensed under the MIT License.
