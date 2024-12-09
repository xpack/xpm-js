/*
 * This file is part of the xPack project (http://xpack.github.io).
 * Copyright (c) 2019 Liviu Ionescu. All rights reserved.
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
 * The `xpm install <options> ...` command implementation.
 */

// ----------------------------------------------------------------------------

// https://nodejs.org/docs/latest-v12.x/api/index.htm
import fs from 'fs'
import util from 'util'
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

// https://www.npmjs.com/package/@xpack/xpm-liquid
import { XpmLiquid } from '@xpack/xpm-liquid'

// ----------------------------------------------------------------------------

import { GlobalConfig } from '../utils/global-config.js'
import { Policies } from '../utils/policies.js'
import { Xpack } from '../utils/xpack.js'

// ----------------------------------------------------------------------------

const { CliCommand, CliExitCodes, CliError, CliErrorInput } = cliStartOptionsCsj
const fsPromises = fs.promises

// ============================================================================

/**
 * @typedef {Object} List
 * @property {GlobalConfig} globalConfig Global configuration properties.
 * @property {Xpack} xpack The object with xPack utilities.
 * @property {Object} packageJson The object parsed by xpack; may be null.
 */
export class List extends CliCommand {
  // --------------------------------------------------------------------------

  /**
   * @summary Constructor, to set help definitions.
   *
   * @param {Object} context Reference to a context.
  */
  constructor (context) {
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
            isOptional: true
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
            isOptional: true
          }
        ]
      }
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
  async doRun (args) {
    const log = this.log
    log.trace(`${this.constructor.name}.doRun()`)
    const context = this.context
    const config = context.config

    log.verbose(this.title)
    // log.verbose()

    // Extra options are not caught by CLI and must be checked/filtered here.
    args.forEach((element) => {
      log.warn(`'${element}' ignored`)
    })

    context.globalConfig = new GlobalConfig()

    await context.globalConfig.checkDeprecatedFolders(log)

    // The current folder may not be an xpm package or even a package at all.
    this.xpack = new Xpack(config.cwd, context)
    const xpack = this.xpack

    try {
      this.packageJson = await xpack.readPackageJson()
    } catch (err) {
      // This happens when not invoking in a package folder; not an error.
      this.packageJson = null
    }
    const packageJson = this.packageJson

    const minVersion = await xpack.checkMinimumXpmRequired(packageJson)
    this.policies = new Policies(minVersion, context)

    if (config.isSystem) {
      await this.listPackagesSystem()
    } else if (config.isGlobal) {
      await this.listPackagesGlobally()
    } else {
      await this.listPackagesLocally()
    }

    if (log.isVerbose()) {
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
  async listPackagesLocally () {
    const log = this.log
    log.trace(
      `${this.constructor.name}.listPackagesLocally()`)

    const context = this.context
    const config = context.config

    const xpack = this.xpack
    const packageJson = this.packageJson

    if (!xpack.isPackage()) {
      throw new CliErrorInput(
        'current folder not a valid package, check for package.json')
    }

    if (!xpack.isXpack()) {
      throw new CliErrorInput(
        'current folder not an xpm package, ' +
        'check for the "xpack" property in package.json')
    }

    if (config.configurationName) {
      // Throws if the configuration is not found.
      const configuration = xpack.retrieveConfiguration({
        packageJson,
        configurationName: config.configurationName
      })

      // Show the dependencies of a single configuration.
      await this.listPackagesFromOneFolder({
        configurationName: config.configurationName,
        configuration
      })
    } else {
      // Show the package dependencies.
      await this.listPackagesFromOneFolder()

      const enumerateConfigurations = async (from) => {
        for (const [configurationName, configuration] of
          Object.entries(from)) {
          if ((configuration.dependencies &&
            Object.keys(configuration.dependencies).length) ||
            (configuration.devDependencies &&
              Object.keys(configuration.devDependencies).length) ||
            log.isVerbose()) {
            log.info()
            if (log.isVerbose()) {
              log.verbose(`* Configuration '${configurationName}':`)
            } else {
              log.info(`${configurationName}:`)
            }
            await this.listPackagesFromOneFolder({
              configurationName,
              configuration
            })
          }
        }
      }

      // Show the dependencies of all configurations.
      if (packageJson.xpack.buildConfigurations) {
        await enumerateConfigurations(packageJson.xpack.buildConfigurations)
      }

      // TODO: Legacy, remove it at some point.
      if (packageJson.xpack.configurations) {
        await enumerateConfigurations(packageJson.xpack.configurations)
      }
    }
  }

  async listPackagesFromOneFolder ({
    configurationName,
    configuration
  } = {}) {
    const log = this.log
    log.trace(
      `${this.constructor.name}.listPackagesFromOneFolder()`)

    const context = this.context
    const config = context.config

    const xpack = this.xpack
    const packageJson = this.packageJson

    // const configurationPrefix = (configurationName + '/') || ''

    let xpacksFolderPath

    if (configuration && configurationName) {
      const liquidEngine = new XpmLiquid(log)
      let liquidMap
      try {
        liquidMap = liquidEngine.prepareMap(packageJson,
          configurationName)
      } catch (err) {
        log.trace(util.inspect(err))
        throw new CliError(err.message)
      }

      const buildFolderRelativePath =
        await xpack.computeBuildFolderRelativePath({
          liquidEngine,
          liquidMap,
          configuration,
          configurationName
        })

      xpacksFolderPath = path.join(config.cwd,
        buildFolderRelativePath,
        context.globalConfig.localXpacksFolderName)
    } else {
      xpacksFolderPath = path.join(config.cwd,
        context.globalConfig.localXpacksFolderName)
    }

    await this.listOneFolderRecursive({
      folderPath: xpacksFolderPath,
      message: 'xpm packages',
      localFolderName: context.globalConfig.localXpacksFolderName,
      depth: 1,
      maxDepth: 2
    })

    if (this.policies.shareNpmDependencies) {
      if (configuration && configurationName) {
        return
      }

      const nodeFolderPath = path.join(config.cwd,
        context.globalConfig.localNpmFolderName)

      await this.listOneFolderRecursive({
        folderPath: nodeFolderPath,
        message: 'Node.js modules',
        localFolderName: context.globalConfig.localNpmFolderName,
        depth: 1,
        maxDepth: 2
      })
    }
  }

  async listOneFolderRecursive ({
    folderPath,
    message, // 'Node.js modules', 'xPacks'
    localFolderName, // context.globalConfig.localNpmFolderName
    depth, // Start with 1
    maxDepth // 1 or 2
  }) {
    const log = this.log
    log.trace(`${this.constructor.name}.listOneFolderRecursive()`)
    const context = this.context
    // const config = context.config
    const xpack = this.xpack
    // const packageJson = this.packageJson

    let stat
    try {
      stat = await fsPromises.lstat(folderPath)
    } catch (err) {
      stat = undefined
    }

    const dotBin = context.globalConfig.dotBin

    if (stat && stat.isDirectory()) {
      const dirents = await fsPromises.readdir(folderPath,
        { withFileTypes: true })
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
        } catch (err) {
        }

        if (dirent.name === dotBin) {
          hasBin = true
        }
        if (dirent.name.startsWith('.')) {
          log.trace(`${dirent.name} starts with dot`)
          continue
        }
        log.trace(`checking folder '${subFolderPath}'`)
        const json = await xpack.isFolderPackage(subFolderPath)
        if (json) {
          log.output(`- ${json.name}@${json.version}`)
          log.output(`  ${json.description || ''}`)
        } else {
          // node_module folders may use depth 2.
          if (depth < maxDepth) {
            await this.listOneFolderRecursive({
              folderPath: subFolderPath,
              depth: depth + 1,
              maxDepth
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
            { withFileTypes: true })

          for (const binaryDirent of binaryDirents) {
            const tmp =
              `${localFolderName}/` +
              `${dotBin}/${binaryDirent.name}`
            log.output(`- ${tmp}`)
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
  async listPackagesGlobally () {
    const log = this.log
    log.trace(
      `${this.constructor.name}.uninstallPackagesGlobally()`)

    const context = this.context
    // const config = context.config

    log.verbose(
      `Packages available in '${context.globalConfig.globalFolderPath}':`)

    const xpacksMap = new Map()

    // Create global store folder, for just in case.
    await makeDirectory(context.globalConfig.globalFolderPath)

    await this.findGlobalXpacksRecursive({
      folderPath: context.globalConfig.globalFolderPath,
      xpacksMap
    })

    const xpacksMapAscending = new Map([...xpacksMap.entries()].sort())
    for (const [name, xpackVersionsMap] of xpacksMapAscending) {
      const xpackVersionsMapAscending =
        new Map([...xpackVersionsMap.entries()].sort((a, b) => {
          return semver.compare(a[0], b[0])
        }))
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

  async findGlobalXpacksRecursive ({
    folderPath,
    xpacksMap
  }) {
    const log = this.log

    const xpack = this.xpack

    // The first concern is to terminate the recursion when
    // identifying folders that look like a package.
    const json = await xpack.isFolderPackage(folderPath)
    if (json) {
      let xpackVersionsMap = xpacksMap.get(json.name)
      if (!xpackVersionsMap) {
        xpackVersionsMap = new Map()
        xpacksMap.set(json.name, xpackVersionsMap)
      }
      log.trace(`${json.name}@${json.version}`)

      const content = {}
      content.description = json.description || ''
      content.filePath = folderPath

      xpackVersionsMap.set(json.version, content)

      return
    }

    // Recurse on children folders.
    const dirents = await fsPromises.readdir(
      folderPath,
      { withFileTypes: true })
    for (const dirent of dirents) {
      if (dirent.isDirectory()) {
        await this.findGlobalXpacksRecursive({
          folderPath: path.join(folderPath, dirent.name),
          xpacksMap
        })
      }
    }
  }

  async listPackagesSystem () {
    const log = this.log
    log.trace(
      `${this.constructor.name}.uninstallPackagesSystem()`)

    throw new CliError('system list not yet implemented')
  }

  // --------------------------------------------------------------------------
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// The List class is added as a property of this object.
// module.exports.List = List

// In ES6, it would be:
// export class List { ... }
// ...
// import { List } from 'list.js'

// ----------------------------------------------------------------------------
