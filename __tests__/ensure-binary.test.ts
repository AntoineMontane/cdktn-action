// SPDX-License-Identifier: Apache-2.0
// Copyright The CDK Terrain Contributors

import * as exec from '@actions/exec'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveEngine } from '../src/ensure-binary.js'
import { ENGINE_AUTO, Engine } from '../src/models.js'

vi.mock('@actions/exec')

/** Mock `<binary> version` per engine: a string => that version, undefined => not on PATH. */
function onPath(versions: Partial<Record<Engine, string | undefined>>): void {
  vi.mocked(exec.getExecOutput).mockImplementation(async (cmd) => {
    const v = versions[cmd as Engine]
    if (v === undefined) throw new Error(`${cmd}: not found`)
    return { exitCode: 0, stdout: v, stderr: '' }
  })
}

describe('resolveEngine', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('uses an explicitly requested engine', async () => {
    onPath({ [Engine.Terraform]: 'Terraform v1.13.3' })
    await expect(resolveEngine(Engine.Terraform, '')).resolves.toBe(Engine.Terraform)
  })

  it('auto prefers OpenTofu when both are present', async () => {
    onPath({ [Engine.OpenTofu]: 'OpenTofu v1.12.3', [Engine.Terraform]: 'Terraform v1.13.3' })
    await expect(resolveEngine(ENGINE_AUTO, '')).resolves.toBe(Engine.OpenTofu)
  })

  it('auto falls back to Terraform when OpenTofu is absent', async () => {
    onPath({ [Engine.OpenTofu]: undefined, [Engine.Terraform]: 'Terraform v1.13.3' })
    await expect(resolveEngine(ENGINE_AUTO, '')).resolves.toBe(Engine.Terraform)
  })

  it('auto throws when neither engine is installed', async () => {
    onPath({})
    await expect(resolveEngine(ENGINE_AUTO, '')).rejects.toThrow(/Neither "tofu" nor "terraform"/)
  })

  it('enforces an exact version when provided', async () => {
    onPath({ [Engine.OpenTofu]: 'OpenTofu v1.12.3' })
    await expect(resolveEngine(Engine.OpenTofu, '1.10.0')).rejects.toThrow(/Expected tofu 1\.10\.0/)
    await expect(resolveEngine(Engine.OpenTofu, '1.12.3')).resolves.toBe(Engine.OpenTofu)
  })

  it('points at the right setup action for an explicit missing engine', async () => {
    onPath({})
    await expect(resolveEngine(Engine.Terraform, '')).rejects.toThrow(/hashicorp\/setup-terraform/)
  })
})
