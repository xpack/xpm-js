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

// ----------------------------------------------------------------------------

const { FsUtils } = require('../utils/fs-utils.js')
const { GlobalConfig } = require('../utils/global-config.js')
const { ManifestIds } = require('../utils/xpack.js')
const { Spawn } = require('../../lib/utils/spawn.js')
const { Xpack } = require('../utils/xpack.js')

// https://www.npmjs.com/package/cmd-shim
const cmdShim = require('../utils/cmd-shim.js')

// https://www.npmjs.com/package/@xpack/xpm-liquid
const { XpmLiquid } = require('@xpack/xpm-liquid')

// ES6: `import { CliCommand, CliExitCodes, CliError } from 'cli-start-options'
const { CliCommand, CliExitCodes, CliError, CliErrorInput } =
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
            msg: 'Install the package in a system folder',
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
            options: ['-c', '--config'],
            init: ({ config }) => {
              config.configurationName = undefined
            },
            action: ({ config }, val) => {
              config.configurationName = val.trim()
            },
            msg: 'Install configuration specific dependencies',
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
            msg: 'Pretend to install the package(s)',
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
    const xpack = this.xpack

    try {
      this.packageJson = await xpack.readPackageJson()
    } catch (err) {
      // This happens when not installing in an existing package,
      // but in a folder.
      this.packageJson = null
    }
    const packageJson = this.packageJson

    if (packageJson && !xpack.isXpack() &&
      !config.isGlobal && !config.isSystem) {
      throw new CliErrorInput(
        'current folder not an xPack, ' +
        'check for the "xpack" property in package.json')
    }

    await xpack.checkMinimumXpmRequired(packageJson)

    // Symbolic links to files do not work on Windows,
    // `make` fails when starting executables via links.
    context.hasFileSysLink = false
    // Links to folders generally work if configured as 'junctions'.
    // True symbolic links work only in Developer mode, so
    // are not very useful.
    context.hasDirSysLink = false

    if (args.length === 0) {
      // When no package names are passed.
      await this.installAllDependencies()

      if (log.isVerbose()) {
        this.outputDoneDuration()
      }

      return CliExitCodes.SUCCESS
    }

    // When at least one package name is passed.
    for (const arg of args) {
      if (!arg.startsWith('-')) {
        // Throws on error.
        await this.installPackage(arg)
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

    if (log.isVerbose()) {
      this.outputDoneDuration()
    }

    return CliExitCodes.SUCCESS
  }

  // --------------------------------------------------------------------------

  /**
   * @summary Install one package.
   *
   * @param {string} pack The pack to install.
   * @returns {undefined} Nothing.
   */
  async installPackage (pack) {
    const log = this.log
    log.trace(`${this.constructor.name}.installPackage('${pack}')`)

    const context = this.context
    const config = context.config
    const xpack = this.xpack

    const cacheFolderPath = context.globalConfig.cacheFolderPath
    let manifest
    try {
      log.trace(`pacote.manifest(${pack})`)
      manifest = await pacote.manifest(pack, { cache: cacheFolderPath })
      if (log.isTrace()) {
        log.trace(util.inspect(manifest))
      }
    } catch (err) {
      log.trace(err)
      throw new CliErrorInput(`Package '${pack}' not found`)
    }

    const manifestIds = new ManifestIds(manifest)
    const globalPackagePath = path.join(context.globalConfig.globalFolderPath,
      manifestIds.getPath())

    const packFullName = manifestIds.getFullName()

    if (log.isVerbose()) {
      log.verbose()
      log.verbose(`Processing ${packFullName}...`)
    } else {
      log.info(`${packFullName}...`)
    }
    if (config.isSystem) {
      // System install.
      await this.installPackageInSystem(
        { pack, cacheFolderPath, manifestIds })
    } else if (config.isGlobal) {
      // Global install.
      await this.installPackageGlobally(
        { pack, globalPackagePath, cacheFolderPath, manifestIds })
    } else if (xpack.isXpack()) {
      // In xPack install.
      await this.installPackageInXpack(
        { pack, globalPackagePath, cacheFolderPath, manifest, manifestIds })
    } else {
      // Standalone install.
      await this.installPackageStandalone(
        { pack, globalPackagePath, cacheFolderPath, manifest, manifestIds })
    }
  }

  async installPackageInSystem ({
    pack,
    cacheFolderPath,
    manifestIds
  }) {
    assert(pack)
    assert(cacheFolderPath)
    assert(manifestIds)

    const context = this.context
    const config = context.config

    const log = this.log
    log.trace(`${this.constructor.name}.installPackageInSystem('${pack}')`)

    if (config.configurationName) {
      throw new CliErrorInput('--config incompatible with --system')
    }

    // TODO: implement it.
    throw new CliError('system install is not yet implemented')
  }

  async installPackageGlobally ({
    pack,
    globalPackagePath,
    cacheFolderPath,
    manifestIds
  }) {
    assert(pack)
    assert(globalPackagePath)
    assert(cacheFolderPath)
    assert(manifestIds)

    const context = this.context
    const config = context.config
    const log = this.log
    log.trace(`${this.constructor.name}.installPackageGlobally('${pack}')`)

    if (config.configurationName) {
      throw new CliErrorInput('--config incompatible with --global')
    }

    if (config.isDryRun) {
      log.verbose(`Pretend installing globally in '${globalPackagePath}'...`)
      return
    }

    // Global install.
    await this.pacoteExtractContentReadOnly({
      packFullName: manifestIds.getFullName(),
      fromFolderPath: manifestIds.getPacoteFrom(),
      destinationFolderPath: globalPackagePath,
      cacheFolderPath,
      verboseMessage:
        `Installing globally in '${globalPackagePath}'...`
    })
  }

  /**
   * @summary Install inside an existing xPack.
   * @param {*} params Parameters
   * @returns {undefined} Nothing.
   *
   * May return CliExitCodes.ERROR.OUTPUT if already installed.
   */
  async installPackageInXpack ({
    pack,
    globalPackagePath,
    cacheFolderPath,
    manifest,
    manifestIds
  }) {
    assert(pack)
    assert(globalPackagePath)
    assert(cacheFolderPath)
    assert(manifest)
    assert(manifestIds)

    const log = this.log
    log.trace(`${this.constructor.name}.installPackageInXpack('${pack}')`)
    log.trace(`globalPackagePath: ${globalPackagePath}`)

    const context = this.context
    const config = context.config
    const xpack = this.xpack
    const packageJson = this.packageJson

    const packFullName = manifestIds.getFullName()
    log.trace(`${packFullName}`)

    let globalJson = await xpack.isFolderPackage(globalPackagePath)
    if (!globalJson || config.doForce) {
      if (config.isDryRun) {
        log.verbose(`Pretend adding to repository '${globalPackagePath}'...`)
        return
      }

      // The package is not present in the global repository, add it there.
      await this.pacoteExtractContentReadOnly({
        packFullName,
        fromFolderPath: manifestIds.getPacoteFrom(),
        destinationFolderPath: globalPackagePath,
        cacheFolderPath,
        verboseMessage:
          `Adding to repository '${globalPackagePath}'...`
      })

      // Parse again the newly installed package.
      globalJson = await xpack.isFolderPackage(globalPackagePath)
    }

    if (config.isDryRun) {
      log.info('Dry run...')
      return
    }

    let buildFolderRelativePath
    if (config.configurationName) {
      const configuration = xpack.retrieveConfiguration({
        packageJson,
        configurationName: config.configurationName
      })

      const liquidEngine = new XpmLiquid(log)
      const liquidMap = liquidEngine.prepareMap(packageJson,
        config.configurationName)

      buildFolderRelativePath = await xpack.computeBuildFolderRelativePath({
        liquidEngine,
        liquidMap,
        configuration,
        configurationName: config.configurationName
      })
    }

    // Install in the local package or configuration folder.
    const localPackagePath = path.join(config.cwd,
      buildFolderRelativePath || '',
      context.globalConfig.localXpacksFolderName,
      manifestIds.getFolderName())

    log.debug(`local path: ${localPackagePath}`)

    const destJson = await xpack.isFolderPackage(localPackagePath)
    if (destJson) {
      // Destination looks like an existing package, be careful.
      if (config.doForce) {
        log.verbose(`Removing existing package from '${localPackagePath}'...`)
        await del(localPackagePath, { force: true })
      } else {
        log.warn(`package ${packFullName} already installed; ` +
          'use --force to overwrite')
        // TODO: decide if there should be an error or success.
        return CliExitCodes.ERROR.OUTPUT
      }
    }

    await this.addFolderLinkToGlobalRepo({
      globalJson,
      manifestIds,
      globalPackagePath,
      buildFolderRelativePath
    })

    // Process binaries and dependencies.

    let deps

    if (xpack.isXpack(globalJson)) {
      // xPack

      const xpacksPath = path.join(config.cwd,
        context.globalConfig.localXpacksFolderName)

      if (xpack.isBinaryXpack(globalJson)) {
        // Add links to executables listed in xpack/bin
        await this.addBinLinks({
          bins: globalJson.xpack.bin,
          fromFolderPath: globalPackagePath,
          localFolderName: manifestIds.getFolderName(),
          globalFolderRelativePath: manifestIds.getPath(),
          destFolderPath: xpacksPath
        })
        // By deafult, binary xPacks go to devDependencies.
        deps = 'devDependencies'
      } else {
        // By default, source xPacks go to dependencies.
        deps = 'dependencies'
      }
    } else {
      // If not xPack, it must be a node module.

      const nodeModulesPath = path.join(config.cwd,
        context.globalConfig.localNpmFolderName)

      if (xpack.isBinaryNodeModule(globalJson)) {
        await this.addBinLinks({
          bins: globalJson.bin,
          fromFolderPath: globalPackagePath,
          localFolderName: manifestIds.getFolderName(),
          globalFolderRelativePath: manifestIds.getPath(),
          destFolderPath: nodeModulesPath
        })
      }
      // By default, all npm packages go to `devDependencies`, to avoid
      // `xpm install` pulling all their dependencies.
      deps = 'devDependencies'
    }

    this.addDependencyToPackageJson({
      manifest,
      manifestIds,
      defaultDestination: deps,
      configurationName: config.configurationName
    })
  }

  /**
   * @summary Install inside a standalone folder.
   * @param {*} params Parameters
   * @returns {undefined} Nothing.
   *
   * May return CliExitCodes.ERROR.OUTPUT if already installed.
   */
  async installPackageStandalone ({
    pack,
    globalPackagePath,
    cacheFolderPath,
    manifest,
    manifestIds
  }) {
    assert(pack)
    assert(globalPackagePath)
    assert(cacheFolderPath)
    assert(manifest)
    assert(manifestIds)

    const log = this.log
    log.trace(`${this.constructor.name}.installPackageStandalone('${pack}')`)

    const context = this.context
    const config = context.config
    const xpack = this.xpack

    if (config.configurationName) {
      throw new CliErrorInput('--config incompatible with standalone installs')
    }

    const packFullName = manifestIds.getFullName()
    log.trace(`${packFullName}`)

    let globalJson = await xpack.isFolderPackage(globalPackagePath)
    if (!globalJson || config.doForce) {
      if (config.isDryRun) {
        log.verbose(`Pretend adding to repository '${globalPackagePath}'...`)
        return
      }

      // The package is not present in the global repository, add it there.
      await this.pacoteExtractContentReadOnly({
        packFullName,
        fromFolderPath: manifestIds.getPacoteFrom(),
        destinationFolderPath: globalPackagePath,
        cacheFolderPath,
        verboseMessage:
          `Adding to repository '${globalPackagePath}'...`
      })

      globalJson = await xpack.isFolderPackage(globalPackagePath)
    }

    if (config.isDryRun) {
      log.info('Dry run...')
      return
    }

    if (xpack.isBinaryXpack(globalJson)) {
      throw new CliError(
        'installing standalone binary xPack not supported')
    }

    // Install in the current folder
    const localPackagePath = path.join(config.cwd, manifestIds.getFolderName())
    log.debug(`local path ${localPackagePath}`)

    try {
      // Avoid overriding an existing folder.
      await fsPromises.stat(localPackagePath)

      if (config.doForce) {
        log.verbose(`Removing existing package from '${localPackagePath}'...`)
        await del(localPackagePath, { force: true })
      } else {
        throw CliError(`package ${packFullName} already installed, ` +
          'use --force to overwrite',
        CliExitCodes.ERROR.OUTPUT)
      }
    } catch (err) {
      // Not present, no danger.
    }

    // Extract a local copy here too.
    await this.pacoteExtract({
      packFullName,
      fromFolderPath: manifestIds.getPacoteFrom(),
      destinationFolderPath: localPackagePath,
      cacheFolderPath,
      verboseMessage:
        `Installing standalone package in '${localPackagePath}'...`
    })

    // Standalone packages preserve their mode bits, are not set to RO.
  }

  // --------------------------------------------------------------------------

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

  computeDependencyValue ({
    manifest
  }) {
    assert(manifest)

    const context = this.context
    const config = context.config

    if (manifest._from.match(/^[a-zA-Z]+:/)) {
      // If an URL, keep it as is.
      return manifest._from
    }

    // Checking '-' identifies binaries which use pre-release;
    // they all should be refered with exact versions.
    return (config.doSaveExact || manifest.version.includes('-'))
      ? manifest.version
      : `^${manifest.version}`
  }

  // TODO add configurationName
  addDependencyToPackageJson ({
    manifest,
    manifestIds,
    defaultDestination,
    configurationName
  }) {
    assert(manifest)
    assert(manifestIds)

    const log = this.log
    log.trace(`${this.constructor.name}.addDependency('${manifest._from}')`)

    const context = this.context
    const config = context.config

    const packageJson = this.packageJson

    if (packageJson) {
      // Live `dependencies` or `devDependencies`.
      const dependencyDestination =
        this.computeDependencyDestination(defaultDestination)
      if (dependencyDestination) {
        if (configurationName) {
          log.verbose(`Adding '${manifestIds.getScopedName()}' to ` +
            `'${configurationName}/${dependencyDestination}'...`)
        } else {
          log.verbose(`Adding '${manifestIds.getScopedName()}' to ` +
            `'${dependencyDestination}'...`)
        }

        const depName = manifestIds.getScopedName()
        const depValue = this.computeDependencyValue({ manifest })

        // Decide where to add the new dependency, configuration vs project.
        let target
        if (configurationName) {
          // Prefer `buildConfigurations`, but also accept `configurations`.
          if (packageJson.xpack.buildConfigurations) {
            target = packageJson.xpack.buildConfigurations[configurationName]
          } else if (packageJson.xpack.configurations) {
            target = packageJson.xpack.configurations[configurationName]
          } else {
            assert(packageJson.xpack.buildConfigurations[configurationName])
          }
        } else {
          target = packageJson
        }

        // If the destination object is not yet there, create an empty one.
        if (!Object.prototype.hasOwnProperty.call(
          target, dependencyDestination)) {
          target[dependencyDestination] = {}
        }

        // Store dependency value, possibly overriding old one.
        target[dependencyDestination][depName] = depValue
        log.trace(`depValue ${depValue}`)

        // Mark the json dirty, to be written when the command terminates.
        config.mustRewritePackageJson = true
      }
    }
  }

  async rewritePackageJson () {
    const log = this.log
    log.trace(`${this.constructor.name}.rewritePackageJson()`)

    const context = this.context
    const config = context.config
    const xpack = this.xpack
    const packageJson = this.packageJson

    if (!packageJson || !config.mustRewritePackageJson) {
      return
    }

    await xpack.rewritePackageJson()
  }

  // --------------------------------------------------------------------------

  /**
   * @summary Install all dependencies.
   *
   * @details
   * Add links into `<project>/xpacks` and `build/<config>/xpacks.
   *
   * If `--config` is used, add links only to the configuration build folder.
   *
   * @returns {undefined} Nothing.
   */
  async installAllDependencies () {
    const log = this.log
    const context = this.context
    const config = context.config

    const xpack = this.xpack
    const packageJson = this.packageJson

    log.trace(`${this.constructor.name}.installAllDependencies()`)

    if (!packageJson) {
      throw new CliErrorInput(
        'current folder not a valid package, check for package.json')
    }

    if (config.isGlobal) {
      throw new CliErrorInput(
        '--global supported only when explicitly installing packages')
    }

    if (config.isSystem) {
      throw new CliErrorInput(
        '--system supported only when explicitly installing packages')
    }

    if (config.doSaveProd || config.doSaveDev || config.doSaveOptional ||
      config.doSaveBundle || config.doSaveExact) {
      throw new CliErrorInput(
        '--save-* supported only when explicitly installing packages')
    }

    config.doSkipIfInstalled = true

    if (config.configurationName) {
      // Process only this configuration

      const configuration = xpack.retrieveConfiguration({
        packageJson,
        configurationName: config.configurationName
      })

      const { collectedDependenciesMap, buildFolderRelativePath } =
        await this.collectConfigurationDependencies({
          configurationName: config.configurationName,
          configuration
        })

      await this.downloadAndLinkDependencies({
        collectedDependenciesMap,
        buildFolderRelativePath
      })
    } else {
      // Process the top package and all configurations

      const { collectedDependenciesMap } =
        await this.collectPackageDependencies()

      await this.downloadAndLinkDependencies({
        collectedDependenciesMap
      })

      const enumerateConfigurations = async (from) => {
        for (const [configurationName, configuration] of
          Object.entries(from)) {
          if (configuration.dependencies || configuration.devDependencies) {
            if (!log.isVerbose()) {
              log.info()
            }

            const { collectedDependenciesMap, buildFolderRelativePath } =
              await this.collectConfigurationDependencies({
                configurationName,
                configuration
              })

            await this.downloadAndLinkDependencies({
              collectedDependenciesMap,
              buildFolderRelativePath
            })
          }
        }
      }

      if (packageJson.xpack.buildConfigurations) {
        await enumerateConfigurations(packageJson.xpack.buildConfigurations)
      }
      if (packageJson.xpack.configurations) {
        await enumerateConfigurations(packageJson.xpack.configurations)
      }
    }
  }

  async collectPackageDependencies () {
    const log = this.log
    const packageJson = this.packageJson

    if (log.isVerbose()) {
      log.verbose()
      log.verbose(
        `Collecting dependencies for package ${packageJson.name}...`)
    } else {
      log.info(`${packageJson.name}...`)
    }

    const collectedDependenciesMap = {}

    await this.collectDependencies({
      json: packageJson,
      dependencies: packageJson.dependencies,
      outputMap: collectedDependenciesMap
    })
    log.trace('Collecting devDependencies...')
    await this.collectDependencies({
      json: packageJson,
      dependencies: packageJson.devDependencies,
      isDev: true,
      outputMap: collectedDependenciesMap
    })

    return {
      collectedDependenciesMap
    }
  }

  async collectConfigurationDependencies ({
    configurationName,
    configuration
  }) {
    assert(configurationName)
    assert(configuration)

    const log = this.log
    const xpack = this.xpack
    const packageJson = this.packageJson

    const collectedDependenciesMap = {}

    const liquidEngine = new XpmLiquid(log)
    const liquidMap = liquidEngine.prepareMap(packageJson,
      configurationName)

    const buildFolderRelativePath =
    await xpack.computeBuildFolderRelativePath({
      liquidEngine,
      liquidMap,
      configuration,
      configurationName
    })

    if (log.isVerbose()) {
      log.verbose()
      log.verbose(
        `Collecting dependencies for package ${packageJson.name}, ` +
        `configuration ${configurationName}...`)
    } else {
      log.info(`${packageJson.name} --config ${configurationName}...`)
    }

    await this.collectDependencies({
      json: packageJson,
      dependencies: configuration.dependencies,
      outputMap: collectedDependenciesMap
    })
    log.trace('Collecting devDependencies...')
    await this.collectDependencies({
      json: packageJson,
      dependencies: configuration.devDependencies,
      isDev: true,
      outputMap: collectedDependenciesMap
    })

    return {
      collectedDependenciesMap,
      buildFolderRelativePath
    }
  }

  async downloadAndLinkDependencies ({
    collectedDependenciesMap,
    buildFolderRelativePath
  }) {
    const log = this.log

    log.verbose()
    const manifestsArray = Object.values(collectedDependenciesMap)
    if (manifestsArray.length) {
      log.verbose(`Installing ${manifestsArray.length} dependencies...`)

      const installDependencyPromisesArray = []
      for (const manifest of manifestsArray) {
        installDependencyPromisesArray.push(this.downloadAndLinkOneDependency({
          manifest,
          buildFolderRelativePath
        }))
      }

      await Promise.all(installDependencyPromisesArray)
    }
  }

  // Will be executed in parallel via `Promise.all()`.
  async downloadAndLinkOneDependency ({
    manifest,
    buildFolderRelativePath
  }) {
    const log = this.log

    log.trace(
      `${this.constructor.name}.downloadAndLinkOneDependency(${manifest.name})`)

    const context = this.context
    const config = context.config

    const xpack = this.xpack

    const cacheFolderPath = context.globalConfig.cacheFolderPath

    if (log.isTrace()) {
      log.trace(util.inspect(manifest))
    }

    const manifestIds = new ManifestIds(manifest)
    const globalPackagePath = path.join(
      context.globalConfig.globalFolderPath,
      manifestIds.getPath())

    let verboseMessage

    // log.trace(`${globalPackagePath}`)
    let globalJson = await xpack.isFolderPackage(globalPackagePath)
    if (!globalJson) {
      // The package does not exist in the central repo.
      if (config.isDryRun) {
        verboseMessage = `Pretend adding '${manifestIds.getFullName()}' to ` +
          `repository as '${globalPackagePath}'...`
      } else {
        verboseMessage = `Adding '${manifestIds.getFullName()}' to ` +
          `repository as '${globalPackagePath}'...`
      }

      await this.pacoteExtractContentReadOnly({
        packFullName: manifestIds.getFullName(),
        fromFolderPath: manifestIds.getPacoteFrom(),
        destinationFolderPath: globalPackagePath,
        cacheFolderPath,
        verboseMessage
      })

      globalJson = await xpack.isFolderPackage(globalPackagePath)
      log.trace(globalJson)
      if (!globalJson.xpack) {
        // The package is not an xPack, it must be installed via npm.
        if (config.isDryRun) {
          log.verbose('Pretend installing npm dependencies for ' +
            `'${manifestIds.getFullName()}'...`)
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
            throw new CliError(
              `install dependencies failed (npm returned ${code})`)
          }
        }
      }
    }

    // Link to package or configuration folder.

    if (config.isDryRun) {
      const folderPath = path.join((xpack.isXpack(globalJson)
        ? context.globalConfig.localXpacksFolderName
        : context.globalConfig.localNpmFolderName),
      manifestIds.getFolderName())

      if (log.isVerbose()) {
        log.verbose(`Pretend folder '${folderPath}' is ` +
          `linked to global '${manifestIds.getPath()}'...`)
      } else {
        log.info(`'${folderPath}' ` +
          `-> '${globalPackagePath}' (dry run)`)
      }

      return // Dry runs end here.
    }

    // Add links to the central repo and for binaries.
    const xpacksPath = path.join(config.cwd,
      buildFolderRelativePath || '',
      context.globalConfig.localXpacksFolderName)
    const nodeModulesPath = path.join(config.cwd,
      buildFolderRelativePath || '',
      context.globalConfig.localNpmFolderName)

    if (globalJson.xpack || manifest.isContributedByDevDependencies) {
      await this.addFolderLinkToGlobalRepo({
        globalJson,
        manifestIds,
        globalPackagePath,
        buildFolderRelativePath
      })

      try {
        if (xpack.isXpack(globalJson)) {
          // xPack
          if (xpack.isBinaryXpack(globalJson)) {
            await this.addBinLinks({
              bins: globalJson.xpack.bin,
              fromFolderPath: globalPackagePath,
              localFolderName: manifestIds.getFolderName(),
              globalFolderRelativePath: manifestIds.getPath(),
              destFolderPath: xpacksPath
            })
          }
        } else {
          // node module
          if (xpack.isBinaryNodeModule(globalJson)) {
            await this.addBinLinks({
              bins: globalJson.bin,
              fromFolderPath: globalPackagePath,
              localFolderName: manifestIds.getFolderName(),
              globalFolderRelativePath: manifestIds.getPath(),
              destFolderPath: nodeModulesPath
            })
          }
        }
      } catch (err) {
        if (err.code !== 'EEXIST') {
          log.trace(err)
          throw new CliError(err)
        }
      }
    }
  }

  async addBinLinks ({
    bins,
    fromFolderPath,
    localFolderName,
    globalFolderRelativePath,
    destFolderPath
  }) {
    assert(fromFolderPath)
    assert(localFolderName)
    assert(globalFolderRelativePath)
    assert(destFolderPath)

    const log = this.log
    log.trace(`${this.constructor.name}.addBinLinks(` +
      `fromFolderPath: ${fromFolderPath}, ` +
      `destFolderPath: ${destFolderPath}, ` +
      `localFolderName: ${localFolderName}, ` +
      `globalFolderRelativePath: ${globalFolderRelativePath})`)

    const context = this.context
    // const config = context.config

    // Either xpacks or node_modules
    const localGroupFolderName = path.basename(destFolderPath)

    const dotBin = context.globalConfig.dotBin
    const binFolderPath = path.join(destFolderPath, dotBin)

    // Create the .bin folder
    await makeDir(binFolderPath)

    for (const [key, value] of Object.entries(bins)) {
      let valueFileRelativePath
      let isCopy = false
      if (typeof value === 'string' || value instanceof String) {
        valueFileRelativePath = value
      } else if (typeof value.path === 'string' ||
        value.path instanceof String) {
        valueFileRelativePath = value.path
        if (value.type === 'copy') {
          isCopy = true
        }
      }

      let fromFilePath
      fromFilePath = path.join(fromFolderPath, valueFileRelativePath)
      const toFilePath = path.join(binFolderPath, key)
      let suffix = ''

      try {
        // If the original file is not present, throw.
        log.trace(`stat ${fromFilePath}`)
        await fsPromises.stat(fromFilePath)
      } catch (err) {
        if (os.platform() === 'win32') {
          // As usual, things are a bit more complicated on Windows,
          // and it is necessary to process the explicit `.exe`.
          const parts = path.parse(fromFilePath)
          if (parts.ext) {
            // If the path has an explicit extension, and it was not found,
            // the file is definitely not there.
            continue
          }

          // Check again the original, but this time with the Windows extension.
          fromFilePath += '.exe'
          suffix = '.exe'
          try {
            log.trace(`stat ${fromFilePath}`)
            await fsPromises.stat(fromFilePath)
          } catch (err) {
            // Neither the POSIX name, nor the Windows name is present.
            continue
          }
        } else {
          // The original file does not exist, nothing to link.
          continue
        }
      }

      const globalRelativeFilePath = path.join(globalFolderRelativePath,
        valueFileRelativePath)
      const localRelativeFilePath = path.join(localGroupFolderName, dotBin, key)

      if (!isCopy) {
        const fromRelativePath = path.join('..', localFolderName,
          valueFileRelativePath)

        await this.addLinkToExecutable({
          fromFilePath,
          toFilePath,
          suffix,
          localRelativeFilePath,
          globalRelativeFilePath,
          fromRelativePath
        })
      } else {
        // Currently not used.
        // Delete any existing link or file/folder.
        await del(toFilePath, { force: true })

        await cpFile(fromFilePath, toFilePath, { overwrite: true })
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

  async addLinkToExecutable ({
    fromFilePath,
    toFilePath,
    suffix,
    localRelativeFilePath,
    globalRelativeFilePath,
    fromRelativePath
  }) {
    assert(fromFilePath)
    assert(toFilePath)
    assert(localRelativeFilePath)
    assert(globalRelativeFilePath)
    assert(fromRelativePath)

    const log = this.log
    log.trace(`${this.constructor.name}.addLinkToExecutable(` +
      `fromFilePath: ${fromFilePath}) ` +
      `toFilePath: ${toFilePath}`)

    const context = this.context

    if (os.platform() === 'win32') {
      if (context.hasFileSymLink) {
        await del(`${toFilePath}${suffix}`, { force: true })

        // Normally not used.
        log.trace(`symlink('${fromFilePath}', '${toFilePath}${suffix}')`)
        await fsPromises.symlink(fromFilePath, `${toFilePath}${suffix}`, 'file')
        if (log.isVerbose()) {
          log.verbose(
            `File '${localRelativeFilePath}${suffix}' ` +
            `linked to global '${globalRelativeFilePath}${suffix}'.`)
        } else {
          log.info(
            `'${localRelativeFilePath}${suffix}' -> '${fromFilePath}'`)
        }
      } else {
        // On Windows there two files; remove both.
        await del(`${toFilePath}.cmd`, { force: true })
        await del(toFilePath, { force: true })

        log.trace(`cmdShim('${fromFilePath}', '${toFilePath}')`)
        // Create two files, a .cmd shim and a script.
        await cmdShim(fromFilePath, toFilePath)
        if (log.isVerbose()) {
          log.verbose(
            `File '${localRelativeFilePath}.cmd' ` +
            `forwarding to '${globalRelativeFilePath}${suffix}'.`)
          log.verbose(
            `File '${localRelativeFilePath}' ` +
            `forwarding to '${globalRelativeFilePath}${suffix}'.`)
        } else {
          log.info(
            `'${localRelativeFilePath}.cmd' -> '${fromFilePath}'`)
          log.info(
            `'${localRelativeFilePath}' -> '${fromFilePath}'`)
        }
      }
    } else {
      // Delete any existing link or file/folder.
      await del(toFilePath, { force: true })

      await fsPromises.symlink(fromRelativePath, toFilePath, 'file')
      if (log.isVerbose()) {
        log.verbose(
          `File '${localRelativeFilePath}' ` +
          `linked to '${fromRelativePath}'.`)
      } else {
        log.info(
          `'${localRelativeFilePath}' -> '${fromRelativePath}'`)
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
  async collectDependencies ({
    json,
    dependencies,
    isDev = false,
    outputMap
  }) {
    assert(json)

    const log = this.log
    log.trace(
      `${this.constructor.name}.collectDependencies(${json.name},${isDev})`)

    if (dependencies) {
      const collectDependencyPromises = []
      for (const [key, value] of Object.entries(dependencies)) {
        collectDependencyPromises.push(
          this.collectDependency({ key, value, isDev, outputMap }))
      }
      await Promise.all(collectDependencyPromises)
    }
  }

  async collectDependency ({
    key,
    value,
    isDev,
    outputMap
  }) {
    const log = this.log

    const context = this.context
    // const config = context.config

    const cacheFolderPath = context.globalConfig.cacheFolderPath

    let pack
    if (value.match(/^[a-zA-Z]+:/)) {
      // If an URL, keep it as is.
      pack = value
    } else {
      const version = value.replace(/^[^0-9]+/, '')
      pack = `${key}@${version}`
    }
    let manifest
    try {
      if (log.isVerbose()) {
        log.verbose(`Collecting dependencies from package ${pack}...`)
      }
      manifest = await pacote.manifest(pack, { cache: cacheFolderPath })
      if (!log.isVerbose()) {
        const fullName = `${manifest.name}@${manifest.version}`
        if (fullName && pack === fullName) {
          log.info(`+ ${pack}`)
        } else {
          log.info(`+ ${pack}: ${fullName}`)
        }
      }
    } catch (err) {
      log.verbose(err)
      throw new CliError(`Package '${pack}' not found`)
    }

    if (!outputMap[key]) {
      if (isDev) {
        manifest.isContributedByDevDependencies = true
      }
      outputMap[key] = manifest
      log.trace(`collectedDependencies[${key}]=${manifest.name}`)
    } else {
      const previousVersion = outputMap[key].version
      if (previousVersion !== manifest.version) {
        throw new CliError(
          `conflicting version ${previousVersion} also requested; ` +
          'mitigation not yet implemented')
      }
    }

    if (!isDev && manifest.dependencies) {
      // Recursively collect dependencies.
      await this.collectDependencies({
        json: manifest,
        dependencies: manifest.dependencies,
        outputMap
      })
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
  async addFolderLinkToGlobalRepo ({
    globalJson,
    manifestIds,
    globalPackagePath,
    buildFolderRelativePath
  }) {
    assert(globalJson)
    assert(manifestIds)
    assert(globalPackagePath)

    const log = this.log
    log.trace(`${this.constructor.name}.addFolderLinkToGlobalRepo()`)
    log.trace(`buildFolderRelativePath: ${buildFolderRelativePath}`)

    const context = this.context
    const config = context.config
    const xpack = this.xpack

    let linkPath
    if (xpack.isXpack(globalJson)) {
      const xpacksPath = path.join(config.cwd,
        buildFolderRelativePath || '',
        context.globalConfig.localXpacksFolderName)
      await makeDir(xpacksPath)
      linkPath = path.join(xpacksPath, manifestIds.getFolderName())
    } else {
      // If not an xPack, it must be a node module.
      const nodeModulesPath = path.join(config.cwd,
        buildFolderRelativePath || '',
        context.globalConfig.localNpmFolderName)
      await makeDir(nodeModulesPath)
      linkPath = path.join(nodeModulesPath, manifestIds.getFolderName())
    }

    log.trace(`linkPath ${linkPath}`)
    // Remove any previous link.
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
        log.trace(err)
        throw new CliError(`volume ${absPath.substring(0, 2)} ` +
          'does not support links, ' +
          'it might not be NTFS, or it might be a remote resource'
        )
      }
    } else {
      // In macOS and GNU/Linux, symbolic links are fine.
      await fsPromises.symlink(globalPackagePath, linkPath)
    }

    const folderPath = path.join((xpack.isXpack(globalJson)
      ? context.globalConfig.localXpacksFolderName
      : context.globalConfig.localNpmFolderName),
    manifestIds.getFolderName())

    if (log.isVerbose()) {
      log.verbose(`Folder '${folderPath}' ` +
        `linked to global '${manifestIds.getPath()}'.`)
    } else {
      log.info(`'${folderPath}' ` +
        `-> '${globalPackagePath}'`)
    }
  }

  async pacoteExtract ({
    packFullName,
    fromFolderPath,
    destinationFolderPath,
    cacheFolderPath,
    verboseMessage
  }) {
    assert(packFullName)
    assert(fromFolderPath)
    assert(destinationFolderPath)
    assert(cacheFolderPath)
    assert(verboseMessage)

    const context = this.context
    const config = context.config

    const log = this.log
    log.trace(`${this.constructor.name}.pacoteExtract(${fromFolderPath})`)

    if (log.isVerbose()) {
      log.verbose(verboseMessage)
    }

    try {
      if (!config.isDryRun) {
        log.trace(`pacote.extract(${fromFolderPath})`)
        await pacote.extract(fromFolderPath, destinationFolderPath,
          { cacheFolderPath })
      }
      if (!log.isVerbose()) {
        if (config.isDryRun) {
          log.info(`${packFullName} => '${destinationFolderPath}' (dry run)`)
        } else {
          log.info(`${packFullName} => '${destinationFolderPath}'`)
        }
      }
    } catch (err) {
      log.trace(err)
      throw new CliError(
        `Package ${packFullName} not found`)
    }
  }

  async pacoteExtractContentReadOnly ({
    packFullName,
    fromFolderPath,
    destinationFolderPath,
    cacheFolderPath,
    verboseMessage
  }) {
    assert(packFullName)
    assert(fromFolderPath)
    assert(destinationFolderPath)
    assert(cacheFolderPath)
    assert(verboseMessage)

    const log = this.log
    log.trace(
      `${this.constructor.name}.` +
      `pacoteExtractContentReadOnly('${fromFolderPath}')`)

    const context = this.context
    const config = context.config
    const xpack = this.xpack

    const destinationJson =
      await xpack.isFolderPackage(destinationFolderPath)
    if (destinationJson) {
      // The package is already present in the destination folder.
      if (!config.doForce) {
        if (!config.doSkipIfInstalled) {
          log.warn(`package ${packFullName} already installed, ` +
            'use --force to overwrite')
        }
        return // Not an error, proceed to other packages.
      }

      if (config.isDryRun) {
        log.verbose('Pretend changing permissions to read-write...')
        log.verbose('Pretend removing existing package from ' +
          `'${destinationFolderPath}'...`)
      } else {
        log.verbose('Changing permissions to read-write...')
        await FsUtils.chmodRecursive({
          inputPath: destinationFolderPath,
          readOnly: false,
          log
        })

        log.verbose(
          `Removing existing package from '${destinationFolderPath}'...`)
        await del(destinationFolderPath, { force: true })
      }
    }

    await this.pacoteExtract({
      packFullName,
      fromFolderPath,
      destinationFolderPath,
      cacheFolderPath,
      verboseMessage
    })

    if (config.isDryRun) {
      log.verbose('Pretend changing permissions to read-only...')
    } else {
      await xpack.downloadBinaries(destinationFolderPath, cacheFolderPath)

      log.verbose('Changing permissions to read-only...')
      await FsUtils.chmodRecursive({
        inputPath: destinationFolderPath,
        readOnly: true,
        log
      })
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
