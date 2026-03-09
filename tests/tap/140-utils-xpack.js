/*
 * This file is part of the xPack project (http://xpack.github.io).
 * Copyright (c) 2018-2026 Liviu Ionescu. All rights reserved.
 *
 * Permission to use, copy, modify, and/or distribute this software
 * for any purpose is hereby granted, under the terms of the MIT license.
 *
 * If a copy of the license was not distributed with this file, it can
 * be obtained from https://opensource.org/license/mit.
 */

'use strict'

/* eslint valid-jsdoc: "error" */
/* eslint max-len: [ "error", 80, { "ignoreUrls": true } ] */

// ----------------------------------------------------------------------------

/**
 * Test global configuration definitions.
 */

// ----------------------------------------------------------------------------

// The `[node-tap](http://www.node-tap.org)` framework.
import { test } from 'tap'

// ----------------------------------------------------------------------------

// const Common = require('../common.js').Common
// const { CliLogger } = require('@ilg/cli-start-options')
import cliStartOptionsCsj from '@ilg/cli-start-options'

// ----------------------------------------------------------------------------

import { ManifestIds } from '../../src/classes/manifest-ids.js'

import { XpmPolicies } from '../../src/classes/policies.js'

import { Logger } from '@xpack/logger'

// ----------------------------------------------------------------------------

// const { CliLogger } = cliStartOptionsCsj

// ----------------------------------------------------------------------------

// let pack = null
// const rootPath = path.dirname(path.dirname(__dirname))

test('utils/manifest-ids', (t) => {
  const context = {}
  context.log = new Logger({ level: 'info' })

  const policies = new XpmPolicies('0.0.0', context)

  const mid = new ManifestIds({ manifest: { _id: 'xx' }, policies })
  t.ok(mid, 'mid set')

  t.end()
})
// ----------------------------------------------------------------------------
