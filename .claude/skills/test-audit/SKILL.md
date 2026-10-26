---
name: test-audit
description: "Invoke whenever writing, changing, reviewing, or sweeping tests. Authoring gate for new tests plus audit workflow for low-value, implementation-coupled, or duplicative tests and the test-only production seams they demand."
---

# Test Audit

Three modes, one value bar. Authoring mode gates every new or changed test at
write time. Audit mode runs focused sweeps of tests that re-assert source,
duplicate stronger proof, couple behavior to implementation, or keep test-only
production seams alive. Continue broad audits as separate coherent follow-up
PRs; optimize for confidence, not deletion count. Campaign mode prunes one
whole subsystem's test surface (one `src/` module and everything that tests
it); before starting one, read [CAMPAIGN.md](CAMPAIGN.md).

## Test tiers

Every contract has one primary owning tier. Know the tiers before judging a
test; [TIERS.md](TIERS.md) has where each lives, how CI routes it, what a
green run does and does not prove, and the commands.

- Static gates (`npm run check`, `npm run typecheck`): types, lint, format.
- Bundle (`npm run package`, `check-dist.yml`): the committed `dist/` matches
  `src/`.
- Unit (`__tests__/*.test.ts`, Vitest): each module through its exports, and
  `run()` with `@actions/core` and `@actions/exec` mocked.
- Smoke (`ci.yml` `smoke` job): the committed `dist/` run as a real action
  against a `cdktn init` fixture and real OpenTofu, synth-only.

## Authoring gate

Before adding any test, answer five questions; a missing answer means do not
add it yet:

