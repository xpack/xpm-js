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
const os = require('os')

// https://www.npmjs.com/package/make-dir
const makeDir = require('make-dir')

// https://www.npmjs.com/package/del
const del = require('del')

const CliCommand = require('@ilg/cli-start-options').CliCommand
const CliError = require('@ilg/cli-start-options').CliError
const CliErrorApplication = require('@ilg/cli-start-options')
  .CliErrorApplication
const CliExitCodes = require('@ilg/cli-start-options').CliExitCodes

const Promisifier = require('@xpack/es6-promisifier').Promisifier

const Xpack = require('../../lib/utils/xpack.js').Xpack
const GlobalConfig = require('../utils/global-config.js').GlobalConfig
const ManifestIds = require('../utils/xpack.js').ManifestIds

// ----------------------------------------------------------------------------

// Promisify functions from the Node.js callbacks library.
// New functions have similar names, but suffixed with `Promise`.
Promisifier.promisifyInPlace(fs, 'stat')
Promisifier.promisifyInPlace(fs, 'lstat')
Promisifier.promisifyInPlace(fs, 'symlink')
Promisifier.promisifyInPlace(fs, 'realpath')

// For easy migration, inspire from the Node 10 experimental API.
// Do not use `fs.promises` yet, to avoid the warning.
const fsPromises = fs.promises_

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
        ]
      }
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

    log.verbose(this.title)
    log.verbose()

    const context = this.context
    const config = context.config

    context.globalConfig = new GlobalConfig()

    // The current folder may not be an xPack or even a package at all.
    this.xpack = new Xpack(config.cwd, context)

    try {
      this.packageJson = await this.xpack.readPackageJson()
    } catch (err) {
      throw new CliError('Not a package. Check for the package.json file.',
        CliExitCodes.ERROR.INPUT)
    }

    if (!this.packageJson.xpack) {
      throw new CliError('Not an xPack. Check for the package.xpack property.',
        CliExitCodes.ERROR.INPUT)
    }

    this.manifestIds = new ManifestIds(this.packageJson)

    let exitCode = 0

    if (args.length === 0) {
      exitCode = await this.createLinkFromRepoToHere()
    } else {
      exitCode = await this.createLinkToRepoPackage(args)
    }

    if (log.isVerbose()) {
      this.outputDoneDuration()
    }
    return exitCode
  }

  async createLinkFromRepoToHere () {
    const log = this.log
    log.trace(`${this.constructor.name}.createLinkFromRepoToHere()`)

    const context = this.context
    // const config = context.config

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
          throw new CliErrorApplication(
            `Cannot remove '${globalPackageLinkPath}'.`)
        }
      } else {
        throw new CliErrorApplication(
          `'${globalPackageLinkPath}' is not a symbolic link.`)
      }
    }

    // Create parent folder, for just in case.
    await makeDir(globalPackagePath)

    // fs.symlink(target, path[, type], callback)
    // 'creates the link called path pointing to target'
    log.trace('symlink' +
      `('${this.xpack.xpackPath}', '${globalPackageLinkPath})'`)

    if (os.platform() === 'win32') {
      await fsPromises.symlink(this.xpack.xpackPath, globalPackageLinkPath,
        'junction')
    } else {
      await fsPromises.symlink(this.xpack.xpackPath, globalPackageLinkPath)
    }
    if (log.isVerbose()) {
      log.info('Development references to package ' +
      `'${this.manifestIds.getScopedName()}' will be redirected to folder ` +
      `'${this.xpack.xpackPath}'.`)
    } else {
      log.info(
      `${this.manifestIds.getScopedName()} -> ` +
      `'${this.xpack.xpackPath}'`)
    }
    return CliExitCodes.SUCCESS
  }

  async createLinkToRepoPackage (args) {
    const log = this.log
    log.trace(`${this.constructor.name}.createLinkFromRepoToHere()`)

    const context = this.context
    const config = context.config

    for (const arg of args) {
      const globalPackageLinkPath = path.join(
        context.globalConfig.globalFolderPath,
        arg, dotLink)

      let stats
      try {
        stats = await fsPromises.lstat(globalPackageLinkPath)
      } catch (err) {
        throw new CliError(
          `There is no development link for package '${arg}'.`,
          CliExitCodes.ERROR.INPUT)
      }

      if (!stats.isSymbolicLink()) {
        throw new CliError(
          `There is no development link for package '${arg}'.`,
          CliExitCodes.ERROR.INPUT)
      }

      // Follow the link and check the destination.
      stats = await fsPromises.stat(globalPackageLinkPath)
      if (!stats.isDirectory()) {
        throw new CliError(`Package '${arg}' is not linked to a folder.`,
          CliExitCodes.ERROR.INPUT)
      }

      const destXpack = new Xpack(globalPackageLinkPath, context)
      let destPackageJson
      try {
        destPackageJson = await destXpack.readPackageJson()
      } catch (err) {
        throw new CliError(
          `${arg}' does not link to a package. ` +
          'Check for the package.json file.',
          CliExitCodes.ERROR.INPUT)
      }

      if (!destXpack.isXpack()) {
        throw new CliError(
          `${arg}' does not link to an xPack. ` +
          'Check for the package.xpack property.',
          CliExitCodes.ERROR.INPUT)
      }

      const destManifestIds = new ManifestIds(destPackageJson)

      const localXpacksFolderPath = path.join(config.cwd,
        context.globalConfig.localXpacksFolderName)
      const localXpacksLinkName = destManifestIds.getFolderName()
      const localXpacksLinkPath = path.join(localXpacksFolderPath,
        localXpacksLinkName)

      try {
        // Use `lstat`, since `stat` follows the links.
        stats = await fsPromises.lstat(localXpacksLinkPath)
      } catch (err) {
        stats = null
        // `lstat` failed, the path does not exist; proceed to create the link.
      }

      if (stats) {
        if (!stats.isSymbolicLink()) {
          throw new CliErrorApplication(
        `'${context.globalConfig.localXpacksFolderName}` +
        `/${localXpacksLinkName}' is not a symbolic link; ` +
        'preserved, it might contain important code.')
        }

        try {
          log.trace(`del('${localXpacksLinkPath}')`)
          await del(localXpacksLinkPath, { force: true })
        } catch (err) {
          throw new CliErrorApplication(
          `Cannot remove '${localXpacksLinkPath}'.`)
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

    return CliExitCodes.SUCCESS
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
