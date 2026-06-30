// SPDX-License-Identifier: Apache-2.0
// Copyright The cdk-terrain-action Contributors

import * as core from '@actions/core'
import { type ActionInputs, ExecutionMode, modeRequiresStack } from './models.js'

function parseMode(raw: string): ExecutionMode {
  const valid = Object.values(ExecutionMode) as string[]
  if (!valid.includes(raw)) {
    throw new Error(`Invalid mode "${raw}". Expected one of: ${valid.join(', ')}.`)
  }
  return raw as ExecutionMode
}

/** Read and validate all action inputs from the environment via @actions/core. */
export function getInputs(): ActionInputs {
  const mode = parseMode(core.getInput('mode', { required: true }))
  const stackName = core.getInput('stackName')

  if (modeRequiresStack(mode) && !stackName) {
    throw new Error(`The "stackName" input is required when mode is "${mode}".`)
  }

  return {
    cdktfVersion: core.getInput('cdktfVersion') || '0.21.0',
    terraformVersion: core.getInput('terraformVersion') || '1.13.3',
    workingDirectory: core.getInput('workingDirectory') || './',
    mode,
    stackName,
    terraformCloudToken: core.getInput('terraformCloudToken'),
    githubToken: core.getInput('githubToken'),
    commentOnPr: core.getBooleanInput('commentOnPr'),
    updateComment: core.getBooleanInput('updateComment'),
    customNpxArgs: core.getInput('customNpxArgs'),
    cdktfArgs: core.getInput('cdktfArgs'),
    suppressOutput: core.getBooleanInput('suppressOutput'),
  }
}
