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

// https://nodejs.org/docs/latest-v10.x/api/
const fsPromises = require('fs').promises
const path = require('path')
const os = require('os')

// ----------------------------------------------------------------------------

// https://www.npmjs.com/package/make-dir
const makeDir = require('make-dir')

// https://www.npmjs.com/package/del
const del = require('del')

// ----------------------------------------------------------------------------

const { GlobalConfig } = require('../utils/global-config.js')
const { ManifestIds } = require('../utils/xpack.js')
const { Xpack } = require('../../lib/utils/xpack.js')

// https://www.npmjs.com/package/@xpack/xpm-liquid
const { XpmLiquid } = require('@xpack/xpm-liquid')

const { CliCommand, CliError, CliErrorInput, CliExitCodes } =
  require('@ilg/cli-start-options')

// ----------------------------------------------------------------------------

const dotLink = '.link'

// ============================================================================

class Link extends CliCommand {
  // --------------------------------------------------------------------------

  /**
   * @summary Constructor, to set help definitions.
   *
   * @param {Object} context Reference to a context.
   */
  constructor (context) {
    super(context)

    // Title displayed with the help message.
    this.title = 'xPack manager - create links to packages under development'
    this.optionGroups = [
      {
        title: 'Link options',
        postOptions: '[[@<scope>/]<name>]', // Extra arguments.
        optionDefs: [
          {
            options: ['-c', '--config'],
            init: ({ config }) => {
              config.configurationName = undefined
            },
            action: ({ config }, val) => {
              config.configurationName = val.trim()
            },
            msg: 'Link to the configuration build folder',
            param: 'config_name',
            isOptional: true
          }
        ]
      }
    ]
  }

  /**
   * @summary Execute the `link` command.
   *
   * @param {string[]} args Command line arguments.
   * @returns {number|Promise} Return code.
   *
   * @override
   */
  async doRun (args) {
    const log = this.log
    log.trace(`${this.constructor.name}.doRun()`)

    log.verbose(this.title)
    log.verbose()

    const context = this.context
    const config = context.config

    context.globalConfig = new GlobalConfig()

    await context.globalConfig.checkDeprecatedFolders(log)

    // The current folder may not be an xPack or even a package at all.
    this.xpack = new Xpack(config.cwd, context)
    const xpack = this.xpack

    try {
      this.packageJson = await xpack.readPackageJson()
    } catch (err) {
      log.trace(err)
      throw new CliErrorInput(
        'current folder not a valid package, check for package.json')
    }
    const packageJson = this.packageJson

    if (!packageJson.xpack) {
      throw new CliErrorInput(
        'current folder not an xPack, ' +
        'check for the "xpack" property in package.json')
    }

    await xpack.checkMinimumXpmRequired(packageJson)

    if (args.length === 0) {
      if (!packageJson.name || !packageJson.version) {
        throw new CliErrorInput(
          'check for mandatory "name" and "version" properties in package.json')
      }
      await this.createLinkFromRepoToHere()
    } else {
      await this.createLinkToRepoPackage(args)
    }

    if (log.isVerbose()) {
      this.outputDoneDuration()
    }

    return CliExitCodes.SUCCESS
  }

  /*
   * `xpm link
   * Create a development link from global repo to the current package.
   */
  async createLinkFromRepoToHere () {
    const log = this.log
    log.trace(`${this.constructor.name}.createLinkFromRepoToHere()`)

    const context = this.context
    const config = context.config

    if (config.configurationName) {
      throw new CliErrorInput('misplaced --config')
    }

    const xpack = this.xpack
    const packageJson = this.packageJson

    this.manifestIds = new ManifestIds(packageJson)

    const globalPackagePath = path.join(context.globalConfig.globalFolderPath,
      this.manifestIds.getScopedName())

    const globalPackageLinkPath = path.join(globalPackagePath, dotLink)
    let stats
    try {
      // Use `lstat`, since `stat` follows the links.
      stats = await fsPromises.lstat(globalPackageLinkPath)
    } catch (err) {
      // `lstat` failed, the path does not exist; proceed to create the link.
      stats = null
    }

    if (stats) {
      if (stats.isSymbolicLink()) {
        try {
          log.trace(`del('${globalPackageLinkPath}')`)
          await del(globalPackageLinkPath, { force: true })
        } catch (err) {
          log.trace(err)
          throw new CliError(
            `cannot remove '${globalPackageLinkPath}'`)
        }
      } else {
        throw new CliError(
          `'${globalPackageLinkPath}' is not a symbolic link`)
      }
    }

    // Create parent folder, for just in case.
    await makeDir(globalPackagePath)

    // fs.symlink(target, path[, type], callback)
    // 'creates the link called path pointing to target'
    log.trace('symlink' +
      `('${xpack.xpackPath}', '${globalPackageLinkPath})'`)

    if (os.platform() === 'win32') {
      await fsPromises.symlink(xpack.xpackPath, globalPackageLinkPath,
        'junction')
    } else {
      await fsPromises.symlink(xpack.xpackPath, globalPackageLinkPath)
    }
    if (log.isVerbose()) {
      log.info('Development references to package ' +
      `'${this.manifestIds.getScopedName()}' will be redirected to folder ` +
      `'${xpack.xpackPath}'.`)
    } else {
      log.info(
      `${this.manifestIds.getScopedName()} -> ` +
      `'${xpack.xpackPath}'`)
    }
  }

