// SPDX-License-Identifier: Apache-2.0
// Copyright The CDK Terrain Contributors

/** The operation the action performs against a CDK Terrain project. */
export enum ExecutionMode {
  /** Synthesize the configuration only. */
  SynthOnly = 'synth-only',
  /** Plan a single stack. */
  PlanOnly = 'plan-only',
  /** Plan and then apply a single stack with --auto-approve. */
  AutoApproveApply = 'auto-approve-apply',
  /** Plan and then destroy a single stack with --auto-approve. */
  AutoApproveDestroy = 'auto-approve-destroy',
}

/** Every mode except synth-only operates on a specific stack. */
export function modeRequiresStack(mode: ExecutionMode): boolean {
  return mode !== ExecutionMode.SynthOnly
}

/** The provisioning engine CDK Terrain shells out to. */
export enum Engine {
  /** OpenTofu (`tofu` binary) — the default. */
  OpenTofu = 'tofu',
  /** HashiCorp Terraform (`terraform` binary). */
  Terraform = 'terraform',
}

/** The npm CLI package the action runs via npx. */
export interface CliSelection {
  /** npm package name, e.g. `cdktn-cli` or the legacy `cdktf-cli`. */
  pkg: string
  /** Version/dist-tag to run. */
  version: string
}

/** Resolved, validated action inputs. */
export interface ActionInputs {
  /** Version of `cdktn-cli` to run. Preferred over {@link cdktfVersion}. */
  cdktnVersion: string
  /** Deprecated: version of the legacy `cdktf-cli` to run instead. */
  cdktfVersion: string
  engine: Engine
  /** Optional exact engine version to require on PATH (empty = only check presence). */
  engineVersion: string
  workingDirectory: string
  mode: ExecutionMode
  stackName: string
  cloudToken: string
  githubToken: string
  commentOnPr: boolean
  updateComment: boolean
  customNpxArgs: string
  cdktnArgs: string
  suppressOutput: boolean
}
