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
import os from 'os'
import path from 'path'

// ----------------------------------------------------------------------------

// https://www.npmjs.com/package/del
import { deleteAsync } from 'del'

// ----------------------------------------------------------------------------

// ES6: `import { CliCommand, CliExitCodes, CliError } from 'cli-start-options'
// import { CliCommand, CliExitCodes, CliErrorSyntax,
// CliError, CliErrorInput } from '@ilg/cli-start-options'
import cliStartOptionsCsj from '@ilg/cli-start-options'

// https://www.npmjs.com/package/@xpack/xpm-liquid
import { XpmLiquid } from '@xpack/xpm-liquid'

// ----------------------------------------------------------------------------

import { FsUtils } from '../utils/fs-utils.js'

import { GlobalConfig } from '../utils/global-config.js'
import { Policies } from '../utils/policies.js'
import { Xpack } from '../utils/xpack.js'

// ----------------------------------------------------------------------------

const {
  CliCommand, CliExitCodes, CliErrorSyntax, CliError, CliErrorInput
} = cliStartOptionsCsj
const fsPromises = fs.promises

// ============================================================================

/**
 * @typedef {Object} Uninstall
 * @property {GlobalConfig} globalConfig Global configuration properties.
 * @property {Xpack} xpack The object with xPack utilities.
 * @property {Object} packageJson The object parsed by xpack; may be null.
 */
export class Uninstall extends CliCommand {
  // --------------------------------------------------------------------------

  /**
   * @summary Constructor, to set help definitions.
   *
   * @param {Object} context Reference to a context.
  */
  constructor (context) {
    super(context)

    // Title displayed with the help message.
    this.title = 'xPack project manager - uninstall package(s)'
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
          // {
          //   options: ['-sy', '--system'],
          //   init: ({ config }) => {
          //     config.isSystem = false
          //   },
          //   action: ({ config }) => {
          //     config.isSystem = true
          //   },
          //   msg: 'Uninstall the system package(s) (not impl)',
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
          },
          {
            options: ['--ignore-errors'],
            init: ({ config }) => {
              config.isIgnoreErrors = false
            },
            action: ({ config }) => {
              config.isIgnoreErrors = true
            },
            msg: 'Ignore script errors',
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

    // Extra options are not caught by CLI and must be checked/filtered here.
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

    // The current folder may not be an xpm package or even a package at all.
    this.xpack = new Xpack(config.cwd, context)
    const xpack = this.xpack

    try {
      this.packageJson = await xpack.readPackageJson()
    } catch (err) {
      // This happens when not installing in a package folder; not an error.
      this.packageJson = null
    }
    const packageJson = this.packageJson

    if (config.isSystem) {
      // System uninstall.
      throw new CliError('system uninstall not yet implemented')
    }

    const minVersion = await xpack.checkMinimumXpmRequired(packageJson)
    this.policies = new Policies(minVersion, context)

    for (const arg of args) {
      if (config.isSystem) {
        await this.uninstallPackageSystem(arg)
      } else if (config.isGlobal) {
        await this.uninstallOnePackageGlobally(arg)
      } else {
        await this.uninstallOnePackageLocally(arg)
      }
    }

    await this.rewritePackageJson()

    if (log.isVerbose()) {
      this.outputDoneDuration()
    }

    return CliExitCodes.SUCCESS
  }

  // --------------------------------------------------------------------------

