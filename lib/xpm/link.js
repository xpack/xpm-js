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
 * The `xpm link ...` command implementation.
 */

// ----------------------------------------------------------------------------

// https://nodejs.org/docs/latest/api/
import fs from 'fs'
import util from 'util'
import path from 'path'
import os from 'os'

// ----------------------------------------------------------------------------

// https://www.npmjs.com/package/del
import { deleteAsync } from 'del'

// https://www.npmjs.com/package/make-dir
import { makeDirectory } from 'make-dir'

// ----------------------------------------------------------------------------

// import { CliCommand, CliError, CliErrorInput, CliExitCodes }
// from '@ilg/cli-start-options'
import cliStartOptionsCsj from '@ilg/cli-start-options'

// https://www.npmjs.com/package/@xpack/xpm-lib
import { XpmLiquidPackage, XpmPackage, XpmPolicies } from '@xpack/xpm-lib'

// ----------------------------------------------------------------------------

import { GlobalConfig } from '../utils/global-config.js'
import { ManifestIds } from '../utils/manifest-ids.js'

// ----------------------------------------------------------------------------

const { CliCommand, CliError, CliErrorInput, CliExitCodes } =
  cliStartOptionsCsj
const fsPromises = fs.promises

const dotLink = '.link'

// ============================================================================

export class Link extends CliCommand {
  // --------------------------------------------------------------------------

  /**
   * @summary Constructor, to set help definitions.
   *
   * @param {Object} context Reference to a context.
   */
  constructor (context) {
    super(context)

    // Title displayed with the help message.
    this.title =
      'xPack project manager - ' + 'create links to packages under development'
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

    // The current folder may not be an xpm package or even a package at all.
    const xpmPackage = new XpmPackage({ log, folderPath: config.cwd })
    this.xpmPackage = xpmPackage

    try {
      // Read `package.json`; throw if not valid.
      this.jsonPackage = await xpmPackage.readPackageDotJsonThrow()
    } catch (err) {
      throw new CliErrorInput(err.message)
    }
    const jsonPackage = this.jsonPackage

    if (!xpmPackage.isXpmPackage()) {
      throw new CliErrorInput(
        'current folder is not an xpm package, ' +
          'check for the "xpack" property in package.json'
      )
    }

    try {
      const minVersion = await xpmPackage.checkMinimumXpmRequired(
        context.rootPath
      )
      this.policies = new XpmPolicies({ log, minVersion })
    } catch (err) {
      throw new CliError(err.message, CliExitCodes.ERROR.PREREQUISITES)
    }

    if (args.length === 0) {
      if (!jsonPackage.inNpmPackage()) {
        throw new CliErrorInput(
          'check for mandatory "name" and "version" properties in package.json'
        )
      }
      await this.createLinkFromRepoToHere()
    } else {
      await this.createLinkToRepoPackage(args)
    }

    if (log.isVerbose) {
      this.outputDoneDuration()
    }

    return CliExitCodes.SUCCESS
  }

