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

/* eslint valid-jsdoc: "error" */
/* eslint max-len: [ "error", 80, { "ignoreUrls": true } ] */

// ----------------------------------------------------------------------------

/**
 * The `xpm install <options> ...` command implementation.
 */

// ----------------------------------------------------------------------------

// https://nodejs.org/docs/latest/api/
import assert from 'assert'
import fs from 'fs'
// import util from 'util'
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

// https://www.npmjs.com/package/@xpack/xpm-lib
import * as xpmLib from '@xpack/xpm-lib'

// ----------------------------------------------------------------------------

import { GlobalConfig } from '../classes/global-config.js'

// ----------------------------------------------------------------------------

const { CliCommand, CliExitCodes, CliErrorSyntax, CliError, CliErrorInput } =
  cliStartOptionsCsj
const fsPromises = fs.promises

// ============================================================================

/**
 * @typedef {Object} Uninstall
 * @property {GlobalConfig} globalConfig Global configuration properties.
 * @property {Xpack} xpack The object with xPack utilities.
 * @property {Object} jsonPackage The object parsed by xpack; may be null.
 */
export class Uninstall extends CliCommand {
  // --------------------------------------------------------------------------

  /**
   * @summary Constructor, to set help definitions.
   *
   * @param {Object} context Reference to a context.
   */
  constructor(context) {
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
            isOptional: true,
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
            isOptional: true,
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
            isOptional: true,
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
            isOptional: true,
          },
        ],
      },
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
  async doRun(args) {
    const log = this.log
    const context = this.context
    const config = context.config

    log.trace(`${this.constructor.name}.doRun()`)

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
    const xpmPackage = new xpmLib.Package({
      log,
      packageFolderPath: config.cwd,
    })
    this.xpmPackage = xpmPackage

    this.jsonPackage = await xpmPackage.readPackageDotJson()

    try {
      const minVersion = await xpmPackage.checkMinimumXpmRequired({
        xpmRootFolderPath: context.rootPath,
      })
      this.policies = new xpmLib.Policies({ log, minVersion })
    } catch (error) {
      throw convertXpmError(error)
    }

    for (const arg of args) {
      if (config.isSystem) {
        await this.uninstallPackageSystem(arg)
      } else if (config.isGlobal) {
        await this.uninstallOnePackageGlobally(arg)
      } else {
        await this.uninstallOnePackageLocally(arg)
      }
    }

    if (this.jsonPackage && config.mustRewritePackageJson) {
      await xpmPackage.rewritePackageDotJson(this.jsonPackage)
    }

    if (log.isVerbose) {
      this.outputDoneDuration()
    }

    return CliExitCodes.SUCCESS
  }

  // --------------------------------------------------------------------------

  /**
   * @summary Uninstall a single package from the local folder.
   *
   * @param {String} npmPackageSpecifier Packages specifier,
   * as [@scope/]name[@version].
   * @returns {undefined|Promise} Nothing.
   *
   * @description
   * Remove the package link from the local
   * folder, which must be an xpm package. The version is ignored.
   */
  async uninstallOnePackageLocally(npmPackageSpecifier) {
    const log = this.log
    log.trace(
      `${this.constructor.name}.` +
        `uninstallOnePackageLocally('${npmPackageSpecifier}')`
    )

    const context = this.context
    const config = context.config
    const configurationName = config.configurationName

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

    const { scope, name } = xpmPackage.parsePackageSpecifier({
      npmPackageSpecifier,
    })

    if (!name) {
      throw new CliErrorInput(
        `'${npmPackageSpecifier}' has no valid package name`
      )
    }

    const dependencyLocation = this.policies.nonHierarchicalLocalXpacksFolder
      ? (scope ? scope.slice(1) + '-' : '') + name
      : scope
        ? scope + '/' + name
        : name

    let dependencyShownLocation =
      context.globalConfig.localXpacksFolderName + '/' + dependencyLocation

    const dotBin = context.globalConfig.dotBin

    let xPackFolderPath
    let xPacksBasePath = config.cwd

    if (configurationName) {
      const xpmDataModel = new xpmLib.DataModel({
        log,
        jsonPackage: this.jsonPackage,
      })
      this.xpmDataModel = xpmDataModel

      const buildConfigurations = xpmDataModel.buildConfigurations
      await buildConfigurations.initialise()

      if (!buildConfigurations.has(configurationName)) {
        throw new CliErrorInput(
          `missing "xpack.buildConfigurations.${configurationName}" ` +
            'property in package.json'
        )
      }
      const buildConfiguration = buildConfigurations.get(configurationName)
      this.buildConfiguration = buildConfiguration
      await buildConfiguration.initialise()

      const buildFolderRelativePath = buildConfiguration.buildFolderRelativePath

      xPacksBasePath = path.join(config.cwd, buildFolderRelativePath)

      if (this.policies.nonHierarchicalLocalXpacksFolder) {
        xPackFolderPath = path.join(
          config.cwd,
          buildFolderRelativePath,
          context.globalConfig.localXpacksFolderName,
          dependencyLocation
        )
      } else {
        xPackFolderPath = path.join(
          config.cwd,
          buildFolderRelativePath,
          context.globalConfig.localXpacksFolderName,
          scope,
          name
        )
      }
      dependencyShownLocation =
        buildFolderRelativePath +
        '/' +
        context.globalConfig.localXpacksFolderName +
        '/' +
        dependencyLocation
    } else {
      if (this.policies.nonHierarchicalLocalXpacksFolder) {
        xPackFolderPath = path.join(
          config.cwd,
          context.globalConfig.localXpacksFolderName,
          dependencyLocation
        )
      } else {
        xPackFolderPath = path.join(
          config.cwd,
          context.globalConfig.localXpacksFolderName,
          scope,
          name
        )
      }
      dependencyShownLocation =
        context.globalConfig.localXpacksFolderName + '/' + dependencyLocation
    }

    log.trace(`dependencyShownLocation: ${dependencyShownLocation}`)
    log.trace(`xPackFolderPath: ${xPackFolderPath}`)

    let stat
    try {
      stat = await fsPromises.lstat(xPackFolderPath)
    } catch (error) {
      log.warn(`${npmPackageSpecifier} not a dependency, ignored`)
      stat = undefined
    }

    if (stat) {
      if (stat.isDirectory()) {
        if (!config.isDryRun) {
          // Remove the corresponding bin links.
          await this.removeDotBinLinks({
            xPacksBasePath,
            dotBinRelativePath: path.join(
              context.globalConfig.localXpacksFolderName,
              dotBin
            ),
            packagePath: xPackFolderPath,
          })

          // Remove the folder, it should not throw, it was verified.
          log.trace(`deleteAsync(${xPackFolderPath})`)
          await deleteAsync(xPackFolderPath, { force: true })

          if (log.isVerbose) {
            log.verbose(`Folder '${dependencyShownLocation}' removed`)
          } else {
            log.info(`'${dependencyShownLocation}' removed`)
          }
          const key = (scope ? `${scope}/` : '') + `${name}`
          this.updateDependencies(key)
        } else {
          log.info(`Folder '${dependencyShownLocation}'` + ' should be removed')
        }
      } else if (stat.isSymbolicLink()) {
        if (!config.isDryRun) {
          // Remove the corresponding bin links.
          await this.removeDotBinLinks({
            xPacksBasePath,
            dotBinRelativePath: path.join(
              context.globalConfig.localXpacksFolderName,
              dotBin
            ),
            packagePath: xPackFolderPath,
          })

          // Remove the link, it should not throw, it was verified.
          await fsPromises.unlink(xPackFolderPath)

          if (log.isVerbose) {
            log.verbose(`Symlink '${dependencyShownLocation}' removed`)
          } else {
            log.info(`'${dependencyShownLocation}' removed`)
          }
          const key = (scope ? `${scope}/` : '') + `${name}`
          this.updateDependencies(key)
        } else {
          log.info(
            `Symlink '${dependencyShownLocation}'` + ' should be removed'
          )
        }
      } else {
        throw new CliError(
          `dependency '${dependencyShownLocation}' not a folder or a symlink`
        )
      }

      return
    }

    if (this.policies.shareNpmDependencies) {
      const nodeFolderName = path.join()
      const nodeFolderPath = path.join(
        config.cwd,
        context.globalConfig.localNpmFolderName,
        scope,
        name
      )

      try {
        stat = await fsPromises.lstat(nodeFolderPath)
      } catch (error) {
        if (config.isIgnoreErrors) {
          log.warn(`local package '${npmPackageSpecifier}' not installed`)
          return
        }
        throw new CliError(
          `local package '${npmPackageSpecifier}' not installed`
        )
      }

      if (!stat.isSymbolicLink()) {
        throw new CliError(`symlink '${nodeFolderName}' not present`)
      }

      if (!config.isDryRun) {
        // Remove the corresponding bin links.
        await this.removeDotBinLinks({
          xPacksBasePath,
          dotBinRelativePath: path.join(
            context.globalConfig.localNpmFolderName,
            dotBin
          ),
          packagePath: nodeFolderPath,
        })

        // Remove the link, it should not throw, it was verified.
        await fsPromises.unlink(nodeFolderPath)

        if (log.isVerbose) {
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
   * @param {String} npmPackageSpecifier Packages specifier,
   * as [@scope/]name[@version].
   * @returns {undefined|Promise} Nothing.
   *
   * @description
   * Remove the package from the global location. If the version is not
   * given, all versions are removed.
   */
  async uninstallOnePackageGlobally(npmPackageSpecifier) {
    const log = this.log
    log.trace(
      `${this.constructor.name}.uninstallOnePackageGlobally` +
        `('${npmPackageSpecifier}')`
    )

    const context = this.context
    const config = context.config
    // const configurationName = config.configurationName

    const { scope, name, version } = this.xpmPackage.parsePackageSpecifier({
      npmPackageSpecifier,
    })

    if (!name) {
      throw new CliErrorInput(
        `'${npmPackageSpecifier}' must include a package name`
      )
    }

    const folderName =
      (scope ? `${scope}/` : '') + name + (version ? `/${version}` : '')
    const globalPackagePath = path.join(
      context.globalConfig.globalFolderPath,
      folderName
    )

    let stat
    try {
      stat = await fsPromises.stat(globalPackagePath)
    } catch (error) {
      if (config.isIgnoreErrors) {
        log.warn(`global package '${npmPackageSpecifier}' not installed`)
        return
      } else {
        throw new CliError(
          `global package '${npmPackageSpecifier}' not installed`
        )
      }
    }

    if (stat.isDirectory()) {
      if (!config.isDryRun) {
        log.verbose('Changing permissions to read-write...')
        await xpmLib.chmodRecursively({
          inputPath: globalPackagePath,
          readOnly: false,
          log,
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

  async uninstallPackageSystem(packSpec) {
    const log = this.log
    log.trace(
      `${this.constructor.name}.uninstallOnePackageSystem('${packSpec}')`
    )

    throw new CliError('system uninstall not yet implemented')
  }

  // --------------------------------------------------------------------------

  updateDependencies(key) {
    const log = this.log

    const context = this.context
    const config = context.config
    const configurationName = config.configurationName

    const jsonPackage = this.jsonPackage

    if (!config.doNotSave) {
      let jsonTarget
      if (configurationName) {
        assert(this.buildConfiguration)
        jsonTarget = this.buildConfiguration.jsonBuildConfiguration
      } else {
        if (this.policies.shareNpmDependencies) {
          jsonTarget = jsonPackage
        } else {
          // Starting with 0.14.x, dependencies are below xpack.
          jsonTarget = jsonPackage.xpack
        }
      }

      if (jsonTarget.dependencies && jsonTarget.dependencies[key]) {
        if (!config.isDryRun) {
          delete jsonTarget.dependencies[key]
          log.verbose(`package.json "dependencies['${key}']" removed`)
          config.mustRewritePackageJson = true
        } else {
          log.verbose(
            `Pretending to remove "dependencies['${key}']" ` +
              'from package.json'
          )
        }
      }
      if (jsonTarget.devDependencies && jsonTarget.devDependencies[key]) {
        if (!config.isDryRun) {
          delete jsonTarget.devDependencies[key]
          log.verbose(`package.json "devDependencies['${key}']" removed`)
          config.mustRewritePackageJson = true
        } else {
          log.verbose(
            `Pretending to remove "devDependencies['${key}']" ` +
              'from package.json'
          )
        }
      }
    }
  }

  /**
   * @summary Remove links to executables.
   * @returns {undefined} Nothing.
   *
   * @description
   * Iterate the entries in the package `executables` object and remove all
   * corresponding links from the `.bin` folder.
   */
  async removeDotBinLinks({ xPacksBasePath, dotBinRelativePath, packagePath }) {
    const log = this.log

    const xpmPackage = new xpmLib.Package({
      log,
      packageFolderPath: packagePath,
    })
    const jsonPackage = await xpmPackage.readPackageDotJson()
    if (!jsonPackage) {
      return // Not a package (unlikely, but for just in case)
    }

    let packageExecutablesPath
    if (xpmPackage.isBinaryXpmPackage()) {
      // Since Nov. 2024, executables is preferred.
      packageExecutablesPath =
        jsonPackage.xpack.executables ?? jsonPackage.xpack.bin
    } else if (xpmPackage.isBinaryNodeModule()) {
      packageExecutablesPath = jsonPackage.bin
    } else {
      return // Has no executables/bins.
    }

    const executablesAbsolutePath = path.join(
      xPacksBasePath,
      dotBinRelativePath
    )
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
            if (log.isVerbose) {
              log.verbose(
                `Shim '${path.join(dotBinRelativePath, key)}.cmd' removed`
              )
            } else {
              log.info(
                `'${path.join(dotBinRelativePath, key)}.cmd'` + ' removed'
              )
            }
          } else {
            // Not a file, preserve.
          }
        } catch (error) {
          // Not present anyway, nothing to do.
        }
        try {
          const stat = await fsPromises.stat(linkPath)
          if (stat.isFile()) {
            // Remove the file.
            await fsPromises.unlink(linkPath)
            if (log.isVerbose) {
              log.verbose(
                'Script ' + `'${path.join(dotBinRelativePath, key)}' removed`
              )
            } else {
              log.info(`'${path.join(dotBinRelativePath, key)}' removed`)
            }
          } else {
            // Not a file, preserve.
          }
        } catch (error) {
          // Not present anyway, nothing to do.
        }
      } else {
        // macOS and GNU/Linux platforms.
        try {
          const stat = await fsPromises.lstat(linkPath)
          if (stat.isSymbolicLink()) {
            // Remove the link.
            await fsPromises.unlink(linkPath)
            if (log.isVerbose) {
              log.verbose(
                `Symlink '${path.join(dotBinRelativePath, key)}' removed`
              )
            } else {
              log.info(`'${path.join(dotBinRelativePath, key)}' removed`)
            }
          } else {
            // Not a link, preserve.
          }
        } catch (error) {
          // Not present anyway, nothing to do.
        }
      }
    }
  }

  // --------------------------------------------------------------------------
}

// ----------------------------------------------------------------------------
