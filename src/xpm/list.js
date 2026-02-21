/*
 * This file is part of the xPack project (http://xpack.github.io).
 * Copyright (c) 2019-2026 Liviu Ionescu. All rights reserved.
 *
 * Permission to use, copy, modify, and/or distribute this software
 * for any purpose is hereby granted, under the terms of the MIT license.
 *
 * If a copy of the license was not distributed with this file, it can
 * be obtained from https://opensource.org/license/mit.
 */

'use strict'

// ----------------------------------------------------------------------------

/**
 * The `xpm install <options> ...` command implementation.
 */

// ----------------------------------------------------------------------------

// https://nodejs.org/docs/latest/api/
import fs from 'fs'
// import util from 'util'
import path from 'path'

// ----------------------------------------------------------------------------

// https://www.npmjs.com/package/make-dir
import { makeDirectory } from 'make-dir'

// https://www.npmjs.com/package/semver
import semver from 'semver'

// ----------------------------------------------------------------------------

// ES6: `import { CliCommand, CliExitCodes, CliError } from 'cli-start-options'
// import { CliCommand, CliExitCodes, CliError, CliErrorInput }
// from '@ilg/cli-start-options'
import cliStartOptionsCsj from '@ilg/cli-start-options'

// https://www.npmjs.com/package/@xpack/xpm-lib
import * as xpmLib from '@xpack/xpm-lib'

// ----------------------------------------------------------------------------

import { GlobalConfig } from '../classes/global-config.js'

// ----------------------------------------------------------------------------

const { CliCommand, CliExitCodes, CliError, CliErrorInput } = cliStartOptionsCsj
const fsPromises = fs.promises

// ============================================================================

/**
 * @typedef {Object} List
 * @property {GlobalConfig} globalConfig Global configuration properties.
 * @property {Xpack} xpack The object with xPack utilities.
 * @property {Object} jsonPackage The object parsed by xpack; may be null.
 */
export class List extends CliCommand {
  // --------------------------------------------------------------------------

  /**
   * @summary Constructor, to set help definitions.
   *
   * @param {Object} context Reference to a context.
   */
  constructor(context) {
    super(context)

    // Title displayed with the help message.
    this.title = 'xPack project manager - list packages'
    this.optionGroups = [
      {
        title: 'List options',
        optionDefs: [
          {
            options: ['-g', '--global'],
            init: ({ config }) => {
              config.isGlobal = false
            },
            action: ({ config }) => {
              config.isGlobal = true
            },
            msg: 'List the global package(s)',
            isOptional: true,
          },
          // {
          //   options: ['-sy', '--system'],
          //   init: ({ config }) => {
          //     config.isSystem = false
          //   },
          //   action: ({ config }) => {
          //     config.isSystem = true
          //   },
          //   msg: 'List the system package(s) (not impl)',
          //   isOptional: true
          // },
          {
            options: ['-c', '--config'],
            init: ({ config }) => {
              config.configurationName = undefined
            },
            action: ({ config }, val) => {
              config.configurationName = val.trim()
            },
            msg: 'Show the configuration specific dependencies',
            param: 'config_name',
            isOptional: true,
          },
        ],
      },
    ]
  }

  /**
   * @summary Execute the `list` command.
   *
   * @param {string[]} args Command line arguments.
   * @returns {Number|Promise} The process exit code.
   *
   * @override
   * @description
   * TODO
   */
  async doRun(args) {
    const log = this.log
    const context = this.context
    const config = context.config

    log.trace(`${this.constructor.name}.doRun()`)

    log.verbose(this.title)
    // log.verbose()

    // Extra options are not caught by CLI and must be checked/filtered here.
    args.forEach((element) => {
      log.warn(`'${element}' ignored`)
    })

    context.globalConfig = new GlobalConfig()

    await context.globalConfig.checkDeprecatedFolders(log)

    // The current folder may not be an xpm package or even a package at all.
    const xpmPackage = new xpmLib.Package({
      log,
      packageFolderPath: config.cwd,
    })
    this.xpmPackage = xpmPackage

    this.jsonPackage = await xpmPackage.readPackageDotJson()
    const minVersion = xpmPackage.getMinimumXpmRequired()
    this.policies = new xpmLib.Policies({ log, minVersion })

    if (config.isSystem) {
      await this.listPackagesSystem()
    } else if (config.isGlobal) {
      await this.listPackagesGlobally()
    } else {
      await this.listPackagesLocally()
    }

    if (log.isVerbose) {
      this.outputDoneDuration()
    }

    return CliExitCodes.SUCCESS
  }

  // --------------------------------------------------------------------------

