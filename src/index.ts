// SPDX-License-Identifier: Apache-2.0
// Copyright The CDK Terrain Contributors

import * as core from '@actions/core'
import { run } from './action.js'

run().catch((error: unknown) => {
  core.setFailed(error instanceof Error ? error.message : String(error))
})
