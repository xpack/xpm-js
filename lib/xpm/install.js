/*
 * This file is part of the xPack distribution
 *   (http://xpack.github.io).
 * Copyright (c) 2017 Liviu Ionescu.
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
 * The `xpm install <options> ...` command implementation.
 */

// ----------------------------------------------------------------------------

const pacote = require('pacote')
const GlobalConfig = require('../utils/global-config.js').GlobalConfig
const Xpack = require('../utils/xpack.js').Xpack

// const fs = require('fs')
// const xml2js = require('xml2js')
const path = require('path')

const Promisifier = require('@ilg/es6-promisifier').Promisifier

// ES6: `import { CliCommand, CliExitCodes, CliError } from 'cli-start-options'
const CliCommand = require('@ilg/cli-start-options').CliCommand
const CliExitCodes = require('@ilg/cli-start-options').CliExitCodes
// const CliError = require('@ilg/cli-start-options').CliError

// ----------------------------------------------------------------------------

// Promisify functions from the Node.js library.
const rimrafPromise = Promisifier.promisify(require('rimraf'))

// ============================================================================

class Install extends CliCommand {
  // --------------------------------------------------------------------------

  /**
   * @summary Constructor, to set help definitions.
   *
   * @param {Object} context Reference to a context.
   */
  constructor (context) {
    super(context)

    // Title displayed with the help message.
    this.title = 'Install an xPack'
    this.optionGroups = [
      {
        title: 'Install options',
        postOptions: '[[@<scope>]/<name>[@<version]]', // Extra arguments.
        optionDefs: [
          {
            options: [ '-g', '--global' ],
            init: (context) => {
              context.config.isGlobal = false
            },
            action: (context) => {
              context.config.isGlobal = true
            },
            msg: 'Install the package globally in the home folder',
            isOptional: true
          },
          {
            options: [ '-sy', '--system' ],
            init: (context) => {
              context.config.isSystem = false
            },
            action: (context) => {
              context.config.isSystem = true
            },
            msg: 'Install the package in a system folder (not impl)',
            isOptional: true
          },
          {
            options: [ '-f', '--force' ],
            init: (context) => {
              context.config.doForce = false
            },
            action: (context) => {
              context.config.doForce = true
            },
            msg: 'Force install over existing package',
            isOptional: true
          },
          {
            options: [ '-n', '--dry-run' ],
            init: (context) => {
              context.config.isDryRun = false
            },
            action: (context) => {
              context.config.isDryRun = true
            },
            msg: 'Pretend to install the package (not impl)',
            isOptional: true
          }
        ]
      }
    ]
  }

  /**
   * @summary Execute the `install` command.
   *
   * @param {string[]} args Command line arguments.
   * @returns {number} Return code.
   *
   * @override
   */
  async doRun (args) {
    const log = this.log
    log.trace(`${this.constructor.name}.doRun()`)
    const context = this.context

    log.info(this.title)
    // const config = this.context.config
    if (args.length > 1) {
      for (let i = 1; i < args.length; ++i) {
        log.warn(`'${args[i]}' ignored`)
      }
    }

    context.globalConfig = new GlobalConfig()

    let exitCode = 0
    if (args.length > 0) {
      exitCode = await this.installPackage(args[0])
    } else {
      exitCode = await this.installDependencies()
    }
    this.outputDoneDuration()
    return exitCode
  }

  async installPackage (pack) {
    const log = this.log
    log.trace(`${this.constructor.name}.installPackage('${pack}')`)
    const context = this.context
    const config = context.config

    const cache = context.globalConfig.cacheFolderPath
    let manifest
    try {
      manifest = await pacote.manifest(pack, { cache })
    } catch (err) {
      log.error(err)
      return CliExitCodes.ERROR.INPUT
    }

    // Read the cwd package.json
    this.xpack = new Xpack(config.cwd, context)

    const parts = this.xpack.parseManifestId(manifest._id)
    let globalPackagePath
    let packFullName
    if (parts.scope) {
      globalPackagePath = path.join(context.globalConfig.globalFolderPath,
        parts.scope, parts.name, parts.version)
      packFullName = `${parts.scope}/${parts.name}@${parts.version}`
    } else {
      globalPackagePath = path.join(context.globalConfig.globalFolderPath,
        parts.name, parts.version)
      packFullName = `${parts.name}@${parts.version}`
    }
    log.info()
    log.info(`Processing ${packFullName}...`)

    let destJson = await this.xpack.maybePack(globalPackagePath)
    if (config.isGlobal) {
      if (destJson) {
        if (config.doForce) {
          log.info(`Removing existing package '${globalPackagePath}'...`)
          await rimrafPromise(globalPackagePath)
        } else {
          log.warn('Destination package already there. ' +
            'Use --force to overwrite.')
          return CliExitCodes.ERROR.OUTPUT
        }
      }

      log.info(`Installing globally into '${globalPackagePath}'...`)
      await pacote.extract(pack, globalPackagePath, { cache })
    } else {
      if (!destJson) {
        await pacote.extract(pack, globalPackagePath, { cache })
      }
    }

    if (!config.isGlobal) {
      let localPackagePath = config.cwd
      const json = await this.xpack.maybePack(config.cwd)
      if (json) {
        localPackagePath = path.join(localPackagePath, 'xpacks')
      }
      if (parts.scope) {
        localPackagePath = path.join(localPackagePath,
          `${parts.scope.slice(1)}-${parts.name}`)
      } else {
        localPackagePath = path.join(localPackagePath, `${parts.name}`)
      }

      destJson = await this.xpack.maybePack(localPackagePath)
      if (destJson) {
        if (config.doForce) {
          log.info(`Removing existing package '${localPackagePath}'...`)
          await rimrafPromise(localPackagePath)
        } else {
          log.warn('Destination package already there. ' +
            'Use --force to overwrite.')
          return CliExitCodes.ERROR.OUTPUT
        }
      }

      if (json) {
        log.info(`Installing in '${localPackagePath}'...`)
      } else {
        log.info(`Installing standalone into '${localPackagePath}'...`)
      }
      await pacote.extract(pack, localPackagePath, { cache })
    }
    return CliExitCodes.SUCCESS
  }

  async installDependencies () {
    const log = this.log
    log.trace(`${this.constructor.name}.installDependencies()`)

    return CliExitCodes.SUCCESS
  }

  // --------------------------------------------------------------------------
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// The Install class is added as a property of this object.
module.exports.Install = Install

// In ES6, it would be:
// export class Install { ... }
// ...
// import { Install } from 'install.js'

// ----------------------------------------------------------------------------