  /**
   * @summary List the packages from the local folder.
   *
   * @returns {undefined|Promise} Nothing.
   *
   * @description
   * List the packages link from the local
   * folder, which must be an xpm package.
   */
  async listPackagesLocally() {
    const log = this.log
    log.trace(`${this.constructor.name}.listPackagesLocally()`)

    const context = this.context
    const config = context.config
    const buildConfigurationName = config.configurationName
    const xpmPackage = this.xpmPackage

    if (!xpmPackage.isNpmPackage()) {
      throw new CliErrorInput(
        'current folder is not a valid package, check for package.json'
      )
    }

    if (!xpmPackage.isXpmPackage()) {
      throw new CliErrorInput(
        'current folder is not an xpm package, ' +
          'check for the "xpack" property in package.json'
      )
    }

    const xpmDataModel = new xpmLib.DataModel({
      log,
      jsonPackage: this.jsonPackage,
    })
    this.xpmDataModel = xpmDataModel

    const buildConfigurations = xpmDataModel.buildConfigurations
    await buildConfigurations.initialise()

    if (buildConfigurationName) {
      if (!buildConfigurations.has(buildConfigurationName)) {
        throw new CliErrorInput(
          'missing "xpack.buildConfigurations" property in package.json'
        )
      }

      // Show the dependencies of a single configuration.
      await this.listPackagesFromOneFolder(buildConfigurationName)
    } else {
      // Show the package dependencies.
      await this.listPackagesFromOneFolder()

      const buildConfigurationsNames = buildConfigurations.names
      for (const buildConfigurationName of buildConfigurationsNames) {
        const buildConfiguration = buildConfigurations.get(
          buildConfigurationName
        )
        await buildConfiguration.initialise()

        if (
          (Object.keys(buildConfiguration.dependencies).length > 0 ||
            Object.keys(buildConfiguration.devDependencies).length > 0 ||
            log.isVerbose) &&
          !buildConfiguration.isHidden
        ) {
          log.info()

          if (log.isVerbose) {
            log.verbose(`* Configuration '${buildConfigurationName}':`)
          } else {
            log.info(`${buildConfigurationName}:`)
          }
          await this.listPackagesFromOneFolder(buildConfigurationName)
        }
      }
    }
  }

  async listPackagesFromOneFolder(buildConfigurationName) {
    const log = this.log
    log.trace(
      `${this.constructor.name}.` +
        `listPackagesFromOneFolder(${buildConfigurationName ?? ''})`
    )

    const context = this.context
    const config = context.config
    const xpmDataModel = this.xpmDataModel

    // const configurationPrefix = (configurationName + '/') || ''

    let xpacksFolderPath

    if (buildConfigurationName) {
      const buildConfiguration = xpmDataModel.buildConfigurations.get(
        buildConfigurationName
      )
      await buildConfiguration.initialise()

      const buildFolderRelativePath = buildConfiguration.buildFolderRelativePath

      xpacksFolderPath = path.join(
        config.cwd,
        buildFolderRelativePath,
        context.globalConfig.localXpacksFolderName
      )
    } else {
      xpacksFolderPath = path.join(
        config.cwd,
        context.globalConfig.localXpacksFolderName
      )
    }

    await this.listOneFolderRecursively({
      folderPath: xpacksFolderPath,
      message: 'xpm packages',
      localFolderName: context.globalConfig.localXpacksFolderName,
      depth: 1,
      maxDepth: 2,
    })

    if (this.policies.shareNpmDependencies) {
      if (buildConfigurationName) {
        return
      }

      const nodeFolderPath = path.join(
        config.cwd,
        context.globalConfig.localNpmFolderName
      )

      await this.listOneFolderRecursively({
        folderPath: nodeFolderPath,
        message: 'Node.js modules',
        localFolderName: context.globalConfig.localNpmFolderName,
        depth: 1,
        maxDepth: 2,
      })
    }
  }

