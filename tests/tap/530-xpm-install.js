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
const test = require('tap').test

const { Common } = require('../common.js')

// ES6: `import { CliExitCodes } from 'cli-start-options'
const { CliExitCodes } = require('@ilg/cli-start-options')

// ----------------------------------------------------------------------------

/**
 * Test if help content includes convert options.
 */
test('xpm install -h',
  async (t) => {
    try {
      const { code, stdout, stderr } = await Common.xpmCli([
        'install',
        '-h'
      ])
      // Check exit code.
      t.equal(code, CliExitCodes.SUCCESS, 'exit code is success')
      const outLines = stdout.split(/\r?\n/)
      t.ok(outLines.length > 9, 'has enough output')
      if (outLines.length > 9) {
        // console.log(outLines)
        t.match(outLines[1], 'install package(s)', 'has title')
        t.match(outLines[2], 'Usage: xpm install [options...] ' +
          '[--global] [--system] [--force]', 'has Usage')
        t.match(outLines[8], 'Install options:', 'has install options')
        t.match(outLines[9], '  -g|--global  ', 'has --global')
        t.match(outLines[10], '  -sy|--system  ', 'has --system')
        t.match(outLines[11], '  -f|--force  ', 'has --force')
        t.match(outLines[12], '  -32|--force-32bit ', 'has --force-32bit')
        t.match(outLines[13], '  -c|--config <config_name>  ', 'has --config')
        t.match(outLines[14], '  -a|--all-configs  ')
        t.match(outLines[15], '  -n|--dry-run  ', 'has --dry-run')
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
test('xpm instal -h',
  async (t) => {
    try {
      const { code, stdout, stderr } = await Common.xpmCli([
        'instal',
        '-h'
      ])
      // Check exit code.
      t.equal(code, CliExitCodes.SUCCESS, 'exit code is success')
      const outLines = stdout.split(/\r?\n/)
      t.ok(outLines.length > 9, 'has enough output')
      if (outLines.length > 9) {
        // console.log(outLines)
        t.match(outLines[1], 'install package(s)', 'has title')
        t.match(outLines[2], 'Usage: xpm install [options...] ' +
          '[--global] [--system] [--force]', 'has Usage')
      }
      // There should be no error messages.
      t.equal(stderr, '', 'stderr is empty')
    } catch (err) {
      t.fail(err.message)
    }
    t.end()
  })

// ----------------------------------------------------------------------------
