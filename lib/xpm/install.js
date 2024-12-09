/*
 * This file is part of the xPack project (http://xpack.github.io).
 * Copyright (c) 2017 Liviu Ionescu. All rights reserved.
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
import assert from 'assert'
import fs from 'fs'
import path from 'path'
import os from 'os'
import util from 'util'

// ----------------------------------------------------------------------------

// https://www.npmjs.com/package/@npmcli/arborist
import { Arborist } from '@npmcli/arborist'

// https://www.npmjs.com/package/copy-file
import { copyFile } from 'copy-file'

// https://www.npmjs.com/package/del
import { deleteAsync } from 'del'

// https://www.npmjs.com/package/make-dir
import { makeDirectory } from 'make-dir'

// https://www.npmjs.com/package/pacote
import pacote from 'pacote'

// https://www.npmjs.com/package/semver
import semver from 'semver'

// ----------------------------------------------------------------------------

// ES6: `import { CliCommand, CliExitCodes, CliError } from 'cli-start-options'
import cliStartOptionsCsj from '@ilg/cli-start-options'

// https://www.npmjs.com/package/cmd-shim
// const cmdShim = require('cmd-shim')

// Needed for the patch to generate absolute paths.
// https://www.npmjs.com/@xpack/cmd-shim
import cmdShim from '@xpack/cmd-shim'

// https://www.npmjs.com/package/@xpack/xpm-liquid
import { XpmLiquid } from '@xpack/xpm-liquid'

// ----------------------------------------------------------------------------

import { FsUtils } from '../utils/fs-utils.js'

import { GlobalConfig } from '../utils/global-config.js'
import { ManifestIds, Xpack } from '../utils/xpack.js'
import { Policies } from '../utils/policies.js'
import { Spawn } from '../../lib/utils/spawn.js'

import { isString, isObject } from '../../lib/utils/functions.js'

// ----------------------------------------------------------------------------

const { CliCommand, CliExitCodes, CliError, CliErrorInput } = cliStartOptionsCsj
const fsPromises = fs.promises

// Shims with paths relative to local xpacks fail in subtle ways, for example
// arm-none-eabi-g++ cannot find <bits/c++-allocator.h>.
const useAbsolutePathsWindows = true

// ============================================================================

export class Install extends CliCommand {
  // --------------------------------------------------------------------------

  /**
   * @summary Constructor, to set help definitions.
   *
   * @param {Object} context Reference to a context.
   */
  constructor (context) {
    super(context)

    // Title displayed with the help message.
    this.title = 'xPack project manager - install package(s)'
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
          // {
          //   options: ['-sy', '--system'],
          //   init: ({ config }) => {
          //     config.isSystem = false
          //   },
          //   action: ({ config }) => {
          //     config.isSystem = true
          //   },
          //   msg: 'Install the package in a system folder',
          //   isOptional: true
          // },
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
            options: ['-32', '--force-32bit'],
            init: ({ config }) => {
              config.doForce32bit = false
            },
            action: ({ config }) => {
              config.doForce32bit = true
            },
            msg: 'Force install 32-bit binaries',
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
            options: ['-a', '--all-configs'],
            init: ({ config }) => {
              config.isAllConfigs = false
            },
            action: ({ config }) => {
              config.isAllConfigs = true
            },
            msg: 'Install dependencies for all configurations',
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
          },
          {
            options: ['--copy'],
            init: ({ config }) => {
              config.doCopy = false
            },
            action: ({ config }) => {
              config.doCopy = true
            },
            msg: 'Copy locally, do not link to central store',
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
   * to be invoked in an xpm package folder and install the dependencies and
   * devDependencies.
   * 2. If there are command line package names, the command will install
   * the referred packages, either globally or locally, possibly inside
   * an xpm package, followed by adding the package in the dependencies.
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

    // Do **not** default to file links on Windows, they are broken,
    // DLLs are not loaded from original location.
    context.hasFileSymLink = false

    // The current folder may not be an xpm package or even a package at all.
    this.xpack = new Xpack(config.cwd, context)
    const xpack = this.xpack

    try {
      this.packageJson = await xpack.readPackageJson()
    } catch (err) {
      // This happens when not installing in an existing package,
      // but in a folder.
      this.packageJson = null
      this.packageJsonWithInheritance = null
    }

    if (this.packageJson) {
      this.packageJsonWithInheritance = xpack.processInheritance()
    }

    const packageJson = this.packageJsonWithInheritance

    if (packageJson && !xpack.isXpack() &&
      !config.isGlobal && !config.isSystem) {
      throw new CliErrorInput(
        'current folder not an xpm package, ' +
        'check for the "xpack" property in package.json')
    }

    const minVersion = await xpack.checkMinimumXpmRequired(packageJson)
    this.policies = new Policies(minVersion, context)

    // Symbolic links to files do not work on Windows,
    // `make` fails when starting executables via links.
    context.hasFileSysLink = false
    // Links to folders generally work if configured as 'junctions'.
    // True symbolic links work only in Developer mode, so they
    // are not very useful.
    context.hasDirSysLink = false

    this.issueShareNpmDependenciesWarning = false

    if (args.length === 0) {
      // When no package names are passed.
      await this.installAllDependencies()
    } else {
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
    }

    if (this.policies.shareNpmDependencies &&
      this.issueShareNpmDependenciesWarning) {
      log.warn('sharing dependencies with npm is now deprecated, ' +
        'update package.json;')
      log.warn('for details, see https://xpack.github.io/xpm/policies/0001/ ')
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
      log.trace(util.inspect(err))
      throw new CliErrorInput(`Package '${pack}' not found`)
    }

    const manifestIds = new ManifestIds(manifest, this.policies)
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

    if (config.doCopy) {
      log.warn('global installs always copy content to the central ' +
        'store, no need for --copy')
    }

    // Global install.
    await this.pacoteExtractPackage({
      packFullName: manifestIds.getFullName(),
      manifestFrom: manifestIds.getPacoteFrom(),
      destinationFolderPath: globalPackagePath,
      cacheFolderPath,
      setReadOnly: true,
      verboseMessage:
        `Installing globally in '${globalPackagePath}'...`
    })
  }

  /**
   * @summary Install inside an existing xpm package.
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
    const packageJson = this.packageJsonWithInheritance

    const packFullName = manifestIds.getFullName()
    log.trace(`${packFullName}`)

    let globalJson = await xpack.isFolderPackage(globalPackagePath)
    if (!globalJson || config.doForce) {
      if (config.isDryRun) {
        log.verbose(`Pretend adding to central store '${globalPackagePath}'...`)
        return
      }

      // The package is not present in the central store, add it there.
      await this.pacoteExtractPackage({
        packFullName,
        manifestFrom: manifestIds.getPacoteFrom(),
        destinationFolderPath: globalPackagePath,
        cacheFolderPath,
        setReadOnly: true,
        verboseMessage:
          `Adding to central store '${globalPackagePath}'...`
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
      let liquidMap
      try {
        liquidMap = liquidEngine.prepareMap(packageJson,
          config.configurationName)
      } catch (err) {
        log.trace(util.inspect(err))
        throw new CliError(err.message)
      }

      buildFolderRelativePath = await xpack.computeBuildFolderRelativePath({
        liquidEngine,
        liquidMap,
        configuration,
        configurationName: config.configurationName
      })
    }

    // Install in the local package or configuration folder.
    const xpacksPath = path.join(config.cwd,
      buildFolderRelativePath || '',
      context.globalConfig.localXpacksFolderName)

    const localPackagePath = path.join(xpacksPath,
      manifestIds.getFolderName())

    log.debug(`local path: ${localPackagePath}`)

    const destJson = await xpack.isFolderPackage(localPackagePath)
    if (destJson) {
      // Destination looks like an existing package, be careful.
      if (config.doForce) {
        log.verbose(`Removing existing package from '${localPackagePath}'...`)
        await deleteAsync(localPackagePath, { force: true })
      } else {
        log.warn(`package ${packFullName} already installed; ` +
          'use --force to overwrite')
        // TODO: decide if there should be an error or success.
        return // CliExitCodes.ERROR.OUTPUT
      }
    } else {
      // Destination is not an xpm package, may be a custom folder,
      // or even a file.
      try {
        const stat = await fsPromises.stat(localPackagePath)
        const kind = stat.isDirectory ? 'folder' : 'file'

        if (config.doForce) {
          log.verbose(`Removing existing ${kind} '${localPackagePath}'...`)
          await deleteAsync(localPackagePath, { force: true })
        } else {
          log.warn(`${kind} '${packFullName}' already installed; ` +
            'use --force to overwrite')
          // TODO: decide if there should be an error or success.
          return // CliExitCodes.ERROR.OUTPUT
        }
      } catch (err) {
        await deleteAsync(localPackagePath, { force: true })
      }
    }

    if (config.doCopy) {
      await this.pacoteExtractPackage({
        packFullName,
        manifestFrom: manifestIds.getPacoteFrom(),
        destinationFolderPath: localPackagePath,
        cacheFolderPath,
        setReadOnly: false,
        verboseMessage:
          // TODO: make relative to project?!
          `Copying to local folder '${localPackagePath}'...`
      })
    } else {
      await this.addFolderLinkToGlobalRepo({
        globalJson,
        manifestIds,
        globalPackagePath,
        buildFolderRelativePath
      })
    }
    // Process binaries and dependencies.

    let destinationDependencies

    if (xpack.isXpack(globalJson)) {
      // xPack

      // const xpacksPath = path.join(config.cwd,
      //   context.globalConfig.localXpacksFolderName)

      if (xpack.isBinaryXpack(globalJson)) {
        // Add links to executables listed in xpack/bin
        await this.addDotBinLinks({
          // Since Nov. 2024, `executables` is preferred to `bin`.
          executables: globalJson.xpack.executables ?? globalJson.xpack.bin,
          fromFolderPath: globalPackagePath,
          localFolderName: manifestIds.getFolderName(),
          globalFolderRelativePath: manifestIds.getPath(),
          destFolderPath: xpacksPath,
          buildFolderRelativePath
        })
        // By default, binary xpm packages go to devDependencies.
        destinationDependencies = 'devDependencies'
      } else {
        // By default, source xpm packages go to dependencies.
        destinationDependencies = 'dependencies'
      }
    } else {
      // If not xpm package, it must be a node module.

      if (!this.policies.shareNpmDependencies) {
        throw new CliError(`${pack} is not an xpm package, ` +
          'use npm to install it')
      }

      // The shareNpmDependencies case.
      if (buildFolderRelativePath) {
        throw new CliError('npm dependencies not supported in --config')
      }

      const nodeModulesPath = path.join(config.cwd,
        context.globalConfig.localNpmFolderName)

      if (xpack.isBinaryNodeModule(globalJson)) {
        await this.addDotBinLinks({
          executables: globalJson.bin,
          fromFolderPath: globalPackagePath,
          localFolderName: manifestIds.getFolderName(),
          globalFolderRelativePath: manifestIds.getPath(),
          destFolderPath: nodeModulesPath,
          buildFolderRelativePath
        })
      }
      // By default, all npm packages go to `devDependencies`, to avoid
      // `xpm install` pulling all their dependencies.
      destinationDependencies = 'devDependencies'
    }

    this.addDependencyToPackageJson({
      manifest,
      manifestIds,
      defaultDestination: destinationDependencies,
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
        log.verbose(`Pretend adding to central store '${globalPackagePath}'...`)
        return
      }

      // The package is not present in the central store, add it there.
      await this.pacoteExtractPackage({
        packFullName,
        manifestFrom: manifestIds.getPacoteFrom(),
        destinationFolderPath: globalPackagePath,
        cacheFolderPath,
        setReadOnly: true,
        verboseMessage:
          `Adding to central store '${globalPackagePath}'...`
      })

      globalJson = await xpack.isFolderPackage(globalPackagePath)
    }

    if (config.isDryRun) {
      log.info('Dry run...')
      return
    }

    if (xpack.isBinaryXpack(globalJson)) {
      throw new CliError(
        'binary xpm package installed globally, next time use --global')
    }

    // Install in the current folder
    const localPackagePath = path.join(config.cwd, manifestIds.getFolderName())
    log.debug(`local path ${localPackagePath}`)

    try {
      // Avoid overriding an existing folder.
      await fsPromises.stat(localPackagePath)

      if (config.doForce) {
        log.verbose(`Removing existing package from '${localPackagePath}'...`)
        await deleteAsync(localPackagePath, { force: true })
      } else {
        throw CliError(`package ${packFullName} already installed, ` +
          'use --force to overwrite',
        CliExitCodes.ERROR.OUTPUT)
      }
    } catch (err) {
      // Not present, no danger.
    }

    const localPackageTmpPath = localPackagePath + '.tmp'

    log.trace(`del(${localPackageTmpPath})`)
    await deleteAsync(localPackageTmpPath, { force: true })

    // Extract a local copy here too.
    await this.pacoteExtract({
      packFullName,
      manifestFrom: manifestIds.getPacoteFrom(),
      destinationFolderPath: localPackagePath,
      destinationTmpFolderPath: localPackageTmpPath,
      cacheFolderPath,
      verboseMessage:
        `Installing standalone package in '${localPackagePath}'...`
    })

    // When everything is ready, rename the folder to the desired name.
    await fsPromises.rename(localPackageTmpPath, localPackagePath)
    log.trace(`rename(${localPackageTmpPath}, ${localPackagePath})`)

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

    if (manifest._from.match(/^git[+][a-zA-Z]+:/) ||
        manifest._from.match(/^[a-zA-Z]+:/)) {
      // If an URL, keep it as is.
      return manifest._from
    }

    // Checking '-' identifies binaries which use pre-release;
    // they all should be referred with exact versions.
    return (config.doSaveExact || manifest.version.includes('-'))
      ? manifest.version
      : `^${manifest.version}`
  }

  // Add dependencies to xpack.dependencies or xpack.devDependencies
  // For older projects, add to npm dependencies.
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
      // Add to `dependencies` or `devDependencies`.
      const dependencyDestination =
        this.computeDependencyDestination(defaultDestination)
      if (dependencyDestination) {
        const depName = manifestIds.getScopedName()
        const depValueString = this.computeDependencyValue({ manifest })

        let depValue
        if (this.policies.onlyStringDependencies) {
          depValue = depValueString
          if (config.doCopy) {
            log.warn('package.json minimumXpmRequired does not support ' +
              `copied '${depName}' dependency`)
          }
        } else {
          depValue = {
            specifier: depValueString,
            local: config.doCopy ? 'copy' : 'link',
            platforms: 'all'
          }
        }

        // Decide where to add the new dependency, configuration vs project.
        let target
        if (configurationName) {
          // Prefer `buildConfigurations`, but also accept `configurations`.
          if (packageJson.xpack.buildConfigurations) {
            target = packageJson.xpack.buildConfigurations[configurationName]
          } else if (packageJson.xpack.configurations) {
            // TODO: Legacy, remove it at some point.
            target = packageJson.xpack.configurations[configurationName]
          } else {
            assert(packageJson.xpack.buildConfigurations[configurationName])
          }
        } else {
          if (this.policies.shareNpmDependencies) {
            target = packageJson
          } else {
            // Starting with 0.14.x, dependencies are below xpack.
            target = packageJson.xpack
          }
        }

        ['dependencies', 'devDependencies', 'optionalDependencies'].forEach(
          (dependency) => {
            if (Object.prototype.hasOwnProperty.call(
              target, dependency)) {
              if (Object.prototype.hasOwnProperty.call(
                target[dependency], depName)) {
                if (configurationName) {
                  log.verbose(`Removing '${depName}' from ` +
                  `'${configurationName}/${dependency}'`)
                } else {
                  log.verbose(`Removing '${depName}' from ` +
                  `'${dependency}'`)
                }
                delete target[dependency][depName]
              }
            }
          })

        if (configurationName) {
          log.verbose(`Adding '${manifestIds.getScopedName()}' to ` +
            `'${configurationName}/${dependencyDestination}'...`)
        } else {
          log.verbose(`Adding '${manifestIds.getScopedName()}' to ` +
            `'${dependencyDestination}'...`)
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
    const packageJson = this.packageJsonWithInheritance

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

      if (config.isAllConfigs) {
        log.warn('option --all-configs ignored')
      }

      const configuration = xpack.retrieveConfiguration({
        packageJson,
        configurationName: config.configurationName
      })

      const { collectedDependenciesMap, buildFolderRelativePath } =
        await this.collectConfigurationDependencies({
          configurationName: config.configurationName,
          configuration
        })

      await this.downloadAndProcessDependencies({
        collectedDependenciesMap,
        buildFolderRelativePath
      })
    } else {
      if (config.isDryRun) {
        log.verbose('Pretend installing npm dependencies...')
      } else {
        if (this.policies.shareNpmDependencies &&
          (packageJson.dependencies || packageJson.devDependencies)) {
          log.verbose()
          log.verbose('Installing npm dependencies...')
          const spawn = new Spawn()
          // https://docs.npmjs.com/cli/v8/commands/npm-install
          // With `--production`, npm will not install modules listed
          // in devDependencies.
          let cmd = 'npm install --color=false' +
            ' --no-audit --no-fund --no-save'
          if (log.isVerbose()) {
            log.verbose(`> ${cmd}`)
          } else {
            cmd += ' --quiet'
            log.trace(`> ${cmd}`)
          }
          // const code = await spawn.executeShellPromise(
          let result
          try {
            result = await spawn.spawnShellPromise(
              cmd,
              {
                cwd: config.cwd,
                log
              })
          } catch (err) {
            log.verbose(err)
            throw new CliError(
              'install dependencies failed (npm returned error)')
          }
          const code = result.code
          if (code !== 0) {
            throw new CliError(
              `install dependencies failed (npm returned ${code})`)
          }
        }
      }

      // Process the top package and all configurations

      const { collectedDependenciesMap } =
        await this.collectPackageDependencies()

      await this.downloadAndProcessDependencies({
        collectedDependenciesMap
      })

      if (config.isAllConfigs) {
        const enumerateConfigurations = async (from) => {
          for (const [configurationName, configuration] of
            Object.entries(from)) {
            if (configuration.hidden) {
              // Ignore hidden configurations.
            } else {
              if ((configuration.dependencies &&
                Object.keys(configuration.dependencies).length) ||
                (configuration.devDependencies &&
                  Object.keys(configuration.devDependencies).length) ||
                log.isVerbose()) {
                if (!log.isVerbose()) {
                  log.info()
                }

                const { collectedDependenciesMap, buildFolderRelativePath } =
                  await this.collectConfigurationDependencies({
                    configurationName,
                    configuration
                  })

                await this.downloadAndProcessDependencies({
                  collectedDependenciesMap,
                  buildFolderRelativePath
                })
              }
            }
          }
        }

        if (packageJson.xpack.buildConfigurations) {
          await enumerateConfigurations(packageJson.xpack.buildConfigurations)
        }
        // TODO: Legacy, remove it at some point.
        if (packageJson.xpack.configurations) {
          await enumerateConfigurations(packageJson.xpack.configurations)
        }
      }
    }
  }

  async collectPackageDependencies () {
    const log = this.log
    const packageJson = this.packageJsonWithInheritance

    if (log.isVerbose()) {
      log.verbose()
      log.verbose(
        `Collecting dependencies for package ${packageJson.name}...`)
    } else {
      log.info(`${packageJson.name}...`)
    }

    const collectedDependenciesMap = {}

    const from = this.policies.shareNpmDependencies
      ? packageJson
      : packageJson.xpack
    await this.collectDependencies({
      json: packageJson,
      dependencies: from.dependencies,
      outputMap: collectedDependenciesMap
    })
    log.trace('Collecting devDependencies...')
    await this.collectDependencies({
      json: packageJson,
      dependencies: from.devDependencies,
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
    const packageJson = this.packageJsonWithInheritance

    const collectedDependenciesMap = {}

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
      configurationName,
      dependencies: configuration.dependencies,
      outputMap: collectedDependenciesMap
    })
    log.trace('Collecting devDependencies...')
    await this.collectDependencies({
      json: packageJson,
      configurationName,
      dependencies: configuration.devDependencies,
      isDev: true,
      outputMap: collectedDependenciesMap
    })

    return {
      collectedDependenciesMap,
      buildFolderRelativePath
    }
  }

  async downloadAndProcessDependencies ({
    collectedDependenciesMap,
    buildFolderRelativePath
  }) {
    const log = this.log

    const manifestsArray = Object.values(collectedDependenciesMap)
    if (manifestsArray.length) {
      log.verbose()
      log.verbose(`Installing ${manifestsArray.length} dependencies...`)

      const installDependencyPromisesArray = []
      for (const manifest of manifestsArray) {
        installDependencyPromisesArray.push(
          this.downloadAndProcessOneDependency({
            manifest,
            buildFolderRelativePath
          })
        )
      }

      const responses = await Promise.all(installDependencyPromisesArray)
      responses.forEach((value) => {
        log.trace(value)
      })
    } else {
      log.verbose('None')
    }
  }

  // Will be executed in parallel via `Promise.all()`.
  // Returns a debug code.
  async downloadAndProcessOneDependency ({
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

    const manifestIds = new ManifestIds(manifest, this.policies)
    const globalPackagePath = path.join(
      context.globalConfig.globalFolderPath,
      manifestIds.getPath())

    const packFullName = manifestIds.getFullName()
    log.trace(`${packFullName}`)

    let verboseMessage

    // log.trace(`${globalPackagePath}`)
    let globalJson = await xpack.isFolderPackage(globalPackagePath)
    if (!globalJson) {
      // The package does not exist in the central storage.
      if (config.isDryRun) {
        verboseMessage = `Pretend adding '${packFullName}' to ` +
          `central store as '${globalPackagePath}'...`
      } else {
        verboseMessage = `Adding '${packFullName}' to ` +
          `central store as '${globalPackagePath}'...`
      }

      await this.pacoteExtractPackage({
        packFullName,
        manifestFrom: manifestIds.getPacoteFrom(),
        destinationFolderPath: globalPackagePath,
        cacheFolderPath,
        setReadOnly: true,
        verboseMessage
      })

      globalJson = await xpack.isFolderPackage(globalPackagePath)
    }

    if (!globalJson.xpack) {
      if (log.isVerbose()) {
        log.verbose(`Package '${packFullName}'` +
          ' already installed by npm')
      } else {
        log.trace(`'${packFullName}' not an xpm package,` +
          ' already installed by npm')
      }
      return 1 // npm packages end here.
    }

    // log.trace(util.inspect(globalJson))

    // Link to package or configuration folder.

    if (config.isDryRun) {
      const folderPath = path.join(
        context.globalConfig.localXpacksFolderName,
        manifestIds.getFolderName())

      if (log.isVerbose()) {
        log.verbose(`Pretend folder '${folderPath}' is ` +
          `linked to global '${manifestIds.getPath()}'...`)
      } else {
        log.info(`'${folderPath}' ` +
          `-> '${globalPackagePath}' (dry run)`)
      }

      return 2 // Dry runs end here.
    }

    this.issueShareNpmDependenciesWarning = true

    // Add links to the central storage and for binaries.
    const xpacksPath = path.join(config.cwd,
      buildFolderRelativePath || '',
      context.globalConfig.localXpacksFolderName)

    const localPackagePath = path.join(xpacksPath,
      manifestIds.getFolderName())

    // For now install only devDependencies.
    // TODO: decide what happens to dependencies.
    if (globalJson.xpack || manifest.isContributedByDevDependencies) {
      if (manifest.xpmDependencyKind === 'copy') {
        log.trace(`deleteAsync(${localPackagePath})`)
        await deleteAsync(localPackagePath, { force: true })
        await this.pacoteExtractPackage({
          packFullName,
          manifestFrom: manifestIds.getPacoteFrom(),
          destinationFolderPath: localPackagePath,
          cacheFolderPath,
          setReadOnly: false,
          verboseMessage:
            // TODO: make relative to project?!
            `Copying to local folder '${localPackagePath}'...`
        })
      } else {
        await this.addFolderLinkToGlobalRepo({
          globalJson,
          manifestIds,
          globalPackagePath,
          buildFolderRelativePath
        })
      }

      try {
        // xPack
        if (xpack.isBinaryXpack(globalJson)) {
          await this.addDotBinLinks({
            // Since Nov. 2024, `executables` is preferred to `bin`.
            executables: globalJson.xpack.executables ?? globalJson.xpack.bin,
            fromFolderPath: globalPackagePath,
            localFolderName: manifestIds.getFolderName(),
            globalFolderRelativePath: manifestIds.getPath(),
            destFolderPath: xpacksPath,
            buildFolderRelativePath
          })
        }
      } catch (err) {
        if (err.code !== 'EEXIST') {
          log.trace(util.inspect(err))
          throw new CliError(err)
        }
      }
    }

    return 3 // Normal
  }

  async addDotBinLinks ({
    executables,
    fromFolderPath,
    localFolderName,
    globalFolderRelativePath,
    destFolderPath,
    buildFolderRelativePath
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
      `globalFolderRelativePath: ${globalFolderRelativePath}, ` +
      `buildFolderRelativePath: ${buildFolderRelativePath})`)

    const context = this.context
    // const config = context.config

    // Either xpacks or node_modules
    const localGroupFolderName = path.basename(destFolderPath)

    const dotBin = context.globalConfig.dotBin
    const binFolderPath = path.join(destFolderPath, dotBin)

    // Create the .bin folder
    await makeDirectory(binFolderPath)

    for (const [key, value] of Object.entries(executables)) {
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

          // #206 - it ignores names like ld.gold.
          // const parts = path.parse(fromFilePath)
          // if (parts.ext) {
          //   // If the path has an explicit extension, and it was not found,
          //   // the file is definitely not there.
          //   continue
          // }

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
        let fromRelativePath
        if (os.platform() === 'win32') {
          // On Windows the shims use paths relative to the project
          // or build folder.
          fromRelativePath = path.join(
            context.globalConfig.localXpacksFolderName,
            localFolderName,
            valueFileRelativePath) + suffix
        } else {
          // On Unix symbolic links are relative to the .bin folder.
          fromRelativePath = path.join(
            '..',
            localFolderName,
            valueFileRelativePath)
        }

        await this.addLinkToExecutable({
          fromFilePath,
          toFilePath,
          suffix,
          localRelativeFilePath,
          globalRelativeFilePath,
          fromRelativePath,
          buildFolderRelativePath
        })
      } else {
        // Currently not used.
        // Delete any existing link or file/folder.
        await deleteAsync(toFilePath, { force: true })

        await copyFile(fromFilePath, toFilePath, { overwrite: true })
        if (log.isVerbose()) {
          log.verbose(
            `File '${localRelativeFilePath}' ` +
            `copied from '${globalRelativeFilePath}'`)
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
    fromRelativePath,
    buildFolderRelativePath
  }) {
    assert(fromFilePath)
    assert(toFilePath)
    assert(localRelativeFilePath)
    assert(globalRelativeFilePath)
    assert(fromRelativePath)

    const log = this.log
    log.trace(`${this.constructor.name}.addLinkToExecutable(` +
      `fromFilePath: ${fromFilePath}, ` +
      `fromRelativePath: ${fromRelativePath}, ` +
      `toFilePath: ${toFilePath}, ` +
      `localRelativeFilePath: ${localRelativeFilePath}, ` +
      `globalRelativeFilePath: ${globalRelativeFilePath}, ` +
      `buildFolderRelativePath: ${buildFolderRelativePath})`)

    const context = this.context

    if (os.platform() === 'win32') {
      // Remove all possible links or shims.
      await deleteAsync(`${toFilePath}${suffix}`, { force: true })
      await deleteAsync(`${toFilePath}.cmd`, { force: true })
      await deleteAsync(`${toFilePath}.ps1`, { force: true })
      await deleteAsync(toFilePath, { force: true })
      if (context.hasFileSymLink) {
        // The first choice, but works only if Developer Mode is enabled.
        log.trace(`symlink('${fromFilePath}', '${toFilePath}${suffix}')`)
        try {
          await fsPromises.symlink(fromFilePath,
            `${toFilePath}${suffix}`, 'file')
          if (log.isVerbose()) {
            log.verbose(
              `File '${localRelativeFilePath}${suffix}' ` +
              `linked to global '${globalRelativeFilePath}${suffix}'`)
          } else {
            log.info(
              `'${localRelativeFilePath}${suffix}' -> '${fromFilePath}'`)
          }
        } catch (err) {
          log.warn('Developer Mode not enabled, using .cmd shims.')
          context.hasFileSymLink = false
        }
      }
      if (!context.hasFileSymLink) {
        if (useAbsolutePathsWindows) {
          log.trace(`cmdShim('${fromFilePath}', '${toFilePath}')`)
          await cmdShim(fromFilePath, toFilePath)
          if (log.isVerbose()) {
            log.verbose(
              `File '${localRelativeFilePath}.cmd' ` +
              `forwarding to '${globalRelativeFilePath}${suffix}'`)
            log.verbose(
              `File '${localRelativeFilePath}.ps1' ` +
              `forwarding to '${globalRelativeFilePath}${suffix}'`)
            log.verbose(
              `File '${localRelativeFilePath}' ` +
              `forwarding to '${globalRelativeFilePath}${suffix}'`)
          } else {
            log.info(
              `'${localRelativeFilePath}.cmd' -> '${fromFilePath}'`)
            log.info(
              `'${localRelativeFilePath}.ps1' -> '${fromFilePath}'`)
            log.info(
              `'${localRelativeFilePath}' -> '${fromFilePath}'`)
          }
        } else {
          // Create three files, a .cmd shim, a .ps1 shim and a shell script.
          if (buildFolderRelativePath) {
            const longPath =
              path.join(buildFolderRelativePath, fromRelativePath)
            log.trace(`cmdShim('${longPath}', '${toFilePath}')`)
            await cmdShim(longPath, toFilePath)
          } else {
            log.trace(`cmdShim('${fromRelativePath}', '${toFilePath}')`)
            await cmdShim(fromRelativePath, toFilePath)
          }
          if (log.isVerbose()) {
            log.verbose(
              `File '${localRelativeFilePath}.cmd' ` +
              `forwarding to '${globalRelativeFilePath}${suffix}'`)
            log.verbose(
              `File '${localRelativeFilePath}.ps1' ` +
              `forwarding to '${globalRelativeFilePath}${suffix}'`)
            log.verbose(
              `File '${localRelativeFilePath}' ` +
              `forwarding to '${globalRelativeFilePath}${suffix}'`)
          } else {
            log.info(
              `'${localRelativeFilePath}.cmd' -> '${fromRelativePath}'`)
            log.info(
              `'${localRelativeFilePath}.ps1' -> '${fromRelativePath}'`)
            log.info(
              `'${localRelativeFilePath}' -> '${fromRelativePath}'`)
          }
        }
      }
    } else { // Non-Windows.
      // Delete any existing link or file/folder.
      await deleteAsync(toFilePath, { force: true })

      await fsPromises.symlink(fromRelativePath, toFilePath, 'file')
      if (log.isVerbose()) {
        log.verbose(
          `File '${localRelativeFilePath}' ` +
          `linked to '${fromRelativePath}'`)
      } else {
        log.info(
          `'${localRelativeFilePath}' -> '${fromRelativePath}'`)
      }
    }
  }

  /**
   * @summary Collect package or configuration dependencies.
   * @param {*} json A package.json.
   * @param {String} configurationName An optional name.
   * @param {*} dependencies A map of dependencies.
   * @param {*} isDev True if part of devDependencies.
   * @returns {undefined} Nothing.
   *
   * @description
   * Iterate the package.json dependencies and devDependencies
   * and add those and their children.
   */
  async collectDependencies ({
    json,
    configurationName,
    dependencies,
    isDev = false,
    outputMap
  }) {
    assert(json)

    const log = this.log
    const context = this.context
    const config = context.config
    const xpack = this.xpack

    log.trace(
      `${this.constructor.name}.collectDependencies(${json.name},${isDev})`)
    // log.trace(util.inspect(json))

    if (dependencies) {
      log.trace(util.inspect(dependencies))
      const collectDependencyPromises = []
      for (const [key, value] of Object.entries(dependencies)) {
        if (configurationName) {
          // There can be no npm dependencies for configurations.
          collectDependencyPromises.push(
            this.collectDependency({ key, value, isDev, outputMap }))
        } else {
          if (this.policies.shareNpmDependencies) {
            const keyParts = key.split('/')
            const npmFolderPath = path.join(config.cwd,
              context.globalConfig.localNpmFolderName, ...keyParts)
            const npmJson = await xpack.isFolderPackage(npmFolderPath)
            if (xpack.isXpack(npmJson)) {
              collectDependencyPromises.push(
                this.collectDependency({ key, value, isDev, outputMap }))
            } else if (npmJson) {
              if (log.isVerbose()) {
                log.verbose(`Package '${key}@${npmJson.version}'` +
                  ` installed by npm in 'node_modules/${key}'`)
              } else {
                log.info(`+ ${key}@${npmJson.version} => 'node_modules/${key}'`)
              }
            }
          } else {
            collectDependencyPromises.push(
              this.collectDependency({ key, value, isDev, outputMap }))
          }
        }
      }
      await Promise.all(collectDependencyPromises)
    }
  }

  /**
   * @summary Collect a single dependency from a package.
   * @param {*} key A package specifier (usually a scoped name).
   * @param {*} value The semver string.
   * @param {*} isDev True if part of devDependencies.
   * @param {*} outputMap The map where to add the discovered dependencies.
   * @returns {undefined} Nothing.
   */
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

    let dependencyKind = 'link'
    let pack
    let dependency
    if (isString(value)) {
      dependency = { specifier: value, local: 'link', platforms: 'all' }
    } else if (isObject(value) && isString(value.specifier)) {
      dependency = value
    } else {
      log.warn(`dependency '${key}' has an unsupported content, ignored`)
      return
    }

    if (isString(dependency.local) &&
        ['link', 'copy'].includes(dependency.local)) {
      dependencyKind = dependency.local
    } else {
      log.warn(`dependency '${key}' has an unsupported 'local' ` +
      'property, ignored')
      return
    }

    try {
      const url = new URL(dependency.specifier)
      log.trace(`url: ${url}`)
      // If an URL, keep it as is.
      pack = dependency.specifier
    } catch (err) {
      // If not accepted by URL, it might be a registry scoped name,
      // but only if the specifier is a valid semver.
      const version = semver.valid(dependency.specifier.replace(/\s*[~^]/, ''))
      if (version !== null) {
        // Reconstruct the registry package reference.
        pack = `${key}@${version}`
        log.trace(`pack: ${pack}`)
      } else {
        // Complex syntax like `git+ssh://git@github.com:xpack/xpm-js.git`;
        // keep as is too.
        pack = dependency.specifier
      }
    }

    let manifest
    try {
      if (log.isVerbose()) {
        const actualDependency = isDev ? 'dev dependency' : 'dependency'
        log.verbose(`Identified ${pack} as a ${actualDependency}`)
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

    manifest.xpmDependencyKind = dependencyKind

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

    if (!isDev && manifest.dependencies &&
      this.policies.shareNpmDependencies) {
      // Recursively collect dependencies.
      await this.collectDependencies({
        json: manifest,
        dependencies: manifest.dependencies,
        outputMap
      })
    }
  }

  /**
   * @summary Add links to packages installed in the central store.
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
      await makeDirectory(xpacksPath)
      linkPath = path.join(xpacksPath, manifestIds.getFolderName())
    } else {
      // If not an xpm package, it must be a node module.
      const nodeModulesPath = path.join(config.cwd,
        buildFolderRelativePath || '',
        context.globalConfig.localNpmFolderName)
      await makeDirectory(nodeModulesPath)
      linkPath = path.join(nodeModulesPath, manifestIds.getFolderName())
    }

    log.trace(`linkPath ${linkPath}`)
    // Remove any previous link.
    await deleteAsync(linkPath, { force: true })

    // Be sure the folder is there.
    await makeDirectory(path.dirname(linkPath))

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
        log.trace(util.inspect(err))
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
        `linked to global '${manifestIds.getPath()}'`)
    } else {
      log.info(`'${folderPath}' ` +
        `-> '${globalPackagePath}'`)
    }
  }

  async pacoteExtract ({
    packFullName,
    manifestFrom,
    destinationFolderPath,
    destinationTmpFolderPath,
    cacheFolderPath,
    verboseMessage
  }) {
    assert(packFullName)
    assert(manifestFrom)
    assert(destinationFolderPath)
    assert(destinationTmpFolderPath)
    assert(cacheFolderPath)
    assert(verboseMessage)

    const context = this.context
    const config = context.config

    const log = this.log
    log.trace(`${this.constructor.name}.pacoteExtract(${manifestFrom})`)

    if (log.isVerbose() && verboseMessage) {
      log.verbose(verboseMessage)
    }

    try {
      if (!config.isDryRun) {
        log.trace(`pacote.extract(${manifestFrom})`)
        const fetchResult = await pacote.extract(
          manifestFrom,
          destinationTmpFolderPath,
          { cache: cacheFolderPath, Arborist })
        log.trace(`fetchResult: ${util.inspect(fetchResult)}`)
      }
      if (!log.isVerbose()) {
        if (config.isDryRun) {
          log.info(`${packFullName} => '${destinationFolderPath}' (dry run)`)
        } else {
          log.info(`${packFullName} => '${destinationFolderPath}'`)
        }
      }
    } catch (err) {
      log.trace(util.inspect(err))
      throw new CliError(`Package ${packFullName} not found`)
    }
  }

  async pacoteExtractPackage ({
    packFullName,
    manifestFrom,
    destinationFolderPath,
    cacheFolderPath,
    setReadOnly,
    verboseMessage
  }) {
    assert(packFullName)
    assert(manifestFrom)
    assert(destinationFolderPath)
    assert(cacheFolderPath)
    assert(verboseMessage)

    const log = this.log
    log.trace(
      `${this.constructor.name}.pacoteExtractContent('${manifestFrom}')`)

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

      if (setReadOnly) {
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
          await deleteAsync(destinationFolderPath, { force: true })
        }
      }
    }

    const destinationTmpFolderPath = destinationFolderPath + '.tmp'
    log.trace(`del(${destinationTmpFolderPath})`)
    await deleteAsync(destinationTmpFolderPath, { force: true })

    await this.pacoteExtract({
      packFullName,
      manifestFrom,
      destinationFolderPath,
      destinationTmpFolderPath,
      cacheFolderPath,
      verboseMessage
    })

    const json = await xpack.isFolderPackage(destinationTmpFolderPath)
    if (!json || !json.xpack) {
      if (!this.policies.shareNpmDependencies) {
        log.trace(`del(${destinationTmpFolderPath})`)
        await deleteAsync(destinationTmpFolderPath, { force: true })
        throw new CliError(
          `${packFullName} is not an xpm package, use npm to install it`)
      }
      log.debug(`'${destinationFolderPath}' doesn't look like an ` +
        'xpm package, package.json has no "xpack"')
      return
    }

    if (config.isDryRun) {
      if (setReadOnly) {
        log.verbose('Pretend changing permissions to read-only...')
      }
    } else {
      await xpack.downloadBinaries({
        packagePath: destinationFolderPath,
        packageTmpPath: destinationTmpFolderPath,
        cacheFolderPath
      })

      // When everything is ready, rename the folder to the desired name.
      await fsPromises.rename(destinationTmpFolderPath, destinationFolderPath)
      log.trace(`rename(${destinationTmpFolderPath}, ${destinationFolderPath})`)

      log.trace(`in '${destinationFolderPath}'`)
      if (setReadOnly) {
        log.verbose('Changing permissions to read-only...')
        await FsUtils.chmodRecursive({
          inputPath: destinationFolderPath,
          readOnly: true,
          log
        })
      }
    }
  }

  // --------------------------------------------------------------------------
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// The Install class is added as a property of this object.
// module.exports.Install = Install

// In ES6, it would be:
// export class Install { ... }
// ...
// import { Install } from 'install.js'

// ----------------------------------------------------------------------------
