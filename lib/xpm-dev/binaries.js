/*
 * This file is part of the xPack distribution
 *   (http://xpack.github.io).
 * Copyright (c) 2020 Liviu Ionescu.
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
 * The `xpm link ...` command implementation.
 */

// ----------------------------------------------------------------------------

const { Xpack } = require('../../lib/utils/xpack.js')
const { GlobalConfig } = require('../utils/global-config.js')

const { CliCommand, CliErrorInput } = require('@ilg/cli-start-options')

// ============================================================================

class Binaries extends CliCommand {
  // --------------------------------------------------------------------------

  /**
   * @summary Constructor, to set help definitions.
   *
   * @param {Object} context Reference to a context.
   */
  constructor (context) {
    super(context)

    // Title displayed with the help message.
    this.title = 'xPack manager - show binaries'
    this.optionGroups = [
    ]
  }

  /**
   * @summary Execute the `link` command.
   *
   * @param {string[]} args Command line arguments.
   * @returns {number} Return code.
   *
   * @override
   */
  async doRun (args) {
    const log = this.log
    log.trace(`${this.constructor.name}.doRun()`)

    log.info(this.title)
    log.info()

    const context = this.context
    const config = context.config

    context.globalConfig = new GlobalConfig()

    // The current folder may not be an xPack or even a package at all.
    this.xpack = new Xpack(config.cwd, context)
    const xpack = this.xpack

    try {
      this.packageJson = await xpack.readPackageJson()
    } catch (err) {
      throw new CliErrorInput(
        'current folder not a valid package, check for package.json')
    }

    if (!this.packageJson.xpack) {
      throw new CliErrorInput(
        'current folder not an xPack, ' +
        'check for the "xpack" property in package.json')
    }

    const exitCode = 0

    const binaries = this.packageJson.xpack.binaries

    if (!binaries.baseUrl) {
      throw new CliErrorInput('url not found, check for the ' +
        '"xpack.binaries.baseUrl" property in package.json')
    }

    if (!binaries.platforms) {
      throw new CliErrorInput('platforms not found, check for the ' +
        '"xpack.binaries.platforms" property in package.json')
    }

    log.info()
    for (const [key, value] of Object.entries(binaries.platforms)) {
      log.info(`${key}:`)
      log.info(`\tname: ${value.fileName}`)
      log.info(`\tsha256: ${value.sha256}`)
    }

    log.info()
    log.info(`URL: ${binaries.baseUrl}`)

    this.outputDoneDuration()
    return exitCode
  }

  // --------------------------------------------------------------------------
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// The Binaries class is added as a property of this object.
module.exports.Binaries = Binaries

// In ES6, it would be:
// export class Binaries { ... }
// ...
// import { Binaries } from 'binaries.js'

// ----------------------------------------------------------------------------
