// SPDX-License-Identifier: Apache-2.0
// Copyright The cdk-terrain-action Contributors

import { describe, expect, it } from 'vitest'
import { buildNpxArgs } from '../src/action.js'
import { type ActionInputs, ExecutionMode } from '../src/models.js'

function inputs(overrides: Partial<ActionInputs> = {}): ActionInputs {
  return {
    cdktfVersion: '0.21.0',
    terraformVersion: '1.13.3',
    workingDirectory: './',
    mode: ExecutionMode.SynthOnly,
    stackName: '',
    terraformCloudToken: '',
    githubToken: '',
    commentOnPr: false,
    updateComment: false,
    customNpxArgs: '',
    cdktfArgs: '',
    suppressOutput: false,
    ...overrides,
  }
}

describe('buildNpxArgs', () => {
  it('builds a synth command', () => {
    expect(buildNpxArgs(inputs())).toEqual(['--yes', 'cdktf-cli@0.21.0', 'synth'])
  })

  it('builds a plan command for a stack', () => {
    const args = buildNpxArgs(inputs({ mode: ExecutionMode.PlanOnly, stackName: 'dev' }))
    expect(args).toEqual(['--yes', 'cdktf-cli@0.21.0', 'plan', 'dev'])
  })

  it('builds an auto-approved apply', () => {
    const args = buildNpxArgs(inputs({ mode: ExecutionMode.AutoApproveApply, stackName: 'dev' }))
    expect(args).toEqual(['--yes', 'cdktf-cli@0.21.0', 'apply', 'dev', '--auto-approve'])
  })

  it('builds an auto-approved destroy', () => {
    const args = buildNpxArgs(inputs({ mode: ExecutionMode.AutoApproveDestroy, stackName: 'dev' }))
    expect(args).toEqual(['--yes', 'cdktf-cli@0.21.0', 'destroy', 'dev', '--auto-approve'])
  })

  it('threads custom npx and cdktf args', () => {
    const args = buildNpxArgs(
      inputs({
        mode: ExecutionMode.PlanOnly,
        stackName: 'dev',
        customNpxArgs: '--prefer-offline',
        cdktfArgs: '--var foo=bar',
      }),
    )
    expect(args).toEqual([
      '--yes',
      '--prefer-offline',
      'cdktf-cli@0.21.0',
      'plan',
      'dev',
      '--var',
      'foo=bar',
    ])
  })
})
