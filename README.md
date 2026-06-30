# cdk-terrain-action

[![CI](https://github.com/open-constructs/cdk-terrain-action/actions/workflows/ci.yml/badge.svg)](https://github.com/open-constructs/cdk-terrain-action/actions/workflows/ci.yml)
[![Security](https://github.com/open-constructs/cdk-terrain-action/actions/workflows/security.yml/badge.svg)](https://github.com/open-constructs/cdk-terrain-action/actions/workflows/security.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)

A GitHub Action that runs [CDK for Terraform (CDKTF)](https://developer.hashicorp.com/terraform/cdktf)
as part of your CI/CD workflow — synthesize, plan, apply, or destroy a stack and
(optionally) report the result back on the pull request.

This is an independent, clean-room reimplementation inspired by HashiCorp's
archived [`terraform-cdk-action`](https://github.com/hashicorp/terraform-cdk-action).
See [`NOTICE`](./NOTICE).

## Usage

This action **does not install Terraform**; it verifies that the requested
version is already on `PATH`. Run
[`hashicorp/setup-terraform`](https://github.com/hashicorp/setup-terraform)
first. The CDKTF CLI is fetched on demand via `npx`.

```yaml
jobs:
  plan:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write # only needed when commentOnPr is true
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-node@v6
        with:
          node-version: 24

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.13.3
          terraform_wrapper: false

      - uses: open-constructs/cdk-terrain-action@v1
        with:
          mode: plan-only
          stackName: my-stack
          terraformVersion: 1.13.3
          cdktfVersion: 0.21.0
          terraformCloudToken: ${{ secrets.TF_API_TOKEN }}
          githubToken: ${{ github.token }}
```

## Inputs

| Input                 | Required | Default    | Description |
| --------------------- | -------- | ---------- | ----------- |
| `mode`                | yes      | —          | `synth-only`, `plan-only`, `auto-approve-apply`, or `auto-approve-destroy`. |
| `stackName`           | for non-synth modes | — | Stack to operate on. Required for every mode except `synth-only`. |
| `cdktfVersion`        | no       | `0.21.0`   | Version of `cdktf-cli` to run (fetched via `npx`). |
| `terraformVersion`    | no       | `1.13.3`   | Terraform version that must already be on `PATH`. |
| `workingDirectory`    | no       | `./`       | Directory the CDKTF project lives in. |
| `terraformCloudToken` | no       | —          | HCP Terraform / TFE token (exported as `TF_TOKEN_app_terraform_io`). |
| `githubToken`         | no       | —          | Token used to post the PR comment. No comment is posted if omitted. |
| `commentOnPr`         | no       | `true`     | Post the run result as a PR comment. |
| `updateComment`       | no       | `true`     | Update the previous comment for this config instead of adding a new one. |
| `customNpxArgs`       | no       | `""`       | Extra args passed to `npx` before the cdktf-cli package. |
| `cdktfArgs`           | no       | `""`       | Extra args passed to the `cdktf` command. |
| `suppressOutput`      | no       | `false`    | Omit captured CDKTF output from the PR comment. |

## Outputs

| Output     | Description |
| ---------- | ----------- |
| `exitCode` | Exit code returned by the cdktf-cli invocation. |
| `output`   | Combined stdout/stderr captured from the cdktf-cli invocation. |

## Modes

| Mode                   | cdktf command                       |
| ---------------------- | ----------------------------------- |
| `synth-only`           | `synth`                             |
| `plan-only`            | `plan <stackName>`                  |
| `auto-approve-apply`   | `apply <stackName> --auto-approve`  |
| `auto-approve-destroy` | `destroy <stackName> --auto-approve`|

## Development

The toolchain is pinned with [mise](https://mise.jdx.dev) and the bundle is
produced by [Rolldown](https://rolldown.rs); linting/formatting use
[Biome](https://biomejs.dev) and tests use [Vitest](https://vitest.dev).

```bash
mise install     # node 24, actionlint, zizmor
npm ci
npm run all      # biome check + typecheck + test + bundle dist/
```

Workflows are linted with `actionlint` and security-scanned with `zizmor`:

```bash
actionlint
zizmor .
```

### About `dist/`

The bundled `dist/index.js` is **committed on `main`** so GitHub can run the
action directly at any tag. The [`check-dist`](.github/workflows/check-dist.yml)
workflow rebuilds it on every change and fails if the committed bundle drifts
from source, so a tag always runs code that is reproducible from its reviewed
source. Releases additionally attach
[build provenance](https://github.com/open-constructs/cdk-terrain-action/attestations).

## License

[Apache-2.0](./LICENSE)
