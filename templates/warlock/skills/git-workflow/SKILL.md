---
name: git-workflow
description: 'Git, branching, commit messages, PRs, and CI gates for this project — conventional commits with module-scoped types (`feat(orders): ...`, `fix(auth): ...`, `refactor(cart): ...`, `docs(users): ...`, `chore: ...`), branch naming (`feat/`, `fix/`, `chore/`, `refactor/`, `docs/` prefix + slug), PR size cap (~400 LoC), required reviewers, CI gates (`yarn tsc` / `yarn lint` / `yarn test` / `yarn audit --level=high`), no force-push to `main`, squash-merge policy, tagging and releases. Triggers: writing a commit message; opening / reviewing / merging a PR; naming a branch; setting up CI; user asks "commit format", "conventional commits", "branch naming", "how big should a PR be", "what CI gates do we need", "how do we release", "can I force push", "squash or merge", "scope in commit message", "what scopes are valid". Skip: code style inside files (load `skills/code-standards/SKILL.md`); deploy mechanics / pm2 setup; framework primitive questions; publishing / semantic-versioning of npm packages.'
---

# Git workflow

**Status:** Stable
**Applies to:** Every commit, branch, and pull request in the project.

The process layer that lets a team of N work without stepping on each other and lets a reader six months later understand why a line is there.

> **Sub-agent rule:** Before opening a commit or PR, read this file.

---

## 1. Commit messages — conventional commits

### 1.1 Format

```
<type>(<scope>): <imperative summary>

[optional body — explains the WHY when the diff doesn't]

[optional footer — BREAKING CHANGE, ticket refs, co-authors]
```

Examples:

```
feat(orders): add cancellation flow with refund + audit trail
fix(auth): reject expired refresh tokens on rotation
docs(users): document the profile-update endpoint
refactor(cart): extract totals calculation into a util
```

### 1.2 Types

| Type        | Use for                                          |
| ----------- | ------------------------------------------------ |
| `feat`      | New user-visible feature or capability           |
| `fix`       | Bug fix                                          |
| `refactor`  | Internal restructure with no behaviour change    |
| `docs`      | Documentation only (skills, README, code docs)   |
| `test`      | Adding or updating tests only                    |
| `chore`     | Tooling, config, scripts — no app code change    |
| `perf`      | Performance improvement                          |
| `build`     | Build system or external dependencies            |
| `ci`        | CI configuration                                 |
| `style`     | Formatting only (rare — Prettier handles this)   |

### 1.3 Scope

The scope identifies what area of the codebase changed. Use:

- The module name for app-level changes: `feat(orders): ...`, `fix(auth): ...`
- Omit when the change is genuinely cross-cutting: `chore: bump node version`

### 1.4 Summary

- Imperative present tense: "add" not "added", "fix" not "fixed"
- Under 72 characters
- No trailing period
- Lowercase first word (after the type / scope)

### 1.5 Body — explain the WHY

If the diff doesn't make the reasoning obvious, the body does. One short paragraph is usually enough. Skip the body for trivial changes.

### 1.6 Breaking changes

Either:

- Add `!` after type: `feat(api)!: rename /users to /accounts`
- Or include a `BREAKING CHANGE:` footer with details

Both work; pick one per project and use it consistently. Project default: footer (more visible in `git log` output).

### 1.7 Ticket references

When the change traces to a ticket, reference it in the footer:

```
feat(orders): add cancellation flow

Refs: WAR-1234
```

---

## 2. Branch naming

### 2.1 Format

`<type>/<short-slug>` — lowercase, hyphenated, no spaces.

Examples:

```
feat/order-cancel-endpoint
fix/login-rate-limit
refactor/extract-cart-totals-helper
docs/skills-code-standards-section-9
chore/bump-vitest-to-4
```

### 2.2 Types match commit types

Use the same vocabulary as commits: `feat/`, `fix/`, `refactor/`, `docs/`, `test/`, `chore/`, `perf/`, `ci/`.

### 2.3 Optional ticket prefix

When the team uses ticket tracking, `<type>/<ticket-id>-<slug>` is fine:

```
feat/war-1234-order-cancel-endpoint
```

### 2.4 Never work directly on `main`

Even one-line doc fixes get a branch. The protected-branch rule (§ 7) makes this enforced, not optional.

---

## 3. Pull requests

### 3.1 Size cap — under 400 lines changed

400 lines of meaningful changes (excluding lockfiles, generated code, snapshot data). Beyond that, the review becomes performative — reviewers skim, real issues slip through.

