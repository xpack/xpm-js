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

// const assert = require('assert')
const fs = require('fs')
// const xml2js = require('xml2js')
const path = require('path')
// const pacote = require('pacote')
// const semver = require('semver')
// const os = require('os')

// https://www.npmjs.com/package/del
const del = require('del')

const GlobalConfig = require('../utils/global-config.js').GlobalConfig
const Xpack = require('../utils/xpack.js').Xpack
// const ManifestId = require('../utils/xpack.js').ManifestId
const FsUtils = require('../utils/fs-utils.js').FsUtils

// ES6: `import { CliCommand, CliExitCodes, CliError } from 'cli-start-options'
const { CliCommand, CliExitCodes, CliErrorApplication, CliErrorSyntax } =
  require('@ilg/cli-start-options')

// ----------------------------------------------------------------------------

const Promisifier = require('@xpack/es6-promisifier').Promisifier

// Promisify functions from the Node.js callbacks library.
// New functions have similar names, but suffixed with `Promise`.
Promisifier.promisifyInPlace(fs, 'lstat')
Promisifier.promisifyInPlace(fs, 'rmdir')
Promisifier.promisifyInPlace(fs, 'stat')
Promisifier.promisifyInPlace(fs, 'unlink')

// For easy migration, inspire from the Node 10 experimental API.
// Do not use `fs.promises` yet, to avoid the warning.
const fsPromises = fs.promises_

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
   * @param {Object} context Reference to a context.
  */
  constructor (context) {
    super(context)

    // Title displayed with the help message.
    this.title = 'xPack manager - uninstall package(s)'
    this.optionGroups = [
      {
        title: 'Uninstall options',
        postOptions: '[[@<scope>/]<name>[@<version]...',
        optionDefs: [
          {
            options: ['-g', '--global'],
            init: ({ config }) => {
              config.isGlobal = false
            },
            action: ({ config }) => {
              config.isGlobal = true
            },
            msg: 'Uninstall the global package(s)',
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
            msg: 'Uninstall the system package(s) (not impl)',
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
            msg: 'Pretend to uninstall the package',
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
            msg: 'Prevent saving to dependencies',
            isOptional: true
          }
        ]
      }
    ]
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
    const context = this.context
    const config = context.config

    log.verbose(this.title)
    log.verbose()

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
      throw new CliErrorSyntax('this command requires arguments')
    }

    context.globalConfig = new GlobalConfig()

    await context.globalConfig.checkDeprecatedFolders(log)

    // The current folder may not be an xPack or even a package at all.
    this.xpack = new Xpack(config.cwd, context)

    try {
      this.packageJson = await this.xpack.readPackageJson()
    } catch (err) {
      // This happens when not installing in a package folder; not an error.
      this.packageJson = null
    }

    let exitCode = CliExitCodes.SUCCESS

    for (const arg of args) {
      exitCode = await this.uninstallPackage(arg)
      if (exitCode !== CliExitCodes.SUCCESS) {
        break
      }
    }

    await this.rewritePackageJson()

    if (exitCode === 0) {
      if (log.isVerbose()) {
        this.outputDoneDuration()
      }
    }
    return exitCode
  }

  // --------------------------------------------------------------------------

  /**
   * @summary Uninstall a single package.
   *
   * @param {String} packSpec Packages specifier, as per pacote usage.
   * @returns {Number|Promise} The process exit code.
   *
   * @description
   * Packages can be removed from the a global location, or in the local
   * folder, which may be an xPack or not.
   */
  async uninstallPackage (packSpec) {
    const log = this.log
    log.trace(`${this.constructor.name}.uninstallPackage('${packSpec}')`)

    const context = this.context
    const config = context.config

    const exitCode = 0

    let scope
    let name
    let version
    if (packSpec.startsWith('@')) {
      const arr = packSpec.split('/')
      if (arr.length > 2) {
        throw new CliErrorApplication(
          `'${packSpec}' not a package name.`)
      }
      scope = arr[0]
      if (arr.length > 1) {
        const arr2 = arr[1].split('@')
        name = arr2[0]
        if (arr2.length > 1) {
          version = arr2[1]
        }
      }
    } else {
      const arr2 = name.split('@')
      name = arr2[0]
      if (arr2.length > 1) {
        version = arr2[1]
      }
    }
    log.trace(scope, name, version)

    if (!name) {
      throw new CliErrorApplication(
        `'${packSpec}' must include a package name.`)
    }

    if (config.isGlobal) {
      const folderName = (scope ? `${scope}/` : '') + name +
      (version ? `/${version}` : '')
      const globalPackagePath =
        path.join(context.globalConfig.globalFolderPath, folderName)

      let stat
      try {
        stat = await fsPromises.stat(globalPackagePath)
      } catch (err) {
        throw new CliErrorApplication(
          `Global package '${packSpec}' not installed`)
      }

      if (stat.isDirectory()) {
        if (!config.isDryRun) {
          log.verbose('Changing permissions to read-write...')
          await FsUtils.chmodRecursive({
            inputPath: globalPackagePath,
            readOnly: false,
            log
          })

          await del(globalPackagePath, { force: true })
          log.info(`'${globalPackagePath}' removed`)
        } else {
          log.info(`Folder '${globalPackagePath}' should be removed`)
        }
      } else {
        throw new CliErrorApplication(`'${globalPackagePath}' not a folder`)
      }
    } else {
      const folderName = (scope ? (scope.slice(1) + '-') : '') + name
      const xpacksFolderName = path.join(
        context.globalConfig.localXpacksFolderName,
        folderName)
      const xPackFolderPath = path.join(config.cwd, xpacksFolderName)

      let stat
      try {
        stat = await fsPromises.lstat(xPackFolderPath)
      } catch (err) {
        throw new CliErrorApplication(
          `Local package '${packSpec}' not installed`)
      }

      if (stat.isSymbolicLink()) {
        if (!config.isDryRun) {
          await fsPromises.unlink(xPackFolderPath)
          log.info(`'${xpacksFolderName}' removed` +
            (version
              ? ` (version ${version} ignored)`
              : ''))

          const key = `${scope}/${name}`
          this.updateDependencies(key)
        } else {
          log.info(`Folder '${xpacksFolderName}' should be removed` +
            (version
              ? ` (version ${version} ignored)`
              : ''))
        }
      } else {
        throw new CliErrorApplication(
          `Symlink '${xpacksFolderName}' not present`)
      }
    }

    return exitCode
  }

  updateDependencies (key) {
    const log = this.log

    const context = this.context
    const config = context.config

    if (!config.doNotSave) {
      const json = this.packageJson
      if (json.dependencies && json.dependencies[key]) {
        if (!config.isDryRun) {
          delete json.dependencies[key]
          log.verbose(`package.json dependencies['${key}'] removed`)
          config.mustRewritePackageJson = true
        } else {
          log.verbose(`package.json dependencies['${key}'] ` +
            'should be removed')
        }
      }
      if (json.devDependencies && json.devDependencies[key]) {
        if (!config.isDryRun) {
          delete json.devDependencies[key]
          log.verbose(`package.json devDependencies['${key}'] removed`)
          config.mustRewritePackageJson = true
        } else {
          log.verbose(`package.json devDependencies['${key}'] ` +
            'should be removed')
        }
      }
    }
  }

  async rewritePackageJson () {
    const log = this.log
    log.trace(`${this.constructor.name}.rewritePackageJson()`)
    const context = this.context
    const config = context.config

    if (!this.packageJson || !config.mustRewritePackageJson) {
      return
    }

    await this.xpack.rewritePackageJson()
  }

  // --------------------------------------------------------------------------
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// The Uninstall class is added as a property of this object.
module.exports.Uninstall = Uninstall

// In ES6, it would be:
// export class Uninstall { ... }
// ...
// import { Uninstall } from 'uninstall.js'

// ----------------------------------------------------------------------------
