# Test-pruning campaign

Campaign mode prunes one area's whole test surface: one `src/` module and
every test that exercises it, such as `src/comment.ts` with
`__tests__/comment.test.ts` and the `run()` cases in `__tests__/action.test.ts`
that reach it, or the smoke job and its fixture. The tiers, value bar,
retention bar, candidate evidence, and validation in [SKILL.md](SKILL.md)
apply to every lane; [TIERS.md](TIERS.md) has the commands. This file adds the
order of work. Each step ends on its completion criterion; do not start the
next step early.

A campaign plans the whole area once and lands it as a series of PRs, one
lane each, so that every PR stays reviewable in under 30 minutes. Keep the
ledger and plans in the campaign's working notes or the tracking issue, not in
the repository.

## 1. Baseline

Record the area's test, fixture, and production line counts and every test
file's result at a pinned `main` SHA. Run `npm ci`, then `npm test`; unit
tests import `src/` directly, so no `dist/` build is needed for them. Record
the Node version (`.nvmrc`). For the smoke job, take the baseline from a green
`ci.yml` run on that SHA, and record the `cdktnVersion` and OpenTofu version
it used; there is no local smoke runner.

Keep three lists apart from the passes: baseline failures, tests that skipped
(`it.skip`, `it.todo`, a platform gate), and tests that passed only on retry.
A baseline failure is a bug report until proven stale.

Done when every in-scope test file has a recorded result that is a pass, a
failure, or a named skip.

## 2. Lanes and inventory

Split the surface into **lanes** along production owner boundaries, not test
file names. The owners are:

- orchestration in `src/action.ts`: `resolveCli`, `buildNpxArgs`, the CLI
  environment, `readStackOutputs` and the `stackOutputs` output, and `run()`;
- inputs and modes in `src/inputs.ts` and `src/models.ts`, including the
  deprecated cdktf aliases; these have no test file of their own and are
  reached through `run()`;
- engine detection in `src/ensure-binary.ts`;
- PR comments in `src/comment.ts`: marker, rendering, and `CommentController`;
- the `ci.yml` `smoke` job and `__fixtures__/smoke`.

`__tests__/action.test.ts` drives `run()` and so spans several owners; assign
each of its cases to the lane whose contract it asserts.

Done when every test declaration, and every smoke-job assertion, belongs to
exactly one lane.

## 3. Read-only ledger per lane

Give each lane to its own read-only agent when parallel agents are available.
The agent reads every assigned test in full, including parameter tables and
the mocks of `@actions/core`, `@actions/exec`, and Octokit it sets up. It also
reads the production owners and their entry points, callers, history, and the
`action.yml` inputs and outputs they serve. Each test declaration goes into a
written **ledger** with one mark. An `it.each` is one declaration unless its
rows need different marks; then mark each row.

- `R`: retain, naming the contract and the bug it catches; a retained test that
  only moves to a better-named file stays `R` with the move noted;
- `F`: retain the contract but repair the assertion, such as an `expect` that
  never runs, an un-awaited rejection, or a `toHaveBeenCalledWith` standing in
  for the step output or file the test is named for;
- `C`: consolidate, naming the owner that absorbs the assertion first: a sibling
  table case, the owner's own `describe`, or one engine or CLI instead of both;
- `D`: delete, naming the proof that remains, or why no contract exists.

Judge a test by its assertions, not its name. Mark a skipped test `F` or `D`,
never `R`.

Done when every declaration in the lane has a mark and an evidence line.

## 4. Layer plan per lane

Treat the per-test ledger as input, not as the edit list. A second read-only
pass, starting from the ledger, looks for the redundant **layer**: a contract
proven again through `run()` after a direct test of its owner already pins it
(an argv `buildNpxArgs` proves), once per engine or CLI where the code does
not branch, or in both the unit tier and the smoke job. Name the **keeper**
for each contract. Prefer the real boundary (the outputs `run()` sets, a file
in a temp directory, the exit code and `setFailed` message) over a call shape
on a mocked collaborator, and the cheapest tier that can still observe the
failure. Correct any ledger errors this pass finds.

Done when each lane plan names its retired tests, its keeper per contract,
the assertions to carry into keepers, the fixtures retired, and the test-only
production seams unlocked.

## 5. Cutover

Edit lane by lane, one PR per lane. Serialize changes to shared test
configuration (`vitest.config.ts`) and to mock setup that several lanes'
cases share in `__tests__/action.test.ts` through one owner. With each lane,
remove the test-only production seams it unlocks: exports, inputs,
environment variables, and injection parameters. Removing a seam changes
`src/`, so run `npm run package` and commit `dist/` with it.

Keep CI routing true to the files:

- unit tests are discovered by Vitest's `include`, `__tests__/**/*.test.ts`;
  a test file anywhere else never runs;
- `check-dist.yml` runs only when `src/**`, `package.json`,
  `package-lock.json`, `rolldown.config.ts` or `tsconfig.json` change, so a
  test-only PR does not exercise it;
- the smoke job is the `smoke` job in `ci.yml`. Its `cdktnVersion` must stay in
  step with the `cdktn` version in `__fixtures__/smoke/package.json`, and its
  checks name the fixture's stack (`cdktf.out/stacks/smoke/cdk.tf.json`);
- `__fixtures__/smoke` is the unmodified output of
  `cdktn init --template typescript-pnpm`: pnpm, with its own `jest` scaffold.
  CI installs it with `pnpm install --frozen-lockfile`, so a change to its
  `package.json` needs `pnpm-lock.yaml` regenerated there with pnpm. Its jest
  test is template scaffolding that no CI job runs, and Biome ignores the
  fixture; it is not part of this repo's test surface. Regenerate the fixture
  rather than hand-edit it.

Put durable test-ownership rules where contributors read them, the
Development section of `README.md`, drawn from mistakes this campaign actually
found.

Done when every lane plan is applied and each lane's keepers pass.

## 6. Preservation review

Before claiming a lane complete, have an independent reviewer compare its
deleted coverage against the keepers. They look for contracts that lost their
only proof, including a matrix cell: an engine (OpenTofu, Terraform), a CLI
(`cdktn-cli`, `cdktf-cli`), a mode, or a deprecated alias. They also look for
new assertions that cannot fail.

For each restored contract, make one deliberate **mutation** of the production
owner in `src/` and confirm the keeper goes red with `npx vitest run`. Then
restore the source byte for byte (`git diff src/` empty) and leave `dist/`
untouched.

Done when every reported gap is restored or rejected with source evidence, and
every restored contract has a caught mutation.

## 7. Product defects

A baseline failure that survives into a keeper is a bug report. Fix it at its
owner as a separate `fix:` PR with a rebuilt `dist/`, and prove it through the
real user flow (`npm run local-action` against a project, or the smoke job),
with a **control** run that reverts the fix and shows the old behavior. Record
unrelated product discrepancies, and contracts found with no test owner at
all, as follow-ups instead of fixing them in the campaign.

Done when each repaired defect has a failing control and a passing candidate
on the same harness.

## 8. Reconcile and hand off

Before each lane PR, refresh from `main`. When `main` modified a test the
campaign deleted, re-evaluate the incoming change first: port every new
contract and regression it added into the keeper. Only then keep the
deletion. Rerun `npm run all`, and let CI run the smoke job and, when `src/`
changed, `check-dist.yml` on the refreshed head.

Hand off with the [SKILL.md](SKILL.md) report, plus:

- baseline and final test and fixture line counts, with production counted
  separately;
- lanes, retired layers, and keepers;
- skipped tests enabled or deleted;
- preservation gaps found and their mutations;
- product defects with control and candidate proof.