### 3.2 When it's bigger, split

A common shape:

1. **Prep PR** — pure refactor / extraction, no behaviour change. Lands first.
2. **Feature PR** — the actual new logic, smaller because the prep already landed.
3. **Tests PR** — coverage for the feature.

Each PR is independently mergeable, independently reviewable.

### 3.3 Description template

```markdown
## What
One-line summary of the change.

## Why
The reason — link to a ticket, design doc, or bug report.

## How to verify
Steps a reviewer can take to confirm it works.

## Screenshots / recordings
If UI or output changed.

## Notes for reviewer
Anything that's intentionally weird or worth knowing.
```

### 3.4 Self-review first

Read your own diff before requesting review. The number of "oh I forgot to remove that" moments you catch yourself saves the reviewer a round-trip and saves your reputation.

### 3.5 Required reviewers

- **Default** — 1 reviewer
- **Security, auth, payments, data migrations** — 2 reviewers, one with domain ownership

---

## 4. Review

### 4.1 Read the diff cover to cover

Not just the changed lines — the surrounding context too. A line that looks fine in isolation may be obviously broken in context.

### 4.2 Suggestion vs. blocker — label it

- **Blocker**: must change before merge. State it as such.
- **Suggestion**: nice-to-have, optional, can land later. Mark it explicitly so the author isn't guessing.
- **Question**: you don't understand something — ask, don't assume.

### 4.3 Approve means "I'd be on call for this"

Approval is a load-bearing signature. Approve only if you're comfortable owning the code after the author rotates off the project.

### 4.4 No "LGTM" without reading

A drive-by approve is worse than no approve — it gives false confidence. If you don't have time to review properly, say so and let someone else.

---

## 5. CI gates

Every PR runs these. All must pass before merge. The exact commands match `package.json` scripts:

| Gate                          | Command                       | Blocks on                          |
| ----------------------------- | ----------------------------- | ---------------------------------- |
| Type-check                    | `yarn tsc`                    | Any TS error                       |
| Lint                          | `yarn lint`                   | Any ESLint error                   |
| Tests                         | `yarn test --run`             | Any failed test                    |
| Coverage (recommended floor)  | `yarn test:coverage`          | TBD per team policy                |
| Dependency audit              | `yarn audit --level=high`     | High / critical vulnerabilities    |
| Format check                  | `yarn format --check`         | Any unformatted file               |

Additional rules:

- No `.only` / `.skip` in committed tests (lint rule or CI grep).
- No `console.log` in committed code (lint rule).
- No `TODO` without a ticket reference (warning, not blocker).

---

## 6. Merging

### 6.1 Squash merge

One commit per PR onto `main`. The squashed commit message is the conventional-commit format from § 1, generated from the PR title.

This keeps `main`'s history readable — one logical change per commit — while allowing PR branches to have messy work-in-progress commits.

### 6.2 `main` is always green

If `main` is red, the team's first job is to make it green. No new PRs merge until it is.

### 6.3 Hotfix flow

Same conventional commits + same CI gates + expedited review (1 reviewer, can be self-review for true emergencies if a maintainer is on the call). Hotfix PRs are still squash-merged.

---

## 7. Protected branches

`main` is protected:

- No direct push.
- No force-push.
- Required CI checks pass before merge.
- Required reviewer count met.
- Linear history (squash merges only — no merge commits).

These are enforced in the repo settings, not just on the honour system.

---

## 8. Tags and releases

### 8.1 Versioning

For a single-monolith app (most templates), versioning is optional — date-tags work fine if you want them at all.

For a library / framework package, semver:

```
v<major>.<minor>.<patch>
```

### 8.2 Changelog

Generate from conventional commits — every well-formed history can be turned into a readable changelog automatically. Tools: `changesets`, `conventional-changelog`, or the framework's own release script.

### 8.3 Release notes

For user-facing apps, ship release notes alongside the tag — what changed, what to test, any known issues.

---

## 9. Review checklist

Before merging:

- [ ] Commit message follows `<type>(<scope>): <imperative summary>`
- [ ] Branch name matches `<type>/<slug>`
- [ ] PR under ~400 lines changed (or split into staged PRs)
- [ ] Self-reviewed before requesting review
- [ ] Description filled (what / why / how to verify)
- [ ] Required reviewer count met
- [ ] All CI gates green
- [ ] No `.only` / `.skip` / `console.log` left in
- [ ] Squash-merge selected, squashed message in conventional format
- [ ] `main` stays green after merge
