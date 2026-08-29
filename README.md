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

## License

This project is licensed under the MIT License.
