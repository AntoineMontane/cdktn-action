// SPDX-License-Identifier: Apache-2.0
// Copyright The cdk-terrain-action Contributors

import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as github from '@actions/github'
import { buildCommentBody, CommentController, type RepoContext } from './comment.js'
import { getInputs } from './inputs.js'
import { type ActionInputs, ExecutionMode } from './models.js'
import { ensureTerraform } from './setup-terraform.js'

/** Split a raw CLI-args string into argv tokens (whitespace separated). */
function splitArgs(raw: string): string[] {
  return raw.split(/\s+/).filter((token) => token.length > 0)
}

/** Map an execution mode to the cdktf-cli sub-command and its arguments. */
function cdktfCommand(inputs: ActionInputs): string[] {
  switch (inputs.mode) {
    case ExecutionMode.SynthOnly:
      return ['synth']
    case ExecutionMode.PlanOnly:
      return ['plan', inputs.stackName]
    case ExecutionMode.AutoApproveApply:
      return ['apply', inputs.stackName, '--auto-approve']
    case ExecutionMode.AutoApproveDestroy:
      return ['destroy', inputs.stackName, '--auto-approve']
  }
}

/** Assemble the full `npx` argv that runs the pinned cdktf-cli. */
export function buildNpxArgs(inputs: ActionInputs): string[] {
  const args = ['--yes']
  args.push(...splitArgs(inputs.customNpxArgs))
  args.push(`cdktf-cli@${inputs.cdktfVersion}`)
  args.push(...cdktfCommand(inputs))
  args.push(...splitArgs(inputs.cdktfArgs))
  return args
}

function buildEnv(inputs: ActionInputs): { [key: string]: string } {
  // @actions/exec wants a fully-defined string map, so drop any undefined vars.
  const env: { [key: string]: string } = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) env[key] = value
  }
  env.FORCE_COLOR = '0'
  env.TF_CLI_ARGS = '-no-color'
  if (inputs.terraformCloudToken) {
    env.TF_TOKEN_app_terraform_io = inputs.terraformCloudToken
  }
  return env
}

function repoContext(): RepoContext {
  const { owner, repo } = github.context.repo
  return {
    owner,
    repo,
    sha: github.context.sha,
    prNumber: github.context.payload.pull_request?.number,
  }
}

export async function run(): Promise<void> {
  const inputs = getInputs()

  await ensureTerraform(inputs.terraformVersion)

  const args = buildNpxArgs(inputs)
  core.info(`Running: npx ${args.join(' ')}`)

  if (inputs.terraformCloudToken) {
    core.setSecret(inputs.terraformCloudToken)
  }

  const result = await exec.getExecOutput('npx', args, {
    cwd: inputs.workingDirectory,
    env: buildEnv(inputs),
    ignoreReturnCode: true,
  })

  const output = `${result.stdout}\n${result.stderr}`.trim()
  const success = result.exitCode === 0

  core.setOutput('exitCode', result.exitCode)
  core.setOutput('output', output)

  if (inputs.commentOnPr) {
    if (inputs.githubToken) {
      const controller = new CommentController(github.getOctokit(inputs.githubToken), repoContext())
      await controller.upsert(inputs, buildCommentBody(inputs, output, success))
    } else {
      core.warning('commentOnPr is enabled but no githubToken was provided; skipping comment.')
    }
  }

  if (!success) {
    core.setFailed(
      `cdktf ${cdktfCommand(inputs).join(' ')} failed with exit code ${result.exitCode}.`,
    )
  }
}
