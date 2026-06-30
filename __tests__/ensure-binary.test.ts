// SPDX-License-Identifier: Apache-2.0
// Copyright The CDK Terrain Contributors

import * as exec from '@actions/exec'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ensureBinary } from '../src/ensure-binary.js'
import { Engine } from '../src/models.js'

vi.mock('@actions/exec')

function mockVersion(stdout: string, exitCode = 0): void {
  vi.mocked(exec.getExecOutput).mockResolvedValue({ exitCode, stdout, stderr: '' })
}

describe('ensureBinary', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('accepts a present OpenTofu binary when no version is required', async () => {
    mockVersion('OpenTofu v1.12.3\non linux_amd64')
    await expect(ensureBinary(Engine.OpenTofu, '')).resolves.toBeUndefined()
    expect(exec.getExecOutput).toHaveBeenCalledWith('tofu', ['version'], expect.anything())
  })

  it('accepts a matching exact version', async () => {
    mockVersion('Terraform v1.13.3')
    await expect(ensureBinary(Engine.Terraform, '1.13.3')).resolves.toBeUndefined()
  })

  it('throws on a version mismatch', async () => {
    mockVersion('OpenTofu v1.12.3')
    await expect(ensureBinary(Engine.OpenTofu, '1.10.0')).rejects.toThrow(/Expected tofu 1\.10\.0/)
  })

  it('points at the right setup action when the binary is missing', async () => {
    vi.mocked(exec.getExecOutput).mockRejectedValue(new Error('ENOENT'))
    await expect(ensureBinary(Engine.Terraform, '')).rejects.toThrow(/hashicorp\/setup-terraform/)
  })

  it('points at setup-opentofu for OpenTofu', async () => {
    vi.mocked(exec.getExecOutput).mockRejectedValue(new Error('ENOENT'))
    await expect(ensureBinary(Engine.OpenTofu, '')).rejects.toThrow(/opentofu\/setup-opentofu/)
  })
})
