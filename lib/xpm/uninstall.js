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

// https://nodejs.org/docs/latest-v10.x/api/
const fsPromises = require('fs').promises
const os = require('os')
const path = require('path')

// ----------------------------------------------------------------------------

// https://www.npmjs.com/package/del
const del = require('del')

// ----------------------------------------------------------------------------

const { FsUtils } = require('../utils/fs-utils.js')
const { GlobalConfig } = require('../utils/global-config.js')
const { Xpack } = require('../utils/xpack.js')

// ES6: `import { CliCommand, CliExitCodes, CliError } from 'cli-start-options'
const {
  CliCommand, CliExitCodes, CliErrorApplication, CliErrorSyntax, CliError
} = require('@ilg/cli-start-options')

// ============================================================================

/**
 * @typedef {Object} Uninstall
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

    if (config.isSystem) {
      // System uninstall.
      throw new CliErrorApplication('system uninstall not yet implemented')
    }

    let exitCode = CliExitCodes.SUCCESS

    for (const arg of args) {
      if (config.isGlobal) {
        exitCode = await this.uninstallPackageGlobally(arg)
      } else {
        exitCode = await this.uninstallPackageLocally(arg)
      }
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
   * @summary Uninstall a single package from the local folder.
   *
   * @param {String} packSpec Packages specifier, as [@scope/]name[@version].
   * @returns {Number|Promise} The process exit code.
   *
   * @description
   * Remove the package link from the local
   * folder, which must be an xPack. The version is ignored.
   */
  async uninstallPackageLocally (packSpec) {
    const log = this.log
    log.trace(
      `${this.constructor.name}.uninstallPackageLocally('${packSpec}')`)

    const context = this.context
    const config = context.config

    const exitCode = CliExitCodes.SUCCESS

    const { scope, name, version } = this.xpack.parsePackageSpecifier(
      { packSpec, log }
    )

    if (!name) {
      throw new CliError(
        `'${packSpec}' has no valid package name`,
        CliExitCodes.ERROR.INPUT)
    }

    if (!this.xpack.isPackage()) {
      throw new CliError(
        'not a valid package, check for package.json',
        CliExitCodes.ERROR.INPUT)
    }

    if (!this.xpack.isXpack()) {
      throw new CliError(
        'not an xPack, check for the "xpack" property in package.json',
        CliExitCodes.ERROR.INPUT)
    }

    const folderName = (scope ? (scope.slice(1) + '-') : '') + name
    const dotBin = context.globalConfig.dotBin

    const xpacksFolderName = path.join(
      context.globalConfig.localXpacksFolderName,
      folderName)
    const xPackFolderPath = path.join(config.cwd, xpacksFolderName)

    let stat
    try {
      stat = await fsPromises.lstat(xPackFolderPath)
    } catch (err) {
      stat = undefined
    }

    if (stat) {
      if (stat.isSymbolicLink()) {
        if (!config.isDryRun) {
          // Remove the corresponding bin links.
          await this.removeBins({
            binRelativePath: path.join(
              context.globalConfig.localXpacksFolderName, dotBin),
            packagePath: xPackFolderPath
          })

          // Remove the link, it should not throw, it was verified.
          await fsPromises.unlink(xPackFolderPath)

          if (log.isVerbose()) {
            log.verbose(`Symlink '${xpacksFolderName}' removed` +
              (version
                ? ` (version ${version} ignored)`
                : ''))
          } else {
            log.info(`'${xpacksFolderName}' removed` +
              (version
                ? ` (version ${version} ignored)`
                : ''))
          }
          const key = (scope ? `${scope}/` : '') + `${name}`
          this.updateDependencies(key)
        } else {
          log.info(`Symlink '${xpacksFolderName}' should be removed` +
            (version
              ? ` (version ${version} ignored)`
              : ''))
        }
      } else {
        throw new CliErrorApplication(
          `symlink '${xpacksFolderName}' not present`)
      }

      return exitCode
    }

    const nodeFolderName = path.join(
      context.globalConfig.localNpmFolderName,
      folderName)
    const nodeFolderPath = path.join(config.cwd, nodeFolderName)

    try {
      stat = await fsPromises.lstat(nodeFolderPath)
    } catch (err) {
      stat = undefined
    }

    if (stat) {
      if (stat.isSymbolicLink()) {
        if (!config.isDryRun) {
          // Remove the corresponding bin links.
          await this.removeBins({
            binRelativePath: path.join(
              context.globalConfig.localNpmFolderName, dotBin),
            packagePath: nodeFolderPath
          })

          // Remove the link, it should not throw, it was verified.
          await fsPromises.unlink(nodeFolderPath)

          if (log.isVerbose()) {
            log.verbose(`Symlink '${nodeFolderName}' removed` +
              (version
                ? ` (version ${version} ignored)`
                : ''))
          } else {
            log.info(`'${nodeFolderName}' removed` +
              (version
                ? ` (version ${version} ignored)`
                : ''))
          }
          const key = (scope ? `${scope}/` : '') + `${name}`
          this.updateDependencies(key)
        } else {
          log.info(`Symlink '${nodeFolderName}' should be removed` +
            (version
              ? ` (version ${version} ignored)`
              : ''))
        }
      } else {
        throw new CliErrorApplication(
          `symlink '${nodeFolderName}' not present`)
      }

      return exitCode
    }

    throw new CliErrorApplication(
      `local package '${packSpec}' not installed`)
  }

  /**
   * @summary Uninstall a single package from the global repository.
   *
   * @param {String} packSpec Packages specifier, as [@scope/]name[@version].
   * @returns {Number|Promise} The process exit code.
   *
   * @description
   * Remove the package from the global location. If the version is not
   * given, all versions are removed.
   */
  async uninstallPackageGlobally (packSpec) {
    const log = this.log
    log.trace(
      `${this.constructor.name}.uninstallPackageGlobally('${packSpec}')`)

    const context = this.context
    const config = context.config

    const exitCode = CliExitCodes.SUCCESS

    const { scope, name, version } = this.xpack.parsePackageSpecifier(
      { packSpec, log }
    )

    if (!name) {
      throw new CliErrorApplication(
        `'${packSpec}' must include a package name`)
    }

    const folderName = (scope ? `${scope}/` : '') + name +
      (version ? `/${version}` : '')
    const globalPackagePath =
      path.join(context.globalConfig.globalFolderPath, folderName)

    let stat
    try {
      stat = await fsPromises.stat(globalPackagePath)
    } catch (err) {
      throw new CliErrorApplication(
        `global package '${packSpec}' not installed`)
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

  /**
   * @summary Remove links to executables.
   * @returns {undefined} Nothing.
   *
   * @description
   * Iterate the entries in the package `bin` object and remove all
   * corresponding links from the `.bin` folder.
   */
  async removeBins ({ binRelativePath, packagePath }) {
    const log = this.log

    const context = this.context
    const config = context.config

    const json = await this.xpack.isFolderPackage(packagePath)
    if (!json) {
      return // Not a package (unlikely, but for just in case)
    }

    let packageBinPath
    if (this.xpack.isBinaryXpack(json)) {
      packageBinPath = json.xpack.bin
    } else if (this.xpack.isBinaryNodeModule(json)) {
      packageBinPath = json.bin
    } else {
      return // Has no bins
    }

    const binPath = path.join(config.cwd, binRelativePath)
    for (const key of Object.keys(packageBinPath)) {
      const linkPath = path.join(binPath, key)

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
                `Shim '${path.join(binRelativePath, key)}.cmd' removed`)
            } else {
              log.info(`'${path.join(binRelativePath, key)}.cmd' removed`)
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
              log.verbose(`Script '${path.join(binRelativePath, key)}' removed`)
            } else {
              log.info(`'${path.join(binRelativePath, key)}' removed`)
            }
          } else {
            // Not a file, preserve.
          }
        } catch (err) {
          // Not present anyway, nothing to do.
        }
      } else {
        // macOS and GNU/Linux pratforms.
        try {
          const stat = await fsPromises.lstat(linkPath)
          if (stat.isSymbolicLink()) {
            // Remove the link.
            await fsPromises.unlink(linkPath)
            if (log.isVerbose()) {
              log.verbose(
                `Symlink '${path.join(binRelativePath, key)}' removed`)
            } else {
              log.info(`'${path.join(binRelativePath, key)}' removed`)
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
module.exports.Uninstall = Uninstall

// In ES6, it would be:
// export class Uninstall { ... }
// ...
// import { Uninstall } from 'uninstall.js'

// ----------------------------------------------------------------------------
