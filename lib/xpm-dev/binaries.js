/*
 * This file is part of the xPack project (http://xpack.github.io).
 * Copyright (c) 2020 Liviu Ionescu. All rights reserved.
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
 * The `xpm-dev binaries ...` command implementation.
 */

// ----------------------------------------------------------------------------

// import { CliCommand, CliErrorInput } from '@ilg/cli-start-options'
import cliStartOptionsCsj from '@ilg/cli-start-options'

// https://www.npmjs.com/package/@xpack/xpm-lib
import { XpmPackage } from '@xpack/xpm-lib'

// ----------------------------------------------------------------------------

import { GlobalConfig } from '../utils/global-config.js'

// ----------------------------------------------------------------------------

const { CliCommand, CliErrorInput } = cliStartOptionsCsj

// ============================================================================

export class Binaries extends CliCommand {
  // --------------------------------------------------------------------------

  /**
   * @summary Constructor, to set help definitions.
   *
   * @param {Object} context Reference to a context.
   */
  constructor (context) {
    super(context)

    // Title displayed with the help message.
    this.title = 'xPack project manager - show binaries'
    this.optionGroups = []
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

    const xpmPackage = new XpmPackage({ log, folderPath: config.cwd })

    try {
      // Read `package.json`; throw if not valid.
      this.jsonPackage = await xpmPackage.readPackageDotJsonThrow()
    } catch (err) {
      throw new CliErrorInput(err.message)
    }

    if (!xpmPackage.isXpmPackage()) {
      throw new CliErrorInput(
        'current folder is not an xpm package, ' +
          'check for the "xpack" property in package.json'
      )
    }

    const exitCode = 0

    const binaries = this.packageJson.xpack.binaries

    if (!binaries.baseUrl) {
      throw new CliErrorInput(
        'url not found, check for the ' +
          '"xpack.binaries.baseUrl" property in package.json'
      )
    }

    if (!binaries.platforms) {
      throw new CliErrorInput(
        'platforms not found, check for the ' +
          '"xpack.binaries.platforms" property in package.json'
      )
    }

    log.info()
    for (const [key, value] of Object.entries(binaries.platforms)) {
      log.info(`${key}:`)
      log.info(`\tname: ${value.fileName}`)
      log.info(`\tsha256: ${value.sha256}`)
    }

    log.info()
    log.info(`URL: ${binaries.baseUrl}`)

    if (log.isVerbose) {
      this.outputDoneDuration()
    }
    return exitCode
  }

  // --------------------------------------------------------------------------
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// The Binaries class is added as a property of this object.
// module.exports.Binaries = Binaries

// In ES6, it would be:
// export class Binaries { ... }
// ...
// import { Binaries } from 'binaries.js'

// ----------------------------------------------------------------------------