1. What observable behavior, invariant, or independent contract does it protect?
2. What credible regression makes it fail?
3. Which [tier](#test-tiers) owns it? Use the cheapest tier that can observe
   the failure. Argument building, input parsing, engine detection, output
   wiring and comment rendering belong in a unit test. Extending the smoke
   test needs a risk only the committed bundle, the real CLI, or a real
   engine can show.
4. Why does existing coverage not already catch that failure? Each contract has
   one primary test owner at the strongest boundary; another tier needs its
   own distinct risk. Prefer extending a table-driven case or shared
   fixture over a near-duplicate test; consolidate duplicated setup in the same
   change.
5. Does it need a production seam (export, input, environment variable,
   injection parameter) that no production caller needs? If yes, move the test to the
   real boundary instead.

Then check the test against every [junk pattern](#junk-patterns); a match fails
the gate unless the [retention bar](#retention-bar) names the contract it
independently guards. A test that would break under behavior-preserving
refactoring is asserting implementation, not behavior; rewrite it at the
owning boundary before landing it.

Bug regression tests must fail on the pre-fix code for the intended reason and
pass after the owner-boundary repair. A regression test that never demonstrably
failed proves the mock, not the fix. One regression at the owner boundary
covers the bug; do not replay the same scenario at every tier it crosses.

Coverage (`npm run coverage`) is reported but never thresholded; a test added
only to move the number fails the gate.

## Snapshots

This repo has no snapshot tests today. If one is added (a rendered PR
comment, say), remember that a snapshot is an expected value produced by the
code under test, so it is a contract only on these terms:

- The fixture isolates one shape and the entry is small enough to review line
  by line. Then the reviewed text is the golden file, and it is the contract
  when that text is what users receive.
- A test named for a property (the no-changes icon, suppressed output, an escaped
  description) asserts that property directly. An entry too large to review,
  or a whole comment re-snapshotted to check one string, proves only that the
  output did not change.
- Update only the snapshot file you meant to change
  (`npx vitest run <file> -u`); a repository-wide `-u` is for a deliberate
  migration, where every changed entry is still reviewed.

## Junk patterns

The shared checklist for both modes: the authoring gate rejects a new test that
matches one, and audits hunt for existing tests that do.

- assertion-free coverage probes, and "does not throw" as the only assertion
  where an output or error text is observable;
- assertions that cannot run or cannot fail: an `expect` inside a loop over an
  empty match, an un-awaited `expect(...).rejects`, a truthiness check on a
  function reference, a negative `toContain` on a string the code never emits,
  an inequality between values that differ by construction;
- self-comparisons and identity copiers, such as building an object literal and
  asserting its own fields;
- copied fixtures, inventories, manifests, or export lists;
- exact source, import, or string greps;
- private predicate or call-shape tests duplicated at real boundaries, such as
  `toHaveBeenCalledWith` on a mocked internal when a temp directory or the
  step outputs `run()` sets would prove the outcome;
- duplicate invocations of the same contract, including byte-identical
  snapshot entries under two titles;
- per-tier replays of a contract that one owner already proves: an argv that
  a `buildNpxArgs` test pins, asserted again through `run()`;
- tests whose only purpose is preserving test-only exports, inputs,
  environment variables, or injection parameters;
- helpers defined in the test file and then tested there;
- dead production code whose only callers are tests;
- expected values produced by the helper or renderer under test, outside the
  [snapshot terms](#snapshots). Where the exact value is the contract, pin a
  known answer from an independent source;
- mocks that implement the asserted behavior, or one identical mock standing in
  for different APIs;
- runner-output checks that pass when no test ran, such as matching only `PASS`
  or `BUILD SUCCESSFUL`;
- negative controls that pass for an unrelated reason, such as a rejection from
  a different guard or one the production path never reaches;
- names or fixtures that promise more than the input exercises, such as
  "posts a PR comment" on a test that never reaches `CommentController`;
- standing `describe.skip`, `it.skip`, `it.todo`, and platform-gated tests on a
  platform CI never runs (CI is Linux only): repair and enable them, or delete
  them.

## Value bar

Tests justify their maintenance cost by protecting behavior, a credible
regression, or an independently meaningful contract. In an audit, an existing
test that must change for behavior-preserving source reorganization is suspect,
not automatically deletable; the authoring gate still rejects new ones.

Before judging a candidate, read the complete test and production owner, its
entry point, callers, callees, sibling implementations, overlapping tests in
other tiers, CI routing, and relevant history. Read the Development section
of `README.md` and `action.yml` first. When the test claims behavior of
`cdktn-cli` or `cdktf-cli`, OpenTofu or Terraform, or an `@actions/*` package,
inspect that dependency's source, types, or real output directly.

## Discovery

Keep discovery read-only and report evidence before editing. For broad scope,
run parallel discovery lanes when available:

- orchestration and inputs (`src/action.ts`, `src/inputs.ts`,
  `src/models.ts`);
- engine detection (`src/ensure-binary.ts`);
- PR comments (`src/comment.ts`);
- the smoke job and its fixture (`ci.yml`, `__fixtures__/smoke`);
- a cross-cutting pattern sweep, including unit-versus-smoke overlap.

Outside campaign mode, prefer a few high-confidence candidates over a large
speculative inventory. Hunt for the [junk patterns](#junk-patterns).

## Retention bar

Keep a test when it independently enforces an `action.yml` input or output
name, default, or value shape; the `npx` argv a mode runs (package, version,
sub-command, CLI flags); an environment variable handed to the CLI
(`TERRAFORM_BINARY_NAME`, `TF_TOKEN_app_terraform_io`, `TF_CLI_ARGS`); a
deprecated alias kept from the cdktf action (`cdktfVersion`,
`terraformVersion`, `terraformCloudToken`, `cdktfArgs`); the PR comment marker
that finds an earlier comment to update; an exit code, `setFailed` message, or
user-facing warning; or a release or security contract.

Two of this repo's contracts need a judgement call:

- OpenTofu and Terraform. The same case run once per engine is coverage of a
  real difference only where the code branches on the engine (detection,
  setup-action hints); elsewhere it is a replay.
- `cdktn-cli` and the legacy `cdktf-cli`. Both are supported; a case per CLI
  is the contract where the package, version input, or flags differ.

Also keep:

- call ordering when order is observable behavior;
- regressions with a credible failure mode;
- failure and transient-error paths that a higher tier cannot reproduce;
- source inspection when it is the cheapest independent guard: it fails when
  the contract changes (the user-facing key, byte, or path) and survives an
  identifier-only refactor;
- a retained test that fails on the baseline: treat it as a possible product
  bug, reproduce it, and repair the owner rather than deleting it.

Static or slow is not a deletion reason. A test that resembles implementation
may still be the independent contract; prove otherwise before removing it.

## Candidate evidence

Record every field below before editing. A missing field means the candidate is
not ready for deletion:

- exact test name and location;
- its tier;
- what failure it can actually detect;
- non-test callers of the covered production or support seam, from `git grep`.
  No tool reports unused exports here;
- stronger remaining owner-boundary proof, or why no proof is needed;
- relevant history and the reason the test or seam exists;
- production, snapshot, fixture, or test-support deletion unlocked;
- risk and the focused validation command.

## Edit shape

Choose one coherent owner-boundary batch, reviewable in under 30 minutes. Keep
it apart from feature and fix PRs; a bug fix does not carry surrounding test
cleanup.

Delete obsolete test-only exports, inputs, wrappers, and dead production
paths instead of preserving aliases. Removing or renaming an `action.yml`
input or output, or a deprecated alias, is a breaking change for workflows
that use the action and is not audit cleanup; report it as a follow-up. Move
retained regressions to their canonical owners. Delete the snapshot entries
and fixtures a removed test leaves behind.

Prefer net-negative production LOC. Do not add replacement tests that restate
the same implementation, and do not convert uncertain candidates into cleanup
to increase deletion counts.

## Validation

Commands for every step are in [TIERS.md](TIERS.md).

1. Run the smallest owner and sibling test files with `npx vitest run`.
2. Confirm in the output that each test ran rather than skipped (Vitest's
   file and test counts), and say what CI's smoke job covers that you did
   not; TIERS.md says what it leaves out.
3. For a removed grep or call-shape assertion, run the real path that owns the
   contract: `run()` against a temp directory, or the smoke job.
4. A changed snapshot is a behavior change. Explain every changed entry by the
   source change before accepting it.
5. Run `npm run check` and `npm run typecheck`, then `git diff --check`.
6. When `src/` changed, run `npm run package` and commit `dist/` with it;
   `check-dist.yml` fails otherwise. `npm run all` runs steps 1, 5 and 6.
7. Inspect `git diff --numstat`; report production and tooling separately from
   tests, snapshots, and fixtures.
8. Review the final diff with `/code-review` when it is available.

## Landing and continuation

Commit, push, open a PR, or land only when authorized. Title a pure test change
`test:`, and use `refactor:` when production seams are removed with it; add
a scope (`test(comment):`) only when it helps. Never skip or disable the
CI job for the tier the change touches. Land one coherent PR at a time; after
landing, refresh from current `main` and rerun read-only discovery for the
next high-confidence batch.

## Handoff

Report:

- root cause and removed low-value categories;
- production owner simplifications;
- retained false positives and why they remain valuable;
- focused and full proof actually run, by tier, and what was left to CI;
- production versus test and fixture LOC;
- PR and merge state;
- named follow-ups, including contracts found with no test owner.
