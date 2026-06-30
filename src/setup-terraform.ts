// SPDX-License-Identifier: Apache-2.0
// Copyright The cdk-terrain-action Contributors

import * as exec from '@actions/exec'

interface TerraformVersionOutput {
  terraform_version: string
}

/**
 * Verify that the expected Terraform version is already available on PATH.
 *
 * This action deliberately does not install Terraform; CDKTF shells out to the
 * `terraform` binary, so callers are expected to run `hashicorp/setup-terraform`
 * (or equivalent) beforehand. We fail fast with an actionable message when the
 * binary is missing or the version does not match.
 */
export async function ensureTerraform(expectedVersion: string): Promise<void> {
  let result: exec.ExecOutput
  try {
    result = await exec.getExecOutput('terraform', ['version', '-json'], {
      silent: true,
      ignoreReturnCode: true,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Terraform was not found on PATH (${message}). Install it before this step, ` +
        `e.g. with "hashicorp/setup-terraform" pinned to ${expectedVersion}.`,
    )
  }

  if (result.exitCode !== 0) {
    throw new Error(
      `Unable to determine the Terraform version (exit code ${result.exitCode}). ` +
        `Install Terraform ${expectedVersion} before this step, e.g. with "hashicorp/setup-terraform".`,
    )
  }

  let installedVersion: string
  try {
    installedVersion = (JSON.parse(result.stdout) as TerraformVersionOutput).terraform_version
  } catch {
    throw new Error('Could not parse the output of "terraform version -json".')
  }

  if (installedVersion !== expectedVersion) {
    throw new Error(
      `Expected Terraform ${expectedVersion} but found ${installedVersion}. ` +
        `Pin "hashicorp/setup-terraform" (or your installer) to ${expectedVersion}.`,
    )
  }
}
