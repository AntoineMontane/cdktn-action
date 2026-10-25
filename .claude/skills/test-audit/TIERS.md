# Test tiers and commands

Reference for [SKILL.md](SKILL.md): where each tier lives, what it owns, how CI
routes it, and the commands that run it. This is the part that changes when
workflows or scripts change; check it against `.github/workflows/` and
`package.json` when in doubt.

## Tiers

| Tier          | Where                                                                       | Owns                                                                                                                                 | CI routing                                                                                     |
| ------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Static gates  | `npm run check` (Biome lint + format), `npm run typecheck` (tsc)            | types for `src/`, `__tests__/` and the configs; formatting and lint                                                                  | `ci.yml` `build` job, every push to `main` and every PR                                        |
| Bundle        | `npm run package` (Rolldown to `dist/index.js`), compared by `check-dist.yml` | the committed `dist/` is exactly what `src/` builds to, so a tag runs reviewed source                                                | `check-dist.yml` only when `src/**`, `package*.json`, `rolldown.config.ts` or `tsconfig.json` change; `release.yml` on tags |
| Unit          | `__tests__/*.test.ts` (Vitest)                                              | each module's behavior through its exports, and `run()` orchestration with `@actions/core` and `@actions/exec` mocked                | `ci.yml` `build` job; `release.yml` on tags                                                    |
| Smoke         | `ci.yml` `smoke` job, fixture `__fixtures__/smoke`                          | the committed `dist/` running as a real action (`uses: ./`) against a `cdktn init` project and real OpenTofu, synth-only, `exitCode` | `ci.yml`, every push to `main` and every PR                                                    |
| Workflow lint | `security.yml`: actionlint and zizmor                                       | workflow syntax and Actions security findings                                                                                        | every push to `main`, every PR, and weekly                                                     |

## What a green run proves

- Vitest transpiles and does not type-check. A type-shape assertion is the job
  of `npm run typecheck`, not a runtime test.
- Unit tests import `src/` directly. A stale `dist/` still passes them; only
  `check-dist.yml` (or `release.yml`) catches the drift. The `ci.yml` `build`
  job runs `npm run package` but never compares the result.
- `check-dist.yml` is path-filtered. A change to `action.yml`, the README, or
  tests alone does not run it.
- The smoke job runs the `dist/` committed on the PR head, so a PR whose
  `dist/` was not rebuilt smoke-tests the old code.
- The smoke job covers `synth-only` with OpenTofu and checks only `exitCode`
  and the synthesized file. Plan, apply, destroy, Terraform, the `outputs`
  output, and PR comments have no end-to-end coverage; their only proof is
  the unit tier.
- Vitest's `include` is `__tests__/**/*.test.ts`. A test file anywhere else,
  including the fixture's own `jest` script, never runs.

## Commands

Unit tests. `-t` is a regular expression on the test name.

```bash
npx vitest run __tests__/<file>.test.ts -t "<name>"
npm test                 # every unit test
npm run coverage         # with v8 coverage over src/ (reported, not thresholded)
```

Static gates, the bundle, and all of them together, as CI runs them:

```bash
npm run check            # Biome lint + format check; npm run check:fix to apply
npm run typecheck
npm run package          # rebuild dist/; commit it with the src/ change
git status --porcelain dist/   # empty means dist/ matches src/
npm run all              # check + typecheck + test + package
```

The smoke test has no local script; CI is its runner. The nearest local check
is `npm run local-action` with a `.env` copied from `.env.example` and
`INPUT_WORKINGDIRECTORY=__fixtures__/smoke` (after `pnpm install` there, with
OpenTofu on PATH). It runs `src/index.ts`, not the committed `dist/`, so it
does not prove the bundle.

Workflow lint (installed by `mise install`):

```bash
actionlint
zizmor .
```
