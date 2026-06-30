// SPDX-License-Identifier: Apache-2.0
// Copyright The cdk-terrain-action Contributors

/** The operation the action performs against a CDKTF project. */
export enum ExecutionMode {
  /** Synthesize Terraform configuration only. */
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

/** Resolved, validated action inputs. */
export interface ActionInputs {
  cdktfVersion: string
  terraformVersion: string
  workingDirectory: string
  mode: ExecutionMode
  stackName: string
  terraformCloudToken: string
  githubToken: string
  commentOnPr: boolean
  updateComment: boolean
  customNpxArgs: string
  cdktfArgs: string
  suppressOutput: boolean
}