  /**
   * @summary Uninstall a single package from the local folder.
   *
   * @param {String} packSpec Packages specifier, as [@scope/]name[@version].
   * @returns {undefined|Promise} Nothing.
   *
   * @description
   * Remove the package link from the local
   * folder, which must be an xpm package. The version is ignored.
   */
  async uninstallOnePackageLocally (packSpec) {
    const log = this.log
    log.trace(
      `${this.constructor.name}.uninstallOnePackageLocally('${packSpec}')`)

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

    const { scope, name } = xpack.parsePackageSpecifier({
      packSpec
    })

    if (!name) {
      throw new CliErrorInput(`'${packSpec}' has no valid package name`)
    }

    const dependencyLocation =
      this.policies.nonHierarchicalLocalXpacksFolder
        ? ((scope ? (scope.slice(1) + '-') : '') + name)
        : (scope ? scope + '/' + name : name)

    let dependencyShownLocation =
    context.globalConfig.localXpacksFolderName + '/' + dependencyLocation

    const dotBin = context.globalConfig.dotBin

    let xPackFolderPath
    let xPacksBasePath = config.cwd

    if (config.configurationName) {
      // Throws if the configuration is not found.
      const configuration = xpack.retrieveConfiguration({
        packageJson,
        configurationName: config.configurationName
      })

      const liquidEngine = new XpmLiquid(log)
      let liquidMap
      try {
        liquidMap = liquidEngine.prepareMap(packageJson,
          config.configurationName) // May be undefined!
      } catch (err) {
        log.trace(util.inspect(err))
        throw new CliError(err.message)
      }

      const buildFolderRelativePath =
        await xpack.computeBuildFolderRelativePath({
          liquidEngine,
          liquidMap,
          configuration,
          configurationName: config.configurationName
        })

      xPacksBasePath = path.join(
        config.cwd,
        buildFolderRelativePath
      )

      if (this.policies.nonHierarchicalLocalXpacksFolder) {
        xPackFolderPath = path.join(
          config.cwd,
          buildFolderRelativePath,
          context.globalConfig.localXpacksFolderName,
          dependencyLocation)
      } else {
        xPackFolderPath = path.join(
          config.cwd,
          buildFolderRelativePath,
          context.globalConfig.localXpacksFolderName,
          scope,
          name)
      }
      dependencyShownLocation =
        buildFolderRelativePath + '/' +
        context.globalConfig.localXpacksFolderName + '/' +
        dependencyLocation
    } else {
      if (this.policies.nonHierarchicalLocalXpacksFolder) {
        xPackFolderPath = path.join(config.cwd,
          context.globalConfig.localXpacksFolderName,
          dependencyLocation)
      } else {
        xPackFolderPath = path.join(config.cwd,
          context.globalConfig.localXpacksFolderName,
          scope,
          name)
      }
      dependencyShownLocation =
        context.globalConfig.localXpacksFolderName + '/' +
        dependencyLocation
    }

    log.trace(`dependencyShownLocation: ${dependencyShownLocation}`)
    log.trace(`xPackFolderPath: ${xPackFolderPath}`)

    let stat
    try {
      stat = await fsPromises.lstat(xPackFolderPath)
    } catch (err) {
      log.warn(`${packSpec} not a dependency, ignored`)
      stat = undefined
    }

    if (stat) {
      if (stat.isDirectory()) {
        if (!config.isDryRun) {
          // Remove the corresponding bin links.
          await this.removeDotBinLinks({
            xPacksBasePath,
            dotBinRelativePath: path.join(
              context.globalConfig.localXpacksFolderName, dotBin),
            packagePath: xPackFolderPath
          })

          // Remove the folder, it should not throw, it was verified.
          log.trace(`deleteAsync(${xPackFolderPath})`)
          await deleteAsync(xPackFolderPath, { force: true })

          if (log.isVerbose()) {
            log.verbose(`Folder '${dependencyShownLocation}' removed`)
          } else {
            log.info(`'${dependencyShownLocation}' removed`)
          }
          const key = (scope ? `${scope}/` : '') + `${name}`
          this.updateDependencies(key)
        } else {
          log.info(`Folder '${dependencyShownLocation}'` +
            ' should be removed')
        }
      } else if (stat.isSymbolicLink()) {
        if (!config.isDryRun) {
          // Remove the corresponding bin links.
          await this.removeDotBinLinks({
            xPacksBasePath,
            dotBinRelativePath: path.join(
              context.globalConfig.localXpacksFolderName, dotBin),
            packagePath: xPackFolderPath
          })

          // Remove the link, it should not throw, it was verified.
          await fsPromises.unlink(xPackFolderPath)

          if (log.isVerbose()) {
            log.verbose(`Symlink '${dependencyShownLocation}' removed`)
          } else {
            log.info(`'${dependencyShownLocation}' removed`)
          }
          const key = (scope ? `${scope}/` : '') + `${name}`
          this.updateDependencies(key)
        } else {
          log.info(`Symlink '${dependencyShownLocation}'` +
            ' should be removed')
        }
      } else {
        throw new CliError(
          `dependency '${dependencyShownLocation}' not a folder or a symlink`)
      }

      return
    }

    if (this.policies.shareNpmDependencies) {
      const nodeFolderName = path.join()
      const nodeFolderPath = path.join(
        config.cwd,
        context.globalConfig.localNpmFolderName,
        scope,
        name)

      try {
        stat = await fsPromises.lstat(nodeFolderPath)
      } catch (err) {
        if (config.isIgnoreErrors) {
          log.warn(`local package '${packSpec}' not installed`)
          return
        }
        throw new CliError(
        `local package '${packSpec}' not installed`)
      }

      if (!stat.isSymbolicLink()) {
        throw new CliError(
        `symlink '${nodeFolderName}' not present`)
      }

      if (!config.isDryRun) {
        // Remove the corresponding bin links.
        await this.removeDotBinLinks({
          xPacksBasePath,
          dotBinRelativePath: path.join(
            context.globalConfig.localNpmFolderName, dotBin),
          packagePath: nodeFolderPath
        })

        // Remove the link, it should not throw, it was verified.
        await fsPromises.unlink(nodeFolderPath)

        if (log.isVerbose()) {
          log.verbose(`Symlink '${nodeFolderName}' removed`)
        } else {
          log.info(`'${nodeFolderName}' removed`)
        }
        const key = (scope ? `${scope}/` : '') + `${name}`
        this.updateDependencies(key)
      } else {
        log.info(`Symlink '${nodeFolderName}' should be removed`)
      }
    }
  }

