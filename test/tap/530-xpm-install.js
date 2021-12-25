/*
 * This file is part of the xPack distribution
 *   (http://xpack.github.io).
 * Copyright (c) 2018 Liviu Ionescu.
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom
 * the Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
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
        t.match(outLines[14], '  -n|--dry-run  ', 'has --dry-run')
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