  /*
   * `xpm link
   * Create a development link from global storage to the current package.
   */
  async createLinkFromRepoToHere () {
    const log = this.log
    log.trace(`${this.constructor.name}.createLinkFromRepoToHere()`)

    const context = this.context
    const config = context.config
    const configurationName = config.configurationName
    const xpmPackage = this.xpmPackage

    if (configurationName) {
      throw new CliErrorInput('misplaced --config')
    }

    const packageJson = this.jsonPackage

    this.manifestIds = new ManifestIds(packageJson, this.policies)

    const globalPackagePath = path.join(
      context.globalConfig.globalFolderPath,
      this.manifestIds.getScopedName()
    )

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
          await deleteAsync(globalPackageLinkPath, { force: true })
        } catch (err) {
          log.trace(util.inspect(err))
          throw new CliError(`cannot remove '${globalPackageLinkPath}'`)
        }
      } else {
        throw new CliError(`'${globalPackageLinkPath}' is not a symbolic link`)
      }
    }

    // Create parent folder, for just in case.
    await makeDirectory(path.dirname(globalPackageLinkPath))

    // fs.symlink(target, path[, type], callback)
    // 'creates the link called path pointing to target'
    log.trace(
      `symlink('${xpmPackage.folderPath}', '${globalPackageLinkPath})'`
    )

    if (os.platform() === 'win32') {
      await fsPromises.symlink(
        xpmPackage.folderPath,
        globalPackageLinkPath,
        'junction'
      )
    } else {
      await fsPromises.symlink(xpmPackage.folderPath, globalPackageLinkPath)
    }
    if (log.isVerbose) {
      log.info(
        'Development references to package ' +
          `'${this.manifestIds.getScopedName()}' will be redirected ` +
          `to folder '${xpmPackage.folderPath}'`
      )
    } else {
      log.info(
        `${this.manifestIds.getScopedName()} -> ` + `'${xpmPackage.folderPath}'`
      )
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
    const configurationName = config.configurationName

    for (const arg of args) {
      const globalPackageLinkPath = path.join(
        context.globalConfig.globalFolderPath,
        arg,
        dotLink
      )

      let stats
      try {
        stats = await fsPromises.lstat(globalPackageLinkPath)
      } catch (err) {
        log.trace(util.inspect(err))
        throw new CliErrorInput(
          `there is no development link for package '${arg}'`
        )
      }

      if (!stats.isSymbolicLink()) {
        throw new CliErrorInput(
          `there is no development link for package '${arg}'`
        )
      }

      // Follow the link and check the destination.
      try {
        stats = await fsPromises.stat(globalPackageLinkPath)
      } catch (err) {
        log.trace(util.inspect(err))
        throw new CliError(`broken link '${globalPackageLinkPath}'`)
      }
      if (!stats.isDirectory()) {
        throw new CliErrorInput(`package '${arg}' is not linked to a folder`)
      }

      const destinationPackage = new XpmPackage({
        log,
        folderPath: globalPackageLinkPath
      })
      let destinationJsonPackage
      try {
        destinationJsonPackage =
          await destinationPackage.readPackageDotJsonThrow()
      } catch (err) {
        // log.trace(util.inspect(err))
        throw new CliErrorInput(err.message)
      }

      if (!destinationPackage.isXpmPackage()) {
        throw new CliErrorInput(
          `${arg}' does not link to an xpm package, ` +
            'check for the "xpack" property in package.json'
        )
      }

      const destManifestIds = new ManifestIds(
        destinationJsonPackage,
        this.policies
      )

      let localXpacksFolderPath

      if (configurationName) {
        const xpmLiquidPackage = new XpmLiquidPackage({
          log,
          packageJson: this.jsonPackage
        })

        xpmLiquidPackage.buildConfigurations.initialise()
        if (!xpmLiquidPackage.buildConfigurations.has(configurationName)) {
          throw new CliErrorInput(
            `missing "xpack.buildConfigurations.${configurationName}" ` +
              'property in package.json'
          )
        }
        const buildConfiguration =
          xpmLiquidPackage.buildConfigurations.get(configurationName)

        const buildFolderRelativePath =
          buildConfiguration.getBuildFolderRelativePath()

        localXpacksFolderPath = path.join(
          config.cwd,
          buildFolderRelativePath,
          context.globalConfig.localXpacksFolderName
        )
      } else {
        // Top-level package link.
        localXpacksFolderPath = path.join(
          config.cwd,
          context.globalConfig.localXpacksFolderName
        )
      }

      log.trace(`localXpacksFolderPath: ${localXpacksFolderPath}`)

      const localXpacksLinkName = destManifestIds.getFolderName()
      const localXpacksLinkPath = path.join(
        localXpacksFolderPath,
        localXpacksLinkName
      )

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
              'preserved, it might contain important code'
          )
        }

        try {
          log.trace(`del('${localXpacksLinkPath}')`)
          await deleteAsync(localXpacksLinkPath, { force: true })
        } catch (err) {
          log.trace(util.inspect(err))
          throw new CliError(`cannot remove '${localXpacksLinkPath}'`)
        }
      }

      // Create parent folder, for just in case.
      await makeDirectory(path.dirname(localXpacksLinkPath))

      // fs.symlink(target, path[, type], callback)
      // 'creates the link called path pointing to target'
      log.trace(
        'symlink' + `('${globalPackageLinkPath}', '${localXpacksLinkPath})'`
      )

      if (os.platform() === 'win32') {
        await fsPromises.symlink(
          globalPackageLinkPath,
          localXpacksLinkPath,
          'junction'
        )
      } else {
        await fsPromises.symlink(globalPackageLinkPath, localXpacksLinkPath)
      }

      const destRealPath = await fsPromises.realpath(globalPackageLinkPath)
      if (log.isVerbose) {
        log.info(
          `Local reference to '${destManifestIds.getScopedName()}' ` +
            `redirected to the development folder '${destRealPath}'`
        )
      } else {
        log.info(
          `${destManifestIds.getScopedName()} ` + `-> '${destRealPath}'`
        )
      }
    }
  }

  // --------------------------------------------------------------------------
}

// ----------------------------------------------------------------------------
