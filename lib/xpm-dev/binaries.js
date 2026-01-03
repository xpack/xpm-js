/*
 * This file is part of the xPack project (http://xpack.github.io).
 * Copyright (c) 2020-2026 Liviu Ionescu. All rights reserved.
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
  constructor(context) {
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
  async doRun(args) {
    const log = this.log
    log.trace(`${this.constructor.name}.doRun()`)

    log.info(this.title)
    log.info()

    const context = this.context
    const config = context.config

    context.globalConfig = new GlobalConfig()

    const xpmPackage = new XpmPackage({ log, packageFolderPath: config.cwd })

    try {
      // Read `package.json`; throw if not valid.
      this.jsonPackage = await xpmPackage.readPackageDotJson({
        withThrow: true,
      })
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

    const jsonBinaries = this.jsonPackage.xpack.binaries

    if (!jsonBinaries.baseUrl) {
      throw new CliErrorInput(
        'url not found, check for the ' +
          '"xpack.binaries.baseUrl" property in package.json'
      )
    }

    if (!jsonBinaries.platforms) {
      throw new CliErrorInput(
        'platforms not found, check for the ' +
          '"xpack.binaries.platforms" property in package.json'
      )
    }

    log.info()
    for (const [key, platform] of Object.entries(jsonBinaries.platforms)) {
      log.info(`${key}:`)
      log.info(`\tname: ${platform.fileName}`)
      log.info(`\tsha256: ${platform.sha256}`)
    }

    log.info()
    log.info(`URL: ${jsonBinaries.baseUrl}`)

    if (log.isVerbose) {
      this.outputDoneDuration()
    }
    return exitCode
  }

  // --------------------------------------------------------------------------
}

// ----------------------------------------------------------------------------