  async listOneFolderRecursively({
    folderPath,
    message, // 'Node.js modules', 'xPacks'
    localFolderName, // context.globalConfig.localNpmFolderName
    depth, // Start with 1
    maxDepth, // 1 or 2
  }) {
    const log = this.log
    log.trace(`${this.constructor.name}.listOneFolderRecursive()`)
    const context = this.context
    // const config = context.config

    let stat
    try {
      stat = await fsPromises.lstat(folderPath)
    } catch {
      stat = undefined
    }

    const dotBin = context.globalConfig.dotBin

    if (stat && stat.isDirectory()) {
      const dirents = await fsPromises.readdir(folderPath, {
        withFileTypes: true,
      })
      if (depth === 1) {
        for (const dirent of dirents) {
          log.trace(dirent.name)
          if (dirent.name.startsWith('.')) {
            continue
          }
          // Separator line only if there are non dot folders.
          log.output()
          break
        }
        log.verbose(`Installed ${message}:`)
      }
      let hasBin = false
      for (const dirent of dirents) {
        log.trace(dirent.name)

        const subFolderPath = path.join(folderPath, dirent.name)
        try {
          const direntStat = await fsPromises.stat(subFolderPath)
          if (!direntStat.isDirectory()) {
            log.trace(`${dirent.name} not a folder`)
            continue
          }
        } catch {
          // Nothing to do.
        }

        if (dirent.name === dotBin) {
          hasBin = true
        }
        if (dirent.name.startsWith('.')) {
          log.trace(`${dirent.name} starts with dot`)
          continue
        }
        log.trace(`checking folder '${subFolderPath}'`)
        const subFolderXpmPackage = new xpmLib.Package({
          log,
          packageFolderPath: subFolderPath,
        })

        const jsonSubFolder = await subFolderXpmPackage.readPackageDotJson()
        if (subFolderXpmPackage.isNpmPackage(jsonSubFolder)) {
          log.output(`- ${jsonSubFolder.name}@${jsonSubFolder.version}`)
          log.output(`  ${jsonSubFolder.description || ''}`)
        } else {
          // node_module folders may use depth 2.
          if (depth < maxDepth) {
            await this.listOneFolderRecursively({
              folderPath: subFolderPath,
              depth: depth + 1,
              maxDepth,
            })
          }
        }
      }
      if (depth === 1) {
        if (hasBin) {
          log.output()
          log.verbose(`${message} binaries:`)

          const binaryDirents = await fsPromises.readdir(
            path.join(folderPath, dotBin),
            { withFileTypes: true }
          )

          for (const binaryDirent of binaryDirents) {
            const tmp = `${localFolderName}/` + `${dotBin}/${binaryDirent.name}`
            log.output(`> ${tmp}`)
          }
        }
      }
    } else {
      if (depth === 1) {
        log.verbose()
        log.verbose(`No ${message} installed`)
      }
    }
  }

  /**
   * @summary List a single package from the central store.
   *
   * @param {String} packSpec Packages specifier, as [@scope/]name[@version].
   * @returns {undefined|Promise} Nothing.
   *
   * @description
   * Remove the package from the global location. If the version is not
   * given, all versions are removed.
   */
  async listPackagesGlobally() {
    const log = this.log
    log.trace(`${this.constructor.name}.uninstallPackagesGlobally()`)

    const context = this.context
    // const config = context.config

    log.verbose(
      `Packages available in '${context.globalConfig.globalFolderPath}':`
    )

    const foundPackagesMap = new Map()

    // Create global store folder, for just in case.
    await makeDirectory(context.globalConfig.globalFolderPath)

    await this.findGlobalXpmPackagesRecursively({
      folderPath: context.globalConfig.globalFolderPath,
      foundPackagesMap,
    })

    const xpacksMapAscending = new Map([...foundPackagesMap.entries()].sort())
    for (const [name, xpackVersionsMap] of xpacksMapAscending) {
      const xpackVersionsMapAscending = new Map(
        [...xpackVersionsMap.entries()].sort((a, b) => {
          return semver.compare(a[0], b[0])
        })
      )
      let description = ''
      for (const [, content] of xpackVersionsMapAscending) {
        if (content.description) {
          description = content.description
        }
      }

      log.output(`- ${name}`)
      log.output(`  ${description}`)
      for (const [version] of xpackVersionsMapAscending) {
        log.output(`  - ${version}`)
      }
    }
  }

  async findGlobalXpmPackagesRecursively({ folderPath, foundPackagesMap }) {
    const log = this.log

    // The first concern is to terminate the recursion when
    // identifying folders that look like a package.

    const xpmPackage = new xpmLib.Package({
      log,
      packageFolderPath: folderPath,
    })
    const jsonPackage = await xpmPackage.readPackageDotJson()

    if (jsonPackage) {
      let foundVersionsMap = foundPackagesMap.get(jsonPackage.name)
      if (!foundVersionsMap) {
        foundVersionsMap = new Map()
        foundPackagesMap.set(jsonPackage.name, foundVersionsMap)
      }
      log.trace(`${jsonPackage.name}@${jsonPackage.version}`)

      const content = {}
      content.description = jsonPackage.description || ''
      content.filePath = folderPath

      foundVersionsMap.set(jsonPackage.version, content)

      return
    }

    // Recurse on children folders.
    const dirents = await fsPromises.readdir(folderPath, {
      withFileTypes: true,
    })
    for (const dirent of dirents) {
      if (dirent.isDirectory()) {
        await this.findGlobalXpmPackagesRecursively({
          folderPath: path.join(folderPath, dirent.name),
          foundPackagesMap,
        })
      }
    }
  }

  async listPackagesSystem() {
    const log = this.log
    log.trace(`${this.constructor.name}.uninstallPackagesSystem()`)

    throw new CliError('system list not yet implemented')
  }

  // --------------------------------------------------------------------------
}

// ----------------------------------------------------------------------------
