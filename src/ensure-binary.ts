// SPDX-License-Identifier: Apache-2.0
// Copyright The CDK Terrain Contributors

import * as core from '@actions/core'
import * as exec from '@actions/exec'
import { Engine } from './models.js'

/** Which GitHub Action installs each engine, surfaced in error messages. */
const SETUP_ACTION: Record<Engine, string> = {
  [Engine.OpenTofu]: 'opentofu/setup-opentofu',
  [Engine.Terraform]: 'hashicorp/setup-terraform',
}

/** Parse a semantic version (e.g. "OpenTofu v1.12.3" or "Terraform v1.13.3"). */
function parseVersion(output: string): string | undefined {
  return output.match(/\bv?(\d+\.\d+\.\d+)/)?.[1]
}

/**
 * Verify that the selected engine's binary (`tofu` or `terraform`) is on PATH.
 *
 * The action never installs the engine — CDK Terrain shells out to it — so the
 * caller must run the matching setup action first. When `expectedVersion` is
 * given we additionally require an exact match; otherwise we only confirm the
 * binary is present (and log the version we found).
 */
export async function ensureBinary(engine: Engine, expectedVersion: string): Promise<void> {
  const binary = engine // Engine values are the binary names ("tofu" / "terraform")

  let result: exec.ExecOutput
  try {
    result = await exec.getExecOutput(binary, ['version'], { silent: true, ignoreReturnCode: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(
      `"${binary}" was not found on PATH (${message}). Install it before this step with ` +
        `"${SETUP_ACTION[engine]}".`,
    )
  }

  if (result.exitCode !== 0) {
    throw new Error(
      `Unable to run "${binary} version" (exit code ${result.exitCode}). ` +
        `Install ${binary} before this step with "${SETUP_ACTION[engine]}".`,
    )
  }

  const installed = parseVersion(result.stdout)
  if (!installed) {
    throw new Error(`Could not determine the ${binary} version from: ${result.stdout.trim()}`)
  }

  if (expectedVersion && installed !== expectedVersion) {
    throw new Error(
      `Expected ${binary} ${expectedVersion} but found ${installed}. ` +
        `Pin "${SETUP_ACTION[engine]}" to ${expectedVersion}.`,
    )
  }

  core.info(`Using ${binary} ${installed}.`)
}
