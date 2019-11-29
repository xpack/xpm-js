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

const assert = require('assert')
const path = require('path')
const os = require('os')
// const fs = require('fs')

// The `[node-tap](http://www.node-tap.org)` framework.
const test = require('tap').test

const Common = require('../common.js').Common
const Promisifier = require('@xpack/es6-promisifier').Promisifier

// ES6: `import { CliExitCodes } from 'cli-start-options'
const CliExitCodes = require('@ilg/cli-start-options').CliExitCodes
const CliUtils = require('@ilg/cli-start-options').CliUtils

const rimrafPromise = Promisifier.promisify(require('rimraf'))

assert(Common)
assert(Promisifier)
assert(CliExitCodes)
assert(CliUtils)

// ----------------------------------------------------------------------------

// const fixtures = path.resolve(__dirname, '../fixtures')
// const workFolder = path.resolve(os.tmpdir(), 'xtest-copy')
// const rimrafPromise = Promisifier.promisify(require('rimraf'))
// const mkdirpPromise = Promisifier.promisify(require('mkdirp'))

// Promisified functions from the Node.js callbacks library.
// Promisifier.promisifyInPlace(fs, 'chmod')

// ----------------------------------------------------------------------------

/**
 * Test if help content includes convert options.
 */
test('xpm init -h',
  async (t) => {
    try {
      const { code, stdout, stderr } = await Common.xpmCli([
        'init',
        '-h'
      ])
      // Check exit code.
      t.equal(code, CliExitCodes.SUCCESS, 'exit code is success')

      const outLines = stdout.split(/\r?\n/)
      // console.log(outLines)
      t.ok(outLines.length > 10, 'has enough output')
      if (outLines.length > 10) {
        t.match(outLines[1], 'The xPack manager - Create an xPack',
          'has title')
        t.match(outLines[3], 'Usage: xpm init [<options>...] ...', 'has Usage')
        t.match(outLines[5], 'Command aliases: ini, inni', 'has aliases')
        t.match(outLines[7], 'Init options:', 'has init options')
        t.match(outLines[8], '  -t|--template <xpack>  ', 'has --template')
        t.match(outLines[9], '  -n|--name <string>  ', 'has --name')
        t.match(outLines[10], '  -p|--property <string>  ', 'has --property')
      }

      // There should be no error messages.
      t.equal(stderr, '', 'stderr is empty')
    } catch (err) {
      t.fail(err.message)
    }
    t.end()
  })

/**
 * Test if the project is created.
 */
test('xpm init',
  async (t) => {
    const workFolderPath = path.resolve(os.tmpdir(), 'init')
    await rimrafPromise(workFolderPath)

    await t.test('clean init', async (t) => {
      try {
        const { code, stdout, stderr } = await Common.xpmCli([
          'init',
          '-C',
          workFolderPath
        ])
        // Check exit code.
        t.equal(code, CliExitCodes.SUCCESS, 'exit code is success')

        const outLines = stdout.split(/\r?\n/)
        // console.log(outLines)
        t.ok(outLines.length > 1, 'has enough output')
        t.match(stdout, 'Creating project', 'has creating')
        t.match(stdout, 'File \'package.json\' generated',
          'has package generated')
        t.match(stdout, 'File \'LICENSE\' generated',
          'has LICENSE generated')

        // There should be no error messages.
        t.equal(stderr, '', 'stderr is empty')
      } catch (err) {
        t.fail(err.message)
      }

      t.end()
    })

    await t.test('check package', async (t) => {
      const json = await CliUtils.readPackageJson(workFolderPath)
      t.ok(json, 'has json')
      t.equal(json.name, 'init', 'has name')
      t.equal(json.version, '1.0.0', 'has version')

      t.end()
    })

    await t.test('already there', async (t) => {
      try {
        const { code, stdout, stderr } = await Common.xpmCli([
          'init',
          '-C',
          workFolderPath
        ])
        // Check exit code.
        t.equal(code, CliExitCodes.ERROR.OUTPUT, 'exit code is OUTPUT')
        const outLines = stdout.split(/\r?\n/)
        // console.log(outLines)
        t.ok(outLines.length > 1, 'has enough output')

        // There should be no error messages.
        t.match(stderr,
          'The destination folder already has a package.json file',
          'stderr has already ')
      } catch (err) {
        t.fail(err.message)
      }

      t.end()
    })

    // Remove the package.json to allow subsequent installs.
    await rimrafPromise(path.join(workFolderPath, 'package.json'))

    await t.test('partial init', async (t) => {
      try {
        const { code, stdout, stderr } = await Common.xpmCli([
          'init',
          '-C',
          workFolderPath,
          '--name',
          'baburiba'
        ])
        // Check exit code.
        t.equal(code, CliExitCodes.SUCCESS, 'exit code is success')

        const outLines = stdout.split(/\r?\n/)
        // console.log(outLines)
        t.ok(outLines.length > 1, 'has enough output')
        t.match(stdout, 'Creating project', 'has creating')
        t.match(stdout, 'File \'package.json\' generated',
          'has package generated')
        t.match(stdout, 'File \'LICENSE\' preserved',
          'has LICENSE preserved')

        // There should be no error messages.
        t.equal(stderr, '', 'stderr is empty')
      } catch (err) {
        t.fail(err.message)
      }

      t.end()
    })

    await t.test('check package with name', async (t) => {
      const json = await CliUtils.readPackageJson(workFolderPath)
      t.ok(json, 'has json')
      t.equal(json.name, 'baburiba', 'has name')
      t.equal(json.version, '1.0.0', 'has version')

      t.end()
    })

    t.end()
  })

// ----------------------------------------------------------------------------
