// SPDX-License-Identifier: Apache-2.0
// Copyright The CDK Terrain Contributors

import { describe, expect, it } from 'vitest'
import { buildNpxArgs, resolveCli } from '../src/action.js'
import { type ActionInputs, Engine, ExecutionMode } from '../src/models.js'

function inputs(overrides: Partial<ActionInputs> = {}): ActionInputs {
  return {
    cdktnVersion: '0.23.3',
    cdktfVersion: '',
    useLocalCli: false,
    engine: Engine.OpenTofu,
    engineVersion: '',
    workingDirectory: './',
    mode: ExecutionMode.SynthOnly,
    stackName: '',
    cloudToken: '',
    githubToken: '',
    commentOnPr: false,
    updateComment: false,
    customNpxArgs: '',
    cdktnArgs: '',
    suppressOutput: false,
    ...overrides,
  }
}

describe('resolveCli', () => {
  it('runs cdktn-cli for cdktnVersion', () => {
    expect(resolveCli(inputs())).toEqual({ pkg: 'cdktn-cli', version: '0.23.3' })
  })

  it('runs the legacy cdktf-cli for cdktfVersion', () => {
    const cli = resolveCli(inputs({ cdktnVersion: '', cdktfVersion: '0.21.0' }))
    expect(cli).toEqual({ pkg: 'cdktf-cli', version: '0.21.0' })
  })

  it('prefers cdktnVersion when both are set', () => {
    const cli = resolveCli(inputs({ cdktnVersion: '0.23.3', cdktfVersion: '0.21.0' }))
    expect(cli.pkg).toBe('cdktn-cli')
  })
})

describe('buildNpxArgs', () => {
  it('builds a synth command', () => {
    expect(buildNpxArgs(inputs())).toEqual(['--yes', 'cdktn-cli@0.23.3', 'synth'])
  })

  it('builds a plan command for a stack', () => {
    const args = buildNpxArgs(inputs({ mode: ExecutionMode.PlanOnly, stackName: 'dev' }))
    expect(args).toEqual(['--yes', 'cdktn-cli@0.23.3', 'plan', 'dev'])
  })

  it('builds an auto-approved apply', () => {
    const args = buildNpxArgs(inputs({ mode: ExecutionMode.AutoApproveApply, stackName: 'dev' }))
    expect(args).toEqual(['--yes', 'cdktn-cli@0.23.3', 'apply', 'dev', '--auto-approve'])
  })

  it('builds an auto-approved destroy', () => {
    const args = buildNpxArgs(inputs({ mode: ExecutionMode.AutoApproveDestroy, stackName: 'dev' }))
    expect(args).toEqual(['--yes', 'cdktn-cli@0.23.3', 'destroy', 'dev', '--auto-approve'])
  })

  it('uses the legacy package for cdktfVersion', () => {
    const args = buildNpxArgs(inputs({ cdktnVersion: '', cdktfVersion: '0.21.0' }))
    expect(args).toEqual(['--yes', 'cdktf-cli@0.21.0', 'synth'])
  })

  it('threads custom npx and cdktn args', () => {
    const args = buildNpxArgs(
      inputs({
        mode: ExecutionMode.PlanOnly,
        stackName: 'dev',
        customNpxArgs: '--prefer-offline',
        cdktnArgs: '--var foo=bar',
      }),
    )
    expect(args).toEqual([
      '--yes',
      '--prefer-offline',
      'cdktn-cli@0.23.3',
      'plan',
      'dev',
      '--var',
      'foo=bar',
    ])
  })

  it('runs the project-local cdktn without fetching it', () => {
    const args = buildNpxArgs(
      inputs({
        cdktnVersion: '',
        useLocalCli: true,
        mode: ExecutionMode.PlanOnly,
        stackName: 'dev',
      }),
    )
    expect(args).toEqual(['--no', 'cdktn', 'plan', 'dev'])
  })

  it('ignores version inputs when running the local CLI', () => {
    const args = buildNpxArgs(inputs({ cdktfVersion: '0.21.0', useLocalCli: true }))
    expect(args).toEqual(['--no', 'cdktn', 'synth'])
  })

  it('threads custom npx args before the local CLI', () => {
    const args = buildNpxArgs(inputs({ useLocalCli: true, customNpxArgs: '--quiet' }))
    expect(args).toEqual(['--no', '--quiet', 'cdktn', 'synth'])
  })
})
