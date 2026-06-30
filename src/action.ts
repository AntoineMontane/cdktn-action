// SPDX-License-Identifier: Apache-2.0
// Copyright The CDK Terrain Contributors

import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as github from '@actions/github'
import { buildCommentBody, CommentController, type RepoContext } from './comment.js'
import { ensureBinary } from './ensure-binary.js'
import { getInputs } from './inputs.js'
import { type ActionInputs, type CliSelection, ExecutionMode } from './models.js'

/** Split a raw CLI-args string into argv tokens (whitespace separated). */
function splitArgs(raw: string): string[] {
  return raw.split(/\s+/).filter((token) => token.length > 0)
}

/**
 * Pick the CLI package to run. `cdktnVersion` runs CDK Terrain's `cdktn-cli`;
 * the deprecated `cdktfVersion` runs the legacy `cdktf-cli` for migration ease.
 */
export function resolveCli(inputs: ActionInputs): CliSelection {
  if (inputs.cdktnVersion) {
    return { pkg: 'cdktn-cli', version: inputs.cdktnVersion }
  }
  return { pkg: 'cdktf-cli', version: inputs.cdktfVersion }
}

/** Map an execution mode to the CLI sub-command and its arguments. */
function engineCommand(inputs: ActionInputs): string[] {
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

/** Assemble the full `npx` argv that runs the selected CDK CLI. */
export function buildNpxArgs(inputs: ActionInputs): string[] {
  const cli = resolveCli(inputs)
  const args = ['--yes']
  args.push(...splitArgs(inputs.customNpxArgs))
  args.push(`${cli.pkg}@${cli.version}`)
  args.push(...engineCommand(inputs))
  args.push(...splitArgs(inputs.cdktnArgs))
  return args
}

function buildEnv(inputs: ActionInputs): { [key: string]: string } {
  // @actions/exec wants a fully-defined string map, so drop any undefined vars.
  const env: { [key: string]: string } = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) env[key] = value
  }
  // Tell CDK Terrain / CDKTF which provisioning engine to drive.
  env.TERRAFORM_BINARY_NAME = inputs.engine
  env.FORCE_COLOR = '0'
  env.TF_CLI_ARGS = '-no-color'
  if (inputs.cloudToken) {
    env.TF_TOKEN_app_terraform_io = inputs.cloudToken
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

  await ensureBinary(inputs.engine, inputs.engineVersion)

  if (inputs.cloudToken) {
    core.setSecret(inputs.cloudToken)
  }

  const args = buildNpxArgs(inputs)
  core.info(`Running: npx ${args.join(' ')} (engine: ${inputs.engine})`)

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
    core.setFailed(`${engineCommand(inputs).join(' ')} failed with exit code ${result.exitCode}.`)
  }
}
