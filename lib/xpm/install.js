/*
 * This file is part of the xPack distribution
 *   (http://xpack.github.io).
 * Copyright (c) 2017 Liviu Ionescu.
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
const assert = require('assert')
const fsPromises = require('fs').promises
const path = require('path')
const os = require('os')
const util = require('util')

// ----------------------------------------------------------------------------

// https://www.npmjs.com/package/cp-file
const cpFile = require('cp-file')

// https://www.npmjs.com/package/del
const del = require('del')

// https://www.npmjs.com/package/make-dir
const makeDir = require('make-dir')

// https://www.npmjs.com/package/pacote
const pacote = require('pacote')

// https://www.npmjs.com/package/cmd-shim
const cmdShim = require('../utils/cmd-shim.js')

// ----------------------------------------------------------------------------

const { FsUtils } = require('../utils/fs-utils.js')
const { GlobalConfig } = require('../utils/global-config.js')
const { ManifestIds } = require('../utils/xpack.js')
const { Spawn } = require('../../lib/utils/spawn.js')
const { Xpack } = require('../utils/xpack.js')

// ES6: `import { CliCommand, CliExitCodes, CliError } from 'cli-start-options'
const { CliCommand, CliExitCodes, CliError, CliErrorApplication } =
 require('@ilg/cli-start-options')

// ============================================================================

class Install extends CliCommand {
  // --------------------------------------------------------------------------

  /**
   * @summary Constructor, to set help definitions.
   *
   * @param {Object} context Reference to a context.
   */
  constructor (context) {
    super(context)

    // Title displayed with the help message.
    this.title = 'xPack manager - install package(s)'
    this.optionGroups = [
      {
        title: 'Install options',
        // Extra arguments.
        postOptions: '[[@<scope>/]<name>[@<version]|<github_name>/<repo>]...',
        optionDefs: [
          {
            options: ['-g', '--global'],
            init: ({ config }) => {
              config.isGlobal = false
            },
            action: ({ config }) => {
              config.isGlobal = true
            },
            msg: 'Install the package globally in the home folder',
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
            msg: 'Install the package in a system folder (not impl)',
            isOptional: true
          },
          {
            options: ['-f', '--force'],
            init: ({ config }) => {
              config.doForce = false
            },
            action: ({ config }) => {
              config.doForce = true
            },
            msg: 'Force install over existing package',
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
            msg: 'Pretend to install the package (not impl)',
            isOptional: true
          },
          {
            options: ['-P', '--save-prod'],
            init: ({ config }) => {
              config.doSaveProd = false
            },
            action: ({ config }) => {
              config.doSaveProd = true
            },
            msg: 'Save to dependencies; default unless -D or -O',
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
            options: ['-D', '--save-dev'],
            init: ({ config }) => {
              config.doSaveDev = false
            },
            action: ({ config }) => {
              config.doSaveDev = true
            },
            msg: 'Save to devDependencies',
            isOptional: true
          },
          {
            options: ['-O', '--save-optional'],
            init: ({ config }) => {
              config.doSaveOptional = false
            },
            action: ({ config }) => {
              config.doSaveOptional = true
            },
            msg: 'Save to optionalDependencies',
            isOptional: true
          },
          {
            options: ['-B', '--save-bundle'],
            init: ({ config }) => {
              config.doSaveBundle = false
            },
            action: ({ config }) => {
              config.doSaveBundle = true
            },
            msg: 'Save to bundleDependencies',
            isOptional: true
          },
          {
            options: ['-E', '--save-exact'],
            init: ({ config }) => {
              config.doSaveExact = false
            },
            action: ({ config }) => {
              config.doSaveExact = true
            },
            msg: 'Save deps with exact version',
            isOptional: true
          }
        ]
      }
    ]
  }

  /**
   * @summary Execute the `install` command.
   *
   * @param {string[]} args Command line arguments.
   * @returns {number} Return code.
   *
   * @override
   * @description
   * The command has two distinct modes.
   * 1. If there are no command line package names, the command is expected
   * to be invoked in an xPack folder and install the dependencies and
   * devDependencies.
   * 2. If there are command line package names, the command will install
   * the refered packages, either globally or locally, possibly inside
   * an xPack, followed by adding the package in the dependencies.
   */
  async doRun (args) {
    const log = this.log
    log.trace(`${this.constructor.name}.doRun()`)
    const context = this.context
    const config = context.config

    // TODO: remove when cli-start-options is updated.
    log.debug(`os arch=${os.arch()}, platform=${os.platform()},` +
      ` release=${os.release()}`)
    log.debug(`node ${process.version}`)

    log.verbose(this.title)

    // const config = this.context.config
    for (const arg of args) {
      if (arg.startsWith('-')) {
        log.warn(`'${arg}' ignored`)
      }
    }

    context.globalConfig = new GlobalConfig()

    await context.globalConfig.checkDeprecatedFolders(log)

    // The current folder may not be an xPack or even a package at all.
    this.xpack = new Xpack(config.cwd, context)

    try {
      this.packageJson = await this.xpack.readPackageJson()
    } catch (err) {
      // This happens when not installing in package.
      this.packageJson = null
    }

    // Symbolic links to files do not work on Windows,
    // `make` fails when starting executables via links.
    context.hasFileSysLink = false
    // Links to folders generally work if configured as 'junctions'.
    // True symbolic links work only in Developer mode, so
    // are not very useful.
    context.hasDirSysLink = false

    let exitCode = 0
    if (args.length > 0) {
      for (const arg of args) {
        if (!arg.startsWith('-')) {
          exitCode = await this.installPackage(arg)
          if (exitCode !== 0) {
            break
          }
        }
      }

      if (config.mustRewritePackageJson) {
        await this.rewritePackageJson()
      }

      if (config.isGlobal) {
        if (config.doSaveProd || config.doSaveDev || config.doSaveOptional ||
          config.doSaveExact || config.doSaveBundle) {
          log.warn('save related option(s) ignored for global installs')
        }
      } else {
        if (config.doSaveBundle) {
          log.warn('--save-bundle not yet implemented, ignored')
        }
      }
    } else {
      exitCode = await this.installDependencies()
    }

    if (exitCode === 0) {
      if (log.isVerbose()) {
        this.outputDoneDuration()
      }
    }
    return exitCode
  }

  async installPackage (pack) {
    const log = this.log
    log.trace(`${this.constructor.name}.installPackage('${pack}')`)
    const context = this.context
    const config = context.config

    const cachePath = context.globalConfig.cacheFolderPath
    let manifest
    try {
      manifest = await pacote.manifest(pack, { cache: cachePath })
      log.trace(util.inspect(manifest))
    } catch (err) {
      throw new CliError(err.message, CliExitCodes.ERROR.INPUT)
    }

    const manifestIds = new ManifestIds(manifest)
    const globalPackagePath = path.join(context.globalConfig.globalFolderPath,
      manifestIds.getPath())

    const packFullName = manifestIds.getFullName()

    if (log.isVerbose()) {
      log.verbose()
      log.verbose(`Processing ${packFullName}...`)
    } else {
      // log.info(`${packFullName}`)
    }
    let exitCode = CliExitCodes.ERROR.APPLICATION
    if (config.isSystem) {
      // System install.
      throw new CliErrorApplication('system install not yet implemented')
    } else if (config.isGlobal) {
      // Global install.
      exitCode = await this.installPackageGlobally(
        { pack, globalPackagePath, cachePath, manifestIds })
    } else {
      // Local install.
      exitCode = await this.installPackageLocally(
        { pack, globalPackagePath, cachePath, manifest, manifestIds })
    }
    return exitCode
  }

  async installPackageGlobally (params) {
    const pack = params.pack
    const globalPackagePath = params.globalPackagePath
    const cachePath = params.cachePath
    const manifestIds = params.manifestIds

    const log = this.log
    log.trace(`${this.constructor.name}.installPackageGlobally('${pack}')`)
    const context = this.context
    const config = context.config

    // Global install.
    const globalJson = await this.xpack.isFolderPackage(globalPackagePath)
    if (globalJson) {
      if (config.doForce) {
        log.verbose('Changing permissions to read-write...')
        await FsUtils.chmodRecursive({
          inputPath: globalPackagePath,
          readOnly: false,
          log
        })

        log.verbose(`Removing existing package from '${globalPackagePath}'...`)
        await del(globalPackagePath, { force: true })
      } else {
        log.warn('package already installed; ' +
          'use --force to overwrite')
        return CliExitCodes.ERROR.NONE // Not an error.
      }
    }

    const packFullName = manifestIds.getFullName()
    if (log.isVerbose()) {
      log.verbose(`Installing globally in '${globalPackagePath}'...`)
    } else {
      log.info(`${packFullName} => '${globalPackagePath}'`)
    }
    await pacote.extract(pack, globalPackagePath, { cache: cachePath })
    log.debug(`npm ${pack} package extracted`)

    await this.xpack.downloadBinaries(globalPackagePath, cachePath)

    log.verbose('Changing permissions to read-only...')
    await FsUtils.chmodRecursive({
      inputPath: globalPackagePath,
      readOnly: true,
      log
    })

    return CliExitCodes.SUCCESS
  }

  async installPackageLocally (params) {
    const pack = params.pack
    const globalPackagePath = params.globalPackagePath
    const cachePath = params.cachePath
    const manifest = params.manifest
    const manifestIds = params.manifestIds

    const log = this.log
    log.trace(`${this.constructor.name}.installPackageLocally('${pack}')`)
    const context = this.context
    const config = context.config

    const packFullName = manifestIds.getFullName()
    log.trace(`${packFullName}`)

    let globalJson = await this.xpack.isFolderPackage(globalPackagePath)
    if (!globalJson) {
      if (log.isVerbose()) {
        log.verbose(`Adding to repository '${globalPackagePath}'...`)
      } else {
        log.info(`${packFullName} => '${globalPackagePath}'`)
      }
      await pacote.extract(pack, globalPackagePath, { cache: cachePath })
      log.debug(`pacote ${pack} package extracted`)

      await this.xpack.downloadBinaries(globalPackagePath, cachePath)

      globalJson = await this.xpack.isFolderPackage(globalPackagePath)
    }

    // Install in the local folder
    let localPackagePath = config.cwd
    const json = this.packageJson
    if (!json) {
      log.debug('no valid package.json identified in the current folder')
    }
    if (json && json.xpack) {
      // If cwd is an xPack folder, group all below `xpacks`
      log.trace('inside an xPack folder')
      localPackagePath = path.join(localPackagePath,
        context.globalConfig.localXpacksFolderName)
    } else {
      log.trace('not inside an xPack folder')
    }
    localPackagePath = path.join(localPackagePath,
      manifestIds.getFolderName())
    log.debug(`local path ${localPackagePath}`)

    const destJson = await this.xpack.isFolderPackage(localPackagePath)
    if (destJson) {
      // Destination looks like an existing package, be careful.
      if (config.doForce) {
        log.verbose(`Removing existing package from '${localPackagePath}'...`)
        await del(localPackagePath, { force: true })
      } else {
        log.warn('package already installed; ' +
          'use --force to overwrite')
        return CliExitCodes.ERROR.OUTPUT
      }
    }

    // Check if standalone (not in a package) install.
    if (!json) {
      // Note: it is not clear whether standalone packages are a good idea
      // or not, since binaries are not supported.

      if (this.xpack.isBinaryXpack(globalJson)) {
        throw new CliErrorApplication(
          'installing standalone binary xPack not supported')
      } else {
        if (log.isVerbose()) {
          log.verbose(
            `Installing standalone package in '${localPackagePath}'...`)
        } else {
          log.info(`${packFullName} => '${localPackagePath}'`)
        }

        // Do not link, extract a new local copy of the package.
        await pacote.extract(manifestIds.getFullName(), localPackagePath,
          { cachePath })

        // Standalone packages preserve their mode bits, are not RO.

        return CliExitCodes.SUCCESS
      }
    }

    await this.linkToGlobalRepo({
      globalJson,
      manifestIds,
      globalPackagePath
    })

    // Install inside a package.

    let deps = 'dependencies'

    if (this.xpack.isXpack(globalJson)) {
      // xPack

      const xpacksPath = path.join(config.cwd,
        context.globalConfig.localXpacksFolderName)

      if (this.xpack.isBinaryXpack(globalJson)) {
        // For binaries in a package:
        // - do not extract
        // - add .bin links
        // - add devDependencies.

        await this.processBin({
          bins: globalJson.xpack.bin,
          from: globalPackagePath,
          localFolderName: manifestIds.getFolderName(),
          globalFolderRelativePath: manifestIds.getPath(),
          dest: xpacksPath
        })
        deps = 'devDependencies'
      } else {
        // Source xPacks go to dependencies.
      }
    } else {
      // If not xPack it must be a node module.

      const nodeModulesPath = path.join(config.cwd,
        context.globalConfig.localNpmFolderName)

      if (this.xpack.isBinaryNodeModule(globalJson)) {
        await this.processBin({
          bins: globalJson.bin,
          from: globalPackagePath,
          localFolderName: manifestIds.getFolderName(),
          globalFolderRelativePath: manifestIds.getPath(),
          dest: nodeModulesPath
        })
      }
      // All npm packages are added to `devDependencies`, to avoid
      // `xpm install` pulling all their dependencies.
      deps = 'devDependencies'
    }

    log.verbose('Changing permissions to read-only...')
    await FsUtils.chmodRecursive({
      inputPath: globalPackagePath,
      readOnly: true,
      log
    })

    this.addDependency({
      manifest,
      manifestIds,
      defaultDestination: deps
    })

    return CliExitCodes.SUCCESS
  }

  // Check if the installed packages must be added to the dependencies and
  // return the dependencies group or null.
  computeDependencyDestination (defaultDestination) {
    const context = this.context
    const config = context.config

    if (config.doSaveOptional) {
      return 'optionalDependencies'
    }
    if (config.doSaveDev) {
      return 'devDependencies'
    }
    if (config.doSaveProd) {
      return 'dependencies'
    }
    if (!config.doNotSave) {
      return defaultDestination || 'dependencies'
    }
    return null
  }

  computeDependencyValue (params) {
    const manifest = params.manifest
    assert(manifest)

    const context = this.context
    const config = context.config

    if (manifest._from.startsWith('github:') ||
      manifest._from.startsWith('git:') ||
      manifest._from.startsWith('file:')) {
      return manifest._from
    }
    return (config.doSaveExact || manifest.version.includes('-'))
      ? manifest.version
      : `^${manifest.version}`
  }

  addDependency ({ manifest, manifestIds, defaultDestination }) {
    const log = this.log
    const context = this.context
    const config = context.config

    log.trace(`${this.constructor.name}.addDependency('${manifest._from}')`)

    const json = this.packageJson

    if (json) {
      const computedDestination =
        this.computeDependencyDestination(defaultDestination)
      if (computedDestination) {
        log.verbose(`Adding '${manifestIds.getScopedName()}' to ` +
          `'${computedDestination}'...`)

        const depName = manifestIds.getScopedName()
        const depValue = this.computeDependencyValue({ manifest })
        if (!Object.prototype.hasOwnProperty.call(json, computedDestination)) {
          json[computedDestination] = {}
        }
        // Store dependency value, possibly overriding old one.
        json[computedDestination][depName] = depValue
        log.trace(`depValue ${depValue}`)

        // Mark json dirty.
        config.mustRewritePackageJson = true
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

  /**
  * @summary Install dependencies.
  *
  * @returns {number} Exit code.
  */
  async installDependencies () {
    const log = this.log
    log.trace(`${this.constructor.name}.installDependencies()`)
    const context = this.context
    const config = context.config

    const xpack = this.xpack
    const json = this.packageJson
    if (!json) {
      throw new CliErrorApplication(
        'no valid package.json in the current folder')
    }

    log.verbose()
    log.verbose(`Installing dependencies for package ${json.name}...`)

    this.collectedDependencies = {}
    await this.collectDependencies(json)
    await this.collectDependencies(json, true) // devDependencies

    const cachePath = context.globalConfig.cacheFolderPath

    const xpacksPath = path.join(config.cwd,
      context.globalConfig.localXpacksFolderName)
    const nodeModulesPath = path.join(config.cwd,
      context.globalConfig.localNpmFolderName)

    log.verbose()
    if (Object.values(this.collectedDependencies).length) {
      for (const manifest of Object.values(this.collectedDependencies)) {
        const manifestIds = new ManifestIds(manifest)
        const globalPackagePath = path.join(
          context.globalConfig.globalFolderPath,
          manifestIds.getPath())

        let globalJson = await xpack.isFolderPackage(globalPackagePath)
        if (!globalJson) {
          if (log.isVerbose()) {
            log.verbose(`Adding '${manifestIds.getFullName()}' to ` +
              `repository as '${globalPackagePath}'...`)
          } else {
            log.info(`${manifestIds.getFullName()} => '${globalPackagePath}'`)
          }
          await pacote.extract(manifest._from, globalPackagePath,
            { cache: cachePath })

          globalJson = await xpack.isFolderPackage(globalPackagePath)
          if (globalJson.xpack) {
            await xpack.downloadBinaries(globalPackagePath, cachePath)
          } else {
            log.verbose('Installing npm dependencies for ' +
              `'${manifestIds.getFullName()}'...`)
            const spawn = new Spawn()
            const code = await spawn.executeShellPromise(
              'npm install --production --color=false',
              {
                cwd: globalPackagePath
              })
            if (code !== 0) {
              throw new CliErrorApplication(
                `install dependencies failed (npm returned ${code})`)
            }
          }
          globalJson = await xpack.isFolderPackage(globalPackagePath)
        }

        if (globalJson.xpack || manifest.isContributedByDevDependencies) {
          await this.linkToGlobalRepo({
            globalJson,
            manifestIds,
            globalPackagePath
          })

          try {
            if (this.xpack.isXpack(globalJson)) {
              // xPack
              if (this.xpack.isBinaryXpack(globalJson)) {
                await this.processBin({
                  bins: globalJson.xpack.bin,
                  from: globalPackagePath,
                  localFolderName: manifestIds.getFolderName(),
                  globalFolderRelativePath: manifestIds.getPath(),
                  dest: xpacksPath,
                  isInstallDependencies: true,
                  packageName: manifestIds.getFullName()
                })
              }
            } else {
              // node module
              if (this.xpack.isBinaryNodeModule(globalJson)) {
                await this.processBin({
                  bins: globalJson.bin,
                  from: globalPackagePath,
                  localFolderName: manifestIds.getFolderName(),
                  globalFolderRelativePath: manifestIds.getPath(),
                  dest: nodeModulesPath,
                  isInstallDependencies: true,
                  packageName: manifestIds.getFullName()
                })
              }
            }
          } catch (err) {
            if (err.code !== 'EEXIST') {
              throw new CliErrorApplication(err)
            }
          }
        }
      }
    }

    return CliExitCodes.SUCCESS
  }

  async processBin ({
    bins,
    from,
    localFolderName,
    globalFolderRelativePath,
    dest,
    isInstallDependencies,
    packageName
  }) {
    const log = this.log
    const context = this.context
    // const config = context.config

    log.trace(`processBin(from: ${from}, dest: ${dest}, ` +
      `localFolderName: ${localFolderName}, ` +
      `globalFolderRelativePath: ${globalFolderRelativePath})`)
    const intoPackage = isInstallDependencies ? packageName + ' ' : ''

    // Either xpacks or node_modules
    const localGroupFolderName = path.basename(dest)
    let mustLogInfo = true

    const dotBin = context.globalConfig.dotBin

    const binPath = path.join(dest, dotBin)

    // Create the .bin folder
    await makeDir(binPath)

    for (const [key, value] of Object.entries(bins)) {
      let valuePath
      let isCopy = false
      if (typeof value === 'string' || value instanceof String) {
        valuePath = value
      } else if (typeof value.path === 'string' ||
        value.path instanceof String) {
        valuePath = value.path
        if (value.type === 'copy') {
          isCopy = true
        }
      }
      let fromPath
      fromPath = path.join(from, valuePath)
      const toPath = path.join(binPath, key)
      let suffix = ''

      const fromRelativePath = path.join('..', localFolderName, valuePath)

      try {
        // If the original file is not present, throw.
        log.trace(`stat ${fromPath}`)
        await fsPromises.stat(fromPath)
      } catch (err) {
        if (os.platform() === 'win32') {
          const parts = path.parse(fromPath)
          if (parts.ext) {
            // If the path has an explicit extension, and it was not found,
            // the file is definitely not there.
            continue
          }
          // Otherwise try again with the Windows extension.
          fromPath += '.exe'
          suffix = '.exe'
          try {
            log.trace(`stat ${fromPath}`)
            await fsPromises.stat(fromPath)
          } catch (err) {
            // Neither the POSIX name, nor the Windows name is present.
            continue
          }
        } else {
          // The original file does not exist, nothing to link.
          continue
        }
      }

      if (mustLogInfo) {
        if (os.platform() === 'win32') {
          if (context.hasFileSymLink) {
            log.verbose(
              `Adding file symbolic link to ${intoPackage}binaries in ` +
              `'${localGroupFolderName}/${dotBin}'...`)
          } else {
            log.verbose(`Adding .cmd stubs to ${intoPackage}binaries in ` +
              `'${localGroupFolderName}/${dotBin}'...`)
          }
        } else {
          log.verbose(`Adding symbolic links to ${intoPackage}binaries in ` +
            `'${localGroupFolderName}/${dotBin}'...`)
        }

        // Prevent multiple displays.
        mustLogInfo = false
      }

      // Delete any existing link or file/folder.
      await del(toPath, { force: true })

      const globalRelativeFilePath = path.join(globalFolderRelativePath,
        valuePath)
      const localRelativeFilePath = path.join(localGroupFolderName, dotBin, key)
      if (!isCopy) {
        if (os.platform() === 'win32') {
          // On Windows there two files; remove them both.
          await del(`${toPath}.cmd`, { force: true })
          await del(`${toPath}${suffix}`, { force: true })

          if (context.hasFileSymLink) {
            // Normally not used.
            log.trace(`symlink('${fromPath}', '${toPath + suffix}')`)
            await fsPromises.symlink(fromPath, toPath + suffix, 'file')
            if (log.isVerbose()) {
              log.verbose(
                `File '${localRelativeFilePath}${suffix}' ` +
                `linked to global '${globalRelativeFilePath}${suffix}'.`)
            } else {
              log.info(
                `'${localRelativeFilePath}${suffix}' -> '${fromPath}'`)
            }
          } else {
            log.trace(`cmdShim('${fromPath}', '${toPath}')`)
            // Create two files, a .cmd shim and a script.
            await cmdShim(fromPath, toPath)
            if (log.isVerbose()) {
              log.verbose(
                `File '${localRelativeFilePath}.cmd' ` +
                `forwarding to '${globalRelativeFilePath}${suffix}'.`)
              log.verbose(
                `File '${localRelativeFilePath}' ` +
                `forwarding to '${globalRelativeFilePath}${suffix}'.`)
            } else {
              log.info(
                `'${localRelativeFilePath}.cmd' -> '${fromPath}'`)
              log.info(
                `'${localRelativeFilePath}' -> '${fromPath}'`)
            }
          }
        } else {
          await fsPromises.symlink(fromRelativePath, toPath, 'file')
          if (log.isVerbose()) {
            log.verbose(
              `File '${localRelativeFilePath}' ` +
              `linked to '${fromRelativePath}'.`)
          } else {
            log.info(
              `'${localRelativeFilePath}' -> '${fromRelativePath}'`)
          }
        }
      } else {
        // Currently not used.
        await cpFile(fromPath, toPath, { overwrite: true })
        if (log.isVerbose()) {
          log.verbose(
            `File '${localRelativeFilePath}' ` +
            `copied from '${globalRelativeFilePath}'.`)
        } else {
          log.info(
            `'${globalRelativeFilePath}' => '${localRelativeFilePath}'`)
        }
      }
    }
  }

  /**
   * @summary Collect package dependencies.
   * @param {*} json A package.json.
   * @param {*} isDev True if part of devDependencies.
   * @returns {undefined} Nothing.
   *
   * @description
   * Iterate the package.json dependencies and devDependencies
   * and add those and their children.
   */
  async collectDependencies (json, isDev = false) {
    const log = this.log
    log.trace(`${this.constructor.name}.collectDependencies() for ${json.name}`)

    const context = this.context
    // const config = context.config

    const cachePath = context.globalConfig.cacheFolderPath

    const deps = isDev ? json.devDependencies : json.dependencies

    if (deps) {
      for (const [key, value] of Object.entries(deps)) {
        let pack
        if (value.startsWith('github:') || value.startsWith('git:') ||
          value.startsWith('file:')) {
          pack = value
        } else {
          const version = value.replace(/^[^0-9]+/, '')
          pack = `${key}@${version}`
        }
        let manifest
        try {
          log.verbose(`Processing package ${pack}...`)
          manifest = await pacote.manifest(pack, { cache: cachePath })
        } catch (err) {
          throw new CliErrorApplication(err.message)
        }

        if (!this.collectedDependencies[key]) {
          if (isDev) {
            manifest.isContributedByDevDependencies = true
          }
          this.collectedDependencies[key] = manifest
        } else {
          const prevVersion = this.collectedDependencies[key].version
          if (prevVersion !== manifest.version) {
            throw new CliErrorApplication(
              `conflicting version ${prevVersion} also requested;` +
              ' mitigation not yet implemented')
          }
        }

        if (!isDev && manifest.dependencies) {
          // Recursively collect dependencies.
          await this.collectDependencies(manifest)
        }
      }
    }
  }

  /**
   * @summary Add links to packages installed in the global repository.
   * @returns {undefined} Nothing.
   *
   * @description
   * Link to either `xpacks` or `node_modules`.
   * The link name is a linearised `scope_name`, without the `@`.
   * On Windows, a _junction_ is created, otherwise symbolic links
   * are used.
   */
  async linkToGlobalRepo ({
    globalJson,
    manifestIds,
    globalPackagePath
  }) {
    const log = this.log
    log.trace(`${this.constructor.name}.linkToRepo()`)
    const context = this.context
    const config = context.config

    let linkPath
    if (this.xpack.isXpack(globalJson)) {
      const xpacksPath = path.join(config.cwd,
        context.globalConfig.localXpacksFolderName)
      await makeDir(xpacksPath)
      linkPath = path.join(xpacksPath, manifestIds.getFolderName())
    } else {
      // If not an xPack, it must be a node module.
      const nodeModulesPath = path.join(config.cwd,
        context.globalConfig.localNpmFolderName)
      await makeDir(nodeModulesPath)
      linkPath = path.join(nodeModulesPath, manifestIds.getFolderName())
    }

    log.trace(`linkPath ${linkPath}`)
    await del(linkPath, { force: true })
    if (os.platform() === 'win32') {
      const symlinkType = (context.hasDirSysLink ? 'dir' : 'junction')
      log.trace('symlink' +
        `(${globalPackagePath}, ${linkPath}, ${symlinkType})`)
      try {
        await fsPromises.symlink(globalPackagePath, linkPath,
          symlinkType)
      } catch (err) {
        const absPath = path.resolve(linkPath)
        // console.log(absPath)
        if (log.isVerbose()) {
          throw new CliErrorApplication(err)
        } else {
          throw new CliErrorApplication(`volume ${absPath.substring(0, 2)}` +
            ' does not support links;' +
            ' it might not be NTFS, or it might be a remote resource'
          )
        }
      }
    } else {
      await fsPromises.symlink(globalPackagePath, linkPath)
    }
    const folder = path.join((this.xpack.isXpack(globalJson)
      ? context.globalConfig.localXpacksFolderName
      : context.globalConfig.localNpmFolderName),
    manifestIds.getFolderName())

    if (log.isVerbose()) {
      log.verbose(`Folder '${folder}' ` +
      `linked to global '${manifestIds.getPath()}'.`)
    } else {
      log.info(`'${folder}' ` +
      `-> '${globalPackagePath}'`)
    }
  }

  // --------------------------------------------------------------------------
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// The Install class is added as a property of this object.
module.exports.Install = Install

// In ES6, it would be:
// export class Install { ... }
// ...
// import { Install } from 'install.js'

// ----------------------------------------------------------------------------
