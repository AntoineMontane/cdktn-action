// SPDX-License-Identifier: Apache-2.0
// Copyright The CDK Terrain Contributors

import * as core from '@actions/core'
import * as exec from '@actions/exec'
import { ENGINE_AUTO, Engine, type EnginePreference } from './models.js'

/** Which GitHub Action installs each engine, surfaced in error messages. */
const SETUP_ACTION: Record<Engine, string> = {
  [Engine.OpenTofu]: 'opentofu/setup-opentofu',
  [Engine.Terraform]: 'hashicorp/setup-terraform',
}

/** Parse a semantic version (e.g. "OpenTofu v1.12.3" or "Terraform v1.13.3"). */
function parseVersion(output: string): string | undefined {
  return output.match(/\bv?(\d+\.\d+\.\d+)/)?.[1]
}

/** Return the engine's version if its binary is on PATH and runnable, else undefined. */
async function probe(engine: Engine): Promise<string | undefined> {
  let result: exec.ExecOutput
  try {
    result = await exec.getExecOutput(engine, ['version'], { silent: true, ignoreReturnCode: true })
  } catch {
    return undefined // binary not found on PATH
  }
  if (result.exitCode !== 0) return undefined
  return parseVersion(result.stdout)
}

/**
 * Resolve the engine to drive and verify its binary is on PATH.
 *
 * The action never installs the engine — CDK Terrain shells out to it — so the
 * caller must run the matching setup action first. With `auto` we prefer
 * OpenTofu and fall back to Terraform based on what is installed. When
 * `expectedVersion` is given we additionally require an exact match.
 *
 * @returns the concrete engine that will be used.
 */
export async function resolveEngine(
  preference: EnginePreference,
  expectedVersion: string,
): Promise<Engine> {
  const candidates: Engine[] =
    preference === ENGINE_AUTO ? [Engine.OpenTofu, Engine.Terraform] : [preference]

  for (const engine of candidates) {
    const version = await probe(engine)
    if (!version) continue

    if (expectedVersion && version !== expectedVersion) {
      throw new Error(
        `Expected ${engine} ${expectedVersion} but found ${version}. ` +
          `Pin "${SETUP_ACTION[engine]}" to ${expectedVersion}.`,
      )
    }

    const how = preference === ENGINE_AUTO ? 'Detected' : 'Using'
    core.info(`${how} ${engine} ${version}.`)
    return engine
  }

  if (preference === ENGINE_AUTO) {
    throw new Error(
      'Neither "tofu" nor "terraform" was found on PATH. Install one before this step ' +
        'with "opentofu/setup-opentofu" or "hashicorp/setup-terraform".',
    )
  }
  throw new Error(
    `"${preference}" was not found on PATH. Install it before this step with ` +
      `"${SETUP_ACTION[preference]}".`,
  )
}
