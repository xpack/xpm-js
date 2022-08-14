/*
 * This file is part of the xPack project (http://xpack.github.io).
 * Copyright (c) 2018 Liviu Ionescu. All rights reserved.
 *
 * Permission to use, copy, modify, and/or distribute this software
 * for any purpose is hereby granted, under the terms of the MIT license.
 *
 * If a copy of the license was not distributed with this file, it can
 * be obtained from https://opensource.org/licenses/MIT/.
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
const { test } = require('tap')

const { Common } = require('../common.js')

// ES6: `import { CliExitCodes } from 'cli-start-options'
const { CliExitCodes } = require('@ilg/cli-start-options')

// ----------------------------------------------------------------------------

/**
 * Test if help content includes convert options.
 */
test('xpm help -h',
  async (t) => {
    try {
      const { code, stdout, stderr } = await Common.xpmCli([
        'init',
        '-h'
      ])
      // Check exit code.
      t.equal(code, CliExitCodes.SUCCESS, 'exit code is success')
      const outLines = stdout.split(/\r?\n/)
      t.ok(outLines.length > 9, 'has enough output')
      if (outLines.length > 9) {
        // console.log(outLines)
        t.match(outLines[1], 'create an xPack', 'has title')
        t.match(outLines[2], 'Usage: xpm init [options...] ' +
          '[--template <xpack>] [--name <string>]', 'has Usage')
        t.match(outLines[5], 'Init options:', 'has init options')
        t.match(outLines[6], '  -t|--template <xpack>  ', 'has --template')
        t.match(outLines[7], '  -n|--name <string>  ', 'has --name')
        t.match(outLines[8], '  -p|--property <string>  ', 'has --property')
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
test('xpm ini -h',
  async (t) => {
    try {
      const { code, stdout, stderr } = await Common.xpmCli([
        'ini',
        '-h'
      ])
      // Check exit code.
      t.equal(code, CliExitCodes.SUCCESS, 'exit code is success')
      const outLines = stdout.split(/\r?\n/)
      t.ok(outLines.length > 9, 'has enough output')
      if (outLines.length > 9) {
        // console.log(outLines)
        t.match(outLines[1], 'create an xPack', 'has title')
        t.match(outLines[2], 'Usage: xpm init [options...] ' +
          '[--template <xpack>] [--name <string>]', 'has Usage')
      }
      // There should be no error messages.
      t.equal(stderr, '', 'stderr is empty')
    } catch (err) {
      t.fail(err.message)
    }
    t.end()
  })

// ----------------------------------------------------------------------------
