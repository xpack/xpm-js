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

const path = require('path')
const fs = require('fs')
const util = require('util')

const CliCommand = require('@ilg/cli-start-options').CliCommand
const CliError = require('@ilg/cli-start-options').CliError
const CliExitCodes = require('@ilg/cli-start-options').CliExitCodes

const Promisifier = require('@xpack/es6-promisifier').Promisifier

const Xpack = require('../../lib/utils/xpack.js').Xpack
const GlobalConfig = require('../utils/global-config.js').GlobalConfig

// ----------------------------------------------------------------------------

// Promisify functions from the Node.js callbacks library.
// New functions have similar names, but suffixed with `Promise`.
Promisifier.promisifyInPlace(fs, 'stat')
Promisifier.promisifyInPlace(fs, 'readdir')
Promisifier.promisifyInPlace(fs, 'readFile')
Promisifier.promisifyInPlace(fs, 'realpath')

// For easy migration, inspire from the Node 10 experimental API.
// Do not use `fs.promises` yet, to avoid the warning.
const fsPromises = fs.promises_

// ============================================================================

class BinariesUpdate extends CliCommand {
  // --------------------------------------------------------------------------

  /**
   * @summary Constructor, to set help definitions.
   *
   * @param {Object} context Reference to a context.
   */
  constructor (context) {
    super(context)

    // Title displayed with the help message.
    this.title = 'xPack manager - update binaries'
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

    // The current folder may not be an xPack or even a package at all.
    this.xpack = new Xpack(config.cwd, context)

    try {
      this.packageJson = await this.xpack.readPackageJson()
    } catch (err) {
      throw new CliError('not a package, check for the package.json',
        CliExitCodes.ERROR.INPUT)
    }

    if (!this.packageJson.xpack) {
      throw new CliError(
        'not an xPack, check for the "xpack" property in package.json',
        CliExitCodes.ERROR.INPUT)
    }

    if (args.length !== 2) {
      throw new CliError('this command requires two arguments',
        CliExitCodes.ERROR.SYNTAX)
    }

    const version = args[0]
    const fromFolder = await fsPromises.realpath(args[1])
    // Follow the link and check the destination.
    let stats
    try {
      stats = await fsPromises.stat(fromFolder)
    } catch (ex) {
      throw new CliError(`'${fromFolder}' does not exist`,
        CliExitCodes.ERROR.INPUT)
    }
    if (!stats.isDirectory()) {
      throw new CliError(`'${fromFolder}' is not a folder`,
        CliExitCodes.ERROR.INPUT)
    }

    log.verbose(`Scanning '${fromFolder}' for .sha files...`)

    const archiveNames = {}

    const fileNames = await fsPromises.readdir(fromFolder)
    for (const fileName of fileNames) {
      log.trace(`File name: ${fileName}`)

      if (!fileName.includes(version)) {
        log.warn(`'${fileName}' is not version '${version}, ignored`)
        continue
      }

      if (fileName.endsWith('.sha')) {
        const filePath = path.join(fromFolder, fileName)
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

    await this.xpack.rewritePackageJson()

    this.outputDoneDuration()
    return CliExitCodes.SUCCESS
  }

  // --------------------------------------------------------------------------
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// The BinariesUpdate class is added as a property of this object.
module.exports.BinariesUpdate = BinariesUpdate

// In ES6, it would be:
// export class BinariesUpdate { ... }
// ...
// import { BinariesUpdate } from 'binaries-update.js'

// ----------------------------------------------------------------------------
