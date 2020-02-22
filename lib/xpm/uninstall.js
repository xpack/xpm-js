/*
 * This file is part of the xPack distribution
 *   (http://xpack.github.io).
 * Copyright (c) 2019 Liviu Ionescu.
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

const assert = require('assert')
const fs = require('fs')
// const xml2js = require('xml2js')
const path = require('path')
const pacote = require('pacote')
// const semver = require('semver')
const os = require('os')

// https://www.npmjs.com/package/make-dir
const makeDir = require('make-dir')

// https://www.npmjs.com/package/del
const del = require('del')

// https://www.npmjs.com/package/cmd-shim
const cmdShim = require('../utils/cmd-shim.js')

// https://www.npmjs.com/package/cp-file
const cpFile = require('cp-file')

const GlobalConfig = require('../utils/global-config.js').GlobalConfig
const Xpack = require('../utils/xpack.js').Xpack
const ManifestId = require('../utils/xpack.js').ManifestId
const Spawn = require('../utils/spawn.js').Spawn

const Promisifier = require('@xpack/es6-promisifier').Promisifier

// ES6: `import { CliCommand, CliExitCodes, CliError } from 'cli-start-options'
const { CliCommand, CliExitCodes, CliUtils } =
  require('@ilg/cli-start-options')

// ----------------------------------------------------------------------------

// Promisify functions from the Node.js callbacks library.
// New functions have similar names, but suffixed with `Promise`.
Promisifier.promisifyInPlace(fs, 'symlink')
// Promisifier.promisifyInPlace(fs, 'link')
Promisifier.promisifyInPlace(fs, 'stat')

// For easy migration, inspire from the Node 10 experimental API.
// Do not use `fs.promises` yet, to avoid the warning.
const fsPromises = fs.promises_

// ----------------------------------------------------------------------------

const localXpacksFolderName = 'xpacks'

// ============================================================================

/**
 * @typedef {Object} Install
 * @property {GlobalConfig} globalConfig Global configuration properties.
 * @property {Xpack} xpack The object with xPack utilities.
 * @property {Object} packageJson The object parsed by xpack; may be null.
 */
class Uninstall extends CliCommand {
  // --------------------------------------------------------------------------

  /**
   * @summary Constructor, to set help definitions.
   *
   * @param {Object} params The generic parameters object.
   */
  constructor (params) {
    super(params)

    this.cliOptions.addOptionsGroups(
      [
        {
          title: 'Uninstall options',
          insertInFront: true,
          optionsDefs: [
            {
              options: ['-g', '--global'],
              init: ({ config }) => {
                config.isGlobal = false
              },
              action: ({ config }) => {
                config.isGlobal = true
              },
              message: 'Uninstall the global package',
              isOptional: true
            },
            {
              options: ['-sy', '--system'],
              init: ({ config }) => {
                config.isSystem = false
              },
              action: ({ config }) => {
                config.isSystem = true
              },
              message: 'Uninstall the system package (not impl)',
              isOptional: true
            },
            {
              options: ['-n', '--dry-run'],
              init: ({ config }) => {
                config.isDryRun = false
              },
              action: ({ config }) => {
                config.isDryRun = true
              },
              message: 'Pretend to install the package (not impl)',
              isOptional: true
            },
            {
              options: ['--no-save'],
              init: ({ config }) => {
                config.doNotSave = false
              },
              action: ({ config }) => {
                config.doNotSave = true
              },
              message: 'Prevent saving to dependencies',
              isOptional: true
            }
          ]
        }
      ]
    )
  }

  /**
   * @summary Execute the `uninstall` command.
   *
   * @param {string[]} args Command line arguments.
   * @returns {Number|Promise} The process exit code.
   *
   * @override
   * @description
   * TODO
   */
  async doRun (args) {
    const log = this.log
    log.trace(`${this.constructor.name}.doRun()`)

    const config = this.config

    log.info(this.helpTitle)
    log.info()

    // Extra options are not catched by CLI and must be checked/filtered here.
    args.forEach((element) => {
      if (element.startsWith('-')) {
        log.warn(`'${element}' ignored`)
      }
    })
    args = args.filter((element) => {
      return !element.startsWith('-')
    })

    if (args.length === 0) {
      log.info('This command requires arguments.')
      return CliExitCodes.ERROR.SYNTAX
    }

    this.globalConfig = new GlobalConfig()

    // The current folder may not be an xPack or even a package at all.
    this.xpack = new Xpack({ xpackFolderAbsolutePath: config.cwd, log })

    try {
      this.packageJson = await this.xpack.readPackageJson()
    } catch (err) {
      // This happens when not installing in a package folder; not an error.
      this.packageJson = null
    }

    // By default, on Windows 'junctions' are created for linked folders.
    // When true symbolic links will work, this might be enabled.
    // this.hasWinSymLink = true

    let exitCode = CliExitCodes.SUCCESS

    if (args.length > 0) {
      // Try to uninstall all packages given as args.
      exitCode = await this.uninstallPackages(args)
    }

    this.outputDoneDuration()
    return exitCode
  }

  // --------------------------------------------------------------------------

  /**
   * @summary Iterate args and install all packages.
   *
   * @param {String[]} args Array of package specs.
   * @returns {Number|Promise} The process exit code.
   *
   * @description
   * If a package cannot be installed, the remaining are ignored.
   *
   * At the end, the package.json s updated, if needed.
   */
  async uninstallPackages (args) {
    const log = this.log
    log.trace(`${this.constructor.name}.iunnstallPackages()`)

    const config = this.config

    let exitCode = CliExitCodes.SUCCESS
    for (const arg of args) {
      exitCode = await this.uninstallPackage(arg)
      if (exitCode !== CliExitCodes.SUCCESS) {
        break
      }
    }

    await this.rewritePackageJson()

    if (config.isGlobal) {
      if (config.doSaveProd || config.doSaveDev || config.doSaveOptional ||
        config.doSaveExact || config.doSaveBundle) {
        log.warn('Save related option(s) ignored for global installs.')
      }
    } else {
      if (config.doSaveBundle) {
        log.warn('--save-bundle not yet implemented, ignored.')
      }
    }
    return exitCode
  }

  /**
   * @summary Uninstall a single package, using pacote.
   *
   * @param {String} packSpec Packages specifier, as per pacote usage.
   * @returns {Number|Promise} The process exit code.
   *
   * @description
   * Packages can be installed in a global location, or in the local
   * folder, which may be an xPack or not.
   */
  async uninstallPackage (packSpec) {
    const log = this.log
    log.trace(`${this.constructor.name}.installPackage('${packSpec}')`)

    const config = this.config

    let exitCode = 0

    // TODO
    return exitCode
  }

  // --------------------------------------------------------------------------
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// The Install class is added as a property of this object.
module.exports.Uninstall = Uninstall

// In ES6, it would be:
// export class Uninstall { ... }
// ...
// import { Uninstall } from 'uninstall.js'

// ----------------------------------------------------------------------------
