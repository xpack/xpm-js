/*
 * This file is part of the xPack project (http://xpack.github.io).
 * Copyright (c) 2020 Liviu Ionescu. All rights reserved.
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
 * The `xpm link ...` command implementation.
 */

// ----------------------------------------------------------------------------

// https://nodejs.org/docs/latest-v12.x/api/index.htm
import fs from 'fs'
import path from 'path'
import util from 'util'

// ----------------------------------------------------------------------------

// import { CliCommand, CliError, CliErrorInput,
// CliExitCodes } from '@ilg/cli-start-options'
import cliStartOptionsCsj from '@ilg/cli-start-options'

// ----------------------------------------------------------------------------

import { Xpack } from '../../lib/utils/xpack.js'

import { GlobalConfig } from '../utils/global-config.js'

// ----------------------------------------------------------------------------

const {
  CliCommand, CliError, CliErrorInput, CliExitCodes
} = cliStartOptionsCsj
const fsPromises = fs.promises

// ============================================================================

export class BinariesUpdate extends CliCommand {
  // --------------------------------------------------------------------------

  /**
   * @summary Constructor, to set help definitions.
   *
   * @param {Object} context Reference to a context.
   */
  constructor (context) {
    super(context)

    // Title displayed with the help message.
    this.title = 'xPack project manager - update binaries'
    this.optionGroups = [
      {
        title: 'Update binaries options',
        postOptions: '<version> <folder>', // Extra arguments.
        optionDefs: [
        ]
      }
    ]
  }

  /**
   * @summary Execute the `binaries-update` command.
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

    // The current folder may not be an xpm package or even a package at all.
    this.xpack = new Xpack(config.cwd, context)
    const xpack = this.xpack

    try {
      this.packageJson = await xpack.readPackageJson()
    } catch (err) {
      throw new CliErrorInput('not a package, check for the package.json')
    }

    if (!this.packageJson.xpack) {
      throw new CliErrorInput(
        'current folder not an xpm package, ' +
        'check for the "xpack" property in package.json')
    }

    if (args.length !== 2) {
      throw new CliError('this command requires two arguments',
        CliExitCodes.ERROR.SYNTAX)
    }

    const version = args[0]
    const fromFolderPath = await fsPromises.realpath(args[1])
    // Follow the link and check the destination.
    let stats
    try {
      stats = await fsPromises.stat(fromFolderPath)
    } catch (err) {
      throw new CliErrorInput(`'${fromFolderPath}' does not exist`)
    }
    if (!stats.isDirectory()) {
      throw new CliErrorInput(`'${fromFolderPath}' is not a folder`)
    }

    log.verbose(`Scanning '${fromFolderPath}' for .sha files...`)

    const archiveNames = {}

    const fileNames = await fsPromises.readdir(fromFolderPath)
    for (const fileName of fileNames) {
      log.trace(`File name: ${fileName}`)

      if (!fileName.includes(version)) {
        log.warn(`'${fileName}' is not version '${version}, ignored`)
        continue
      }

      if (fileName.endsWith('.sha')) {
        const filePath = path.join(fromFolderPath, fileName)
        log.verbose(`Parsing file: ${filePath}...`)

        const fileContent = await fsPromises.readFile(filePath,
          { encoding: 'ascii' })

        const lines = fileContent.split('\n')

        for (const line of lines) {
          if (line.trim().length) {
            log.trace(`Line from file: ${line}`)
            const words = line.split('  ')
            archiveNames[words[1]] = words[0]
          }
        }
      }
    }

    const jsonBinaries = this.packageJson.xpack.binaries

    log.info('Processing entries...')
    for (const [key, value] of Object.entries(archiveNames)) {
      if (key === '.DS_Store') {
        continue
      }

      log.info(`- ${key}`)

      const parts = key.split('-')
      log.trace(parts)
      const filePlatform = parts[parts.length - 2]
      const fileArchitecture = parts[parts.length - 1].split('.')[0]
      log.trace(filePlatform, fileArchitecture)

      let jsonPlatformName = `${filePlatform}-${fileArchitecture}`
      let jsonPlatform = jsonBinaries.platforms[jsonPlatformName]
      if (!jsonPlatform && fileArchitecture === 'ia32') {
        jsonPlatformName = `${filePlatform}-x86`
        jsonPlatform = jsonBinaries.platforms[jsonPlatformName]
      }
      if (!jsonPlatform) {
        log.warn(`${filePlatform}-${fileArchitecture} not found, ignored`)
      } else {
        if (jsonPlatformName.endsWith('x86')) {
          log.warn(`Platform '${jsonPlatformName}' deprecated, ` +
            `use '${filePlatform}-${fileArchitecture}'`)
        }
        jsonBinaries.platforms[jsonPlatformName] = {
          fileName: key,
          sha256: value
        }
      }
    }

    // Do not add the terminating '/'!
    const baseUrl = jsonBinaries.baseUrl.replace(/\/v[0-9].*$/, `/v${version}`)
    jsonBinaries.baseUrl = baseUrl

    log.info()
    log.info(`URL: '${baseUrl}'`)

    log.trace(util.inspect(jsonBinaries))

    await xpack.rewritePackageJson()

    this.outputDoneDuration()
    return CliExitCodes.SUCCESS
  }

  // --------------------------------------------------------------------------
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// The BinariesUpdate class is added as a property of this object.
// module.exports.BinariesUpdate = BinariesUpdate

// In ES6, it would be:
// export class BinariesUpdate { ... }
// ...
// import { BinariesUpdate } from 'binaries-update.js'

// ----------------------------------------------------------------------------