  /*
   * `xpm link <package>
   * Create a link from the current package/configuration to the global
   * development link.
   */
  async createLinkToRepoPackage (args) {
    const log = this.log
    log.trace(`${this.constructor.name}.createLinkFromRepoToHere()`)

    const context = this.context
    const config = context.config

    const xpack = this.xpack
    const packageJson = this.packageJson

    for (const arg of args) {
      const globalPackageLinkPath = path.join(
        context.globalConfig.globalFolderPath,
        arg, dotLink)

      let stats
      try {
        stats = await fsPromises.lstat(globalPackageLinkPath)
      } catch (err) {
        log.trace(err)
        throw new CliErrorInput(
          `there is no development link for package '${arg}'`)
      }

      if (!stats.isSymbolicLink()) {
        throw new CliErrorInput(
          `there is no development link for package '${arg}'`)
      }

      // Follow the link and check the destination.
      try {
        stats = await fsPromises.stat(globalPackageLinkPath)
      } catch (err) {
        log.trace(err)
        throw new CliError(`broken link '${globalPackageLinkPath}'`)
      }
      if (!stats.isDirectory()) {
        throw new CliErrorInput(`package '${arg}' is not linked to a folder`)
      }

      const destXpack = new Xpack(globalPackageLinkPath, context)
      let destPackageJson
      try {
        destPackageJson = await destXpack.readPackageJson()
      } catch (err) {
        log.trace(err)
        throw new CliErrorInput(
          `${arg}' does not link to a package, ` +
          'check for the package.json file')
      }

      if (!destXpack.isXpack()) {
        throw new CliErrorInput(
          `${arg}' does not link to an xPack, ` +
          'check for the "xpack" property in package.json')
      }

      const destManifestIds = new ManifestIds(destPackageJson)

      let localXpacksFolderPath

      if (config.configurationName) {
        // Throws if the configuration is not found.
        const configuration = xpack.retrieveConfiguration({
          packageJson,
          configurationName: config.configurationName
        })

        const liquidEngine = new XpmLiquid(log)
        const liquidMap = liquidEngine.prepareMap(packageJson,
          config.configurationName)

        const buildFolderRelativePath =
          await xpack.computeBuildFolderRelativePath({
            liquidEngine,
            liquidMap,
            configuration,
            configurationName: config.configurationName
          })

        localXpacksFolderPath = path.join(
          config.cwd,
          buildFolderRelativePath,
          context.globalConfig.localXpacksFolderName)
      } else {
        localXpacksFolderPath = path.join(
          config.cwd,
          context.globalConfig.localXpacksFolderName)
      }

      log.trace(`localXpacksFolderPath: ${localXpacksFolderPath}`)

      const localXpacksLinkName = destManifestIds.getFolderName()
      const localXpacksLinkPath = path.join(localXpacksFolderPath,
        localXpacksLinkName)

      log.trace(`localXpacksLinkName: ${localXpacksLinkName}`)
      log.trace(`localXpacksLinkPath: ${localXpacksLinkPath}`)

      try {
        // Use `lstat`, since `stat` follows the links.
        stats = await fsPromises.lstat(localXpacksLinkPath)
      } catch (err) {
        stats = null
        // `lstat` failed, the path does not exist; proceed to create the link.
      }

      if (stats) {
        if (!stats.isSymbolicLink()) {
          throw new CliError(
        `'${context.globalConfig.localXpacksFolderName}` +
        `/${localXpacksLinkName}' is not a symbolic link; ` +
        'preserved, it might contain important code')
        }

        try {
          log.trace(`del('${localXpacksLinkPath}')`)
          await del(localXpacksLinkPath, { force: true })
        } catch (err) {
          log.trace(err)
          throw new CliError(
          `cannot remove '${localXpacksLinkPath}'`)
        }
      }

      // Create parent folder, for just in case.
      await makeDir(localXpacksFolderPath)

      // fs.symlink(target, path[, type], callback)
      // 'creates the link called path pointing to target'
      log.trace('symlink' +
      `('${globalPackageLinkPath}', '${localXpacksLinkPath})'`)

      if (os.platform() === 'win32') {
        await fsPromises.symlink(globalPackageLinkPath, localXpacksLinkPath,
          'junction')
      } else {
        await fsPromises.symlink(globalPackageLinkPath, localXpacksLinkPath)
      }

      const destRealPath = await fsPromises.realpath(globalPackageLinkPath)
      if (log.isVerbose()) {
        log.info(`Local reference to '${destManifestIds.getScopedName()}' ` +
        `redirected to the development folder '${destRealPath}'.`)
      } else {
        log.info(`${destManifestIds.getScopedName()} ` +
        `-> '${destRealPath}'`)
      }
    }
  }

  // --------------------------------------------------------------------------
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// The Install class is added as a property of this object.
module.exports.Link = Link

// In ES6, it would be:
// export class Link { ... }
// ...
// import { Link } from 'link.js'

// ----------------------------------------------------------------------------
