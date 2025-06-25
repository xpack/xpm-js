/*
 * This file is part of the xPack project (http://xpack.github.io).
 * Copyright (c) 2018 Liviu Ionescu. All rights reserved.
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
 * Test `xpm init`.
 */

// ----------------------------------------------------------------------------

// The `[node-tap](http://www.node-tap.org)` framework.
import { fileURLToPath } from 'node:url'
import * as path from 'node:path'
import { test } from 'tap'

// ----------------------------------------------------------------------------

// ES6: `import { CliExitCodes } from 'cli-start-options'
// import { CliExitCodes } from '@ilg/cli-start-options';
import cliStartOptionsCsj from '@ilg/cli-start-options'

// ----------------------------------------------------------------------------

import { Common } from '../common.js'

// ----------------------------------------------------------------------------

const { CliExitCodes } = cliStartOptionsCsj

// ----------------------------------------------------------------------------

/**
 * Test if help content includes convert options.
 */
test('xpm run -h',
  async (t) => {
    try {
      const { code, stdout, stderr } = await Common.xpmCli([
        'run',
        '-h'
      ])
      // Check exit code.
      t.equal(code, CliExitCodes.SUCCESS, 'exit code is success')
      const outLines = stdout.split(/\r?\n/)
      t.ok(outLines.length > 9, 'has enough output')
      if (outLines.length > 9) {
        // console.log(outLines)
        t.match(outLines[1],
          'run package/configuration specific action', 'has title')
        t.match(outLines[2], 'Usage: xpm run [options...] ' +
          '[--config <config_name>] [--dry-run]', 'has Usage')
      }
      // There should be no error messages.
      t.equal(stderr, '', 'stderr is empty')
    } catch (err) {
      t.fail(err.message)
    }
    t.end()
  })

/**
 * Test if partial command recognised and expanded.
 */
test('xpm run -h',
  async (t) => {
    try {
      const { code, stdout, stderr } = await Common.xpmCli([
        'run',
        '-h'
      ])
      // Check exit code.
      t.equal(code, CliExitCodes.SUCCESS, 'exit code is success')
      const outLines = stdout.split(/\r?\n/)
      t.ok(outLines.length > 9, 'has enough output')
      if (outLines.length > 9) {
        // console.log(outLines)
        t.match(outLines[1],
          'run package/configuration specific action', 'has title')
        t.match(outLines[2], 'Usage: xpm run [options...] ' +
          '[--config <config_name>] [--dry-run]', 'has Usage')
      }
      // There should be no error messages.
      t.equal(stderr, '', 'stderr is empty')
    } catch (err) {
      t.fail(err.message)
    }
    t.end()
  })

/**
* Test cross-platform quotes.
*/
test('xpm run quotes',
  async (t) => {
    try {
      const dirname = fileURLToPath(import.meta.url)
      const packagePath = path.resolve(dirname, '..', '..', 'mock', 'devdep')
      const { code, stdout, stderr } = await Common.xpmCli([
        'run',
        '-C',
        packagePath,
        'quotes'
      ])
      // Check exit code.
      t.equal(code, CliExitCodes.SUCCESS, 'exit code is success')
      const outLines = stdout.split(/\r?\n/)
      t.ok(outLines.length > 1, 'has enough output')
      if (outLines.length > 1) {
        // console.log(outLines)
        t.match(outLines[1], '2', 'quotes are correct')
      }
      // There should be no error messages.
      t.equal(stderr, '', 'stderr is empty')
    } catch (err) {
      t.fail(err.message)
    }
    t.end()
  })

// ----------------------------------------------------------------------------