  /**
   * @summary Uninstall a single package from the central store.
   *
   * @param {String} packSpec Packages specifier, as [@scope/]name[@version].
   * @returns {undefined|Promise} Nothing.
   *
   * @description
   * Remove the package from the global location. If the version is not
   * given, all versions are removed.
   */
  async uninstallOnePackageGlobally (packSpec) {
    const log = this.log
    log.trace(
      `${this.constructor.name}.uninstallOnePackageGlobally('${packSpec}')`)

    const context = this.context
    const config = context.config

    const { scope, name, version } = this.xpack.parsePackageSpecifier({
      packSpec
    })

    if (!name) {
      throw new CliErrorInput(`'${packSpec}' must include a package name`)
    }

    const folderName = (scope ? `${scope}/` : '') + name +
      (version ? `/${version}` : '')
    const globalPackagePath =
      path.join(context.globalConfig.globalFolderPath, folderName)

    let stat
    try {
      stat = await fsPromises.stat(globalPackagePath)
    } catch (err) {
      if (config.isIgnoreErrors) {
        log.warn(`global package '${packSpec}' not installed`)
        return
      } else {
        throw new CliError(`global package '${packSpec}' not installed`)
      }
    }

    if (stat.isDirectory()) {
      if (!config.isDryRun) {
        log.verbose('Changing permissions to read-write...')
        await FsUtils.chmodRecursive({
          inputPath: globalPackagePath,
          readOnly: false,
          log
        })

        await deleteAsync(globalPackagePath, { force: true })
        log.info(`'${globalPackagePath}' removed`)
      } else {
        log.info(`Folder '${globalPackagePath}' should be removed`)
      }
    } else {
      throw new CliError(`'${globalPackagePath}' not a folder`)
    }
  }

  async uninstallPackageSystem (packSpec) {
    const log = this.log
    log.trace(
      `${this.constructor.name}.uninstallOnePackageSystem('${packSpec}')`)

    throw new CliError('system uninstall not yet implemented')
  }

  // --------------------------------------------------------------------------

