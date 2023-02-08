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
 * Test common options, like --version, --help, etc.
 */

// ----------------------------------------------------------------------------

// https://nodejs.org/docs/latest-v12.x/api/index.htm
import path from 'path'
import { fileURLToPath } from 'url'

// ----------------------------------------------------------------------------

// The `[node-tap](http://www.node-tap.org)` framework.
import { test } from 'tap'

// ----------------------------------------------------------------------------

// import { CliApplication } from '@ilg/cli-start-options';
import cliStartOptionsCsj from '@ilg/cli-start-options'

// ----------------------------------------------------------------------------

import { Common } from '../common.js'

// ----------------------------------------------------------------------------

const { CliApplication } = cliStartOptionsCsj
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ----------------------------------------------------------------------------

let pack = null
const rootPath = path.dirname(path.dirname(__dirname))

test('setup', async (t) => {
  // Read in the package.json, to later compare version.
  pack = await CliApplication.readPackageJson(rootPath)
  t.ok(pack, 'package ok')
  t.ok(pack.version.length > 0, 'version length > 0')
  t.pass(`package ${pack.name}@${pack.version}`)
  t.end()
})

test('xpm --version (spawn)', async (t) => {
  try {
    const { code, stdout, stderr } = await Common.xpmCli([
      '--version'
    ])
    // Check exit code.
    t.equal(code, 0, 'exit 0')
    // Check if version matches the package.
    // Beware, the stdout string has a new line terminator.
    t.equal(stdout, pack.version + '\n', 'version ok')
    // There should be no error messages.
    t.equal(stderr, '', 'stderr empty')
  } catch (err) {
    t.fail(err.message)
  }
  t.end()
})

test('xpm -h (spawn)', async (t) => {
  try {
    const { code, stdout, stderr } = await Common.xpmCli([
      '-h'
    ])
    t.equal(code, 0, 'exit 0')
    t.match(stdout, 'Usage: xpm <command>', 'has Usage')

    t.match(stdout, 'The xPack project manager command line tool',
      'has title')
    t.match(stdout, 'xpm -h|--help', 'has -h|--help')
    t.match(stdout, 'xpm <command> -h|--help', 'has <command> -h|--help')
    t.match(stdout, 'xpm --version', 'has --version')
    t.match(stdout, 'xpm -i|--interactive', 'has -i|--interactive')
    t.match(stdout, 'Set log level (silent|warn|info|verbose|debug|trace)',
      'has log levels')
    t.match(stdout, '-s|--silent', 'has -s|--silent')
    t.match(stdout, 'Bug reports:', 'has Bug reports:')
    // There should be no error messages.
    t.equal(stderr, '', 'stderr empty')
  } catch (err) {
    t.fail(err.message)
  }
  t.end()
})

test('xpm --help (spawn)', async (t) => {
  try {
    const { code, stdout, stderr } = await Common.xpmCli([
      '--help'
    ])
    t.equal(code, 0, 'exit 0')
    t.match(stdout, 'Usage: xpm <command>', 'has Usage')
    // There should be no error messages.
    t.equal(stderr, '', 'stderr empty')
  } catch (err) {
    t.fail(err.message)
  }
  t.end()
})

test('xpm -d (spawn)', async (t) => {
  try {
    const { code, stdout, stderr } = await Common.xpmCli([
      '--version',
      '-dd'
    ])
    t.equal(code, 0, 'exit 0')
    t.ok(stdout.length > 0, 'has stdout')
    t.match(stdout, 'debug: start arg0:', 'has debug')
    t.ok(stderr === '', 'has no stderr')
  } catch (err) {
    t.fail(err.message)
  }
  t.end()
})

// ----------------------------------------------------------------------------