  updateDependencies (key) {
    const log = this.log

    const context = this.context
    const config = context.config

    const packageJson = this.packageJson

    if (!config.doNotSave) {
      let target
      if (config.configurationName) {
        target = this.xpack.retrieveConfiguration({
          packageJson,
          configurationName: config.configurationName
        })
      } else {
        if (this.policies.shareNpmDependencies) {
          target = packageJson
        } else {
          // Starting with 0.14.x, dependencies are below xpack.
          target = packageJson.xpack
        }
      }

      if (target.dependencies && target.dependencies[key]) {
        if (!config.isDryRun) {
          delete target.dependencies[key]
          log.verbose(`package.json dependencies['${key}'] removed`)
          config.mustRewritePackageJson = true
        } else {
          log.verbose(`Pretending to remove dependencies['${key}'] ` +
            'from package.json')
        }
      }
      if (target.devDependencies && target.devDependencies[key]) {
        if (!config.isDryRun) {
          delete target.devDependencies[key]
          log.verbose(`package.json devDependencies['${key}'] removed`)
          config.mustRewritePackageJson = true
        } else {
          log.verbose(`Pretending to remove devDependencies['${key}'] ` +
            'from package.json')
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

  /**
   * @summary Remove links to executables.
   * @returns {undefined} Nothing.
   *
   * @description
   * Iterate the entries in the package `executables` object and remove all
   * corresponding links from the `.bin` folder.
   */
  async removeDotBinLinks ({
    xPacksBasePath,
    dotBinRelativePath,
    packagePath
  }) {
    const log = this.log

    const json = await this.xpack.isFolderPackage(packagePath)
    if (!json) {
      return // Not a package (unlikely, but for just in case)
    }

    let packageExecutablesPath
    if (this.xpack.isBinaryXpack(json)) {
      // Since Nov. 2024, executables is preferred.
      packageExecutablesPath = json.xpack.executables ?? json.xpack.bin
    } else if (this.xpack.isBinaryNodeModule(json)) {
      packageExecutablesPath = json.bin
    } else {
      return // Has no executables/bins.
    }

    const executablesAbsolutePath =
      path.join(xPacksBasePath, dotBinRelativePath)
    for (const key of Object.keys(packageExecutablesPath)) {
      const linkPath = path.join(executablesAbsolutePath, key)

      if (os.platform() === 'win32') {
        // On Windows there are two files for each binary, a `.cmd` shim
        // for the Windows console and a script for mingw-style terminals.
        try {
          const stat = await fsPromises.stat(linkPath + '.cmd')
          if (stat.isFile()) {
            // Remove the file.
            await fsPromises.unlink(linkPath + '.cmd')
            if (log.isVerbose()) {
              log.verbose(
                `Shim '${path.join(dotBinRelativePath, key)}.cmd' removed`)
            } else {
              log.info(`'${path.join(dotBinRelativePath, key)}.cmd'` +
              ' removed')
            }
          } else {
            // Not a file, preserve.
          }
        } catch (err) {
          // Not present anyway, nothing to do.
        }
        try {
          const stat = await fsPromises.stat(linkPath)
          if (stat.isFile()) {
            // Remove the file.
            await fsPromises.unlink(linkPath)
            if (log.isVerbose()) {
              log.verbose('Script ' +
                `'${path.join(dotBinRelativePath, key)}' removed`)
            } else {
              log.info(`'${path.join(dotBinRelativePath, key)}' removed`)
            }
          } else {
            // Not a file, preserve.
          }
        } catch (err) {
          // Not present anyway, nothing to do.
        }
      } else {
        // macOS and GNU/Linux platforms.
        try {
          const stat = await fsPromises.lstat(linkPath)
          if (stat.isSymbolicLink()) {
            // Remove the link.
            await fsPromises.unlink(linkPath)
            if (log.isVerbose()) {
              log.verbose(
                `Symlink '${path.join(dotBinRelativePath, key)}' removed`)
            } else {
              log.info(`'${path.join(dotBinRelativePath, key)}' removed`)
            }
          } else {
            // Not a link, preserve.
          }
        } catch (err) {
          // Not present anyway, nothing to do.
        }
      }
    }
  }

  // --------------------------------------------------------------------------
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// The Uninstall class is added as a property of this object.
// module.exports.Uninstall = Uninstall

// In ES6, it would be:
// export class Uninstall { ... }
// ...
// import { Uninstall } from 'uninstall.js'

// ----------------------------------------------------------------------------
