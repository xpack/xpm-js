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

const assert = require('assert')
const fs = require('fs')
// const xml2js = require('xml2js')
const path = require('path')
const pacote = require('pacote')
// const semver = require('semver')
const os = require('os')

// https://www.npmjs.com/package/make-dir
const makeDir = require('make-dir')

// https://www.npmjs.com/package/del
const del = require('del')

// https://www.npmjs.com/package/cmd-shim
const cmdShim = require('../utils/cmd-shim.js')

// https://www.npmjs.com/package/cp-file
const cpFile = require('cp-file')

const GlobalConfig = require('../utils/global-config.js').GlobalConfig
const Xpack = require('../utils/xpack.js').Xpack
const ManifestId = require('../utils/xpack.js').ManifestId
const Spawn = require('../../lib/utils/spawn.js').Spawn

const Promisifier = require('@xpack/es6-promisifier').Promisifier

// ES6: `import { CliCommand, CliExitCodes, CliError } from 'cli-start-options'
const { CliCommand, CliExitCodes, CliUtils } =
  require('@ilg/cli-start-options')

// ----------------------------------------------------------------------------

// Promisify functions from the Node.js callbacks library.
// New functions have similar names, but suffixed with `Promise`.
Promisifier.promisifyInPlace(fs, 'symlink')
// Promisifier.promisifyInPlace(fs, 'link')
Promisifier.promisifyInPlace(fs, 'stat')

// For easy migration, inspire from the Node 10 experimental API.
// Do not use `fs.promises` yet, to avoid the warning.
const fsPromises = fs.promises_

// ----------------------------------------------------------------------------

const localXpacksFolderName = 'xpacks'

// ============================================================================

/**
 * @typedef {Object} Install
 * @property {GlobalConfig} globalConfig Global configuration properties.
 * @property {Xpack} xpack The object with xPack utilities.
 * @property {Object} packageJson The object parsed by xpack; may be null.
 */
class Install extends CliCommand {
  // --------------------------------------------------------------------------

  /**
   * @summary Constructor, to set help definitions.
   *
   * @param {Object} params The generic parameters object.
   */
  constructor (params) {
    super(params)

    this.cliOptions.addOptionsGroups(
      [
        {
          title: 'Install options',
          insertInFront: true,
          optionsDefs: [
            {
              options: ['-g', '--global'],
              init: ({ config }) => {
                config.isGlobal = false
              },
              action: ({ config }) => {
                config.isGlobal = true
              },
              message: 'Install the package globally in the home folder',
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
              message: 'Install the package in a system folder (not impl)',
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
              message: 'Force install over existing package',
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
              message: 'Copy locally, do not soft link',
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
              message: 'Pretend to install the package (not impl)',
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
              message: 'Save to dependencies; default unless -D or -O',
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
              message: 'Prevent saving to dependencies',
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
              message: 'Save to devDependencies',
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
              message: 'Save to optionalDependencies',
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
              message: 'Save to bundleDependencies',
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
              message: 'Save deps with exact version',
              isOptional: true
            }
          ]
        }
      ]
    )
  }

  /**
   * @summary Execute the `install` command.
   *
   * @param {string[]} argv Command line arguments.
   * @returns {Number|Promise} The process exit code.
   *
   * @override
   * @description
   * The command has two distinct modes.
   * 1. If there are no command line package names, the command is expected
   * to be invoked in an xPack folder and install the dependencies and
   * devDependencies.
   * 2. If there are command line package names, the command will install
   * the refered packages, either globally or locally, possibly inside
   * an xPack, followed by adding the package to the dependencies.
   */
  async doRun (argv) {
    const log = this.log
    log.trace(`${this.constructor.name}.doRun()`)

    const config = this.config

    log.info(this.helpTitle)
    log.info()

    // Extra options are not catched by CLI and must be checked/filtered here.
    argv.forEach((element) => {
      if (element.startsWith('-')) {
        log.warn(`'${element}' ignored`)
      }
    })
    argv = argv.filter((element) => {
      return !element.startsWith('-')
    })

    this.globalConfig = new GlobalConfig()

    // The current folder may not be an xPack or even a package at all.
    this.xpack = new Xpack({ xpackFolderAbsolutePath: config.cwd, log })

    try {
      this.packageJson = await this.xpack.readPackageJson()
    } catch (err) {
      // This happens when not installing in a package folder; not an error.
      this.packageJson = null
    }

    // By default, on Windows 'junctions' are created for linked folders.
    // When true symbolic links will work, this might be enabled.
    // this.hasWinSymLink = true

    let exitCode = CliExitCodes.SUCCESS

    if (argv.length > 0) {
      // Try to install all packages given as args.
      exitCode = await this.installPackages(argv)
    } else {
      // Called without args, try to install dependencies.
      exitCode = await this.installDependencies()
    }

    this.outputDoneDuration()
    return exitCode
  }

  /**
   * @summary Helper to explain what <key> means.
   *
   * @param {CliHelp} helper The helper object.
   * @param {Object} more Object used to handle the two pass processing.
   * @return {undefined}
   *
   * @override
   */
  doHelpWhere (helper, more) {
    assert(helper)

    if (!more.isFirstPass) {
      helper.output()
      helper.output('where:')
      helper.output(`${helper.padRight('  <pkg> is missing', more.width)} ` +
        '(only when in an xPack folder)')
      helper.output('or:')
      helper.output(`${helper.padRight('  <pkg> is one of', more.width)} ` +
        '[<@scope>/]<pkg>')
      helper.output(`${helper.padRight('', more.width)} ` +
        '[<@scope>/]<pkg>@<tag>')
      helper.output(`${helper.padRight('', more.width)} ` +
        '[<@scope>/]<pkg>@<version>')
      helper.output(`${helper.padRight('', more.width)} ` +
        '[<@scope>/]<pkg>@<version range>')
      helper.output(`${helper.padRight('', more.width)} ` +
        '<folder>')
      helper.output(`${helper.padRight('', more.width)} ` +
        '<tarball file>')
      helper.output(`${helper.padRight('', more.width)} ` +
        '<tarball url>')
      helper.output(`${helper.padRight('', more.width)} ` +
        '<git:// url>')
      helper.output(`${helper.padRight('', more.width)} ` +
        '<github username>/<github project>')
    }
  }

  // --------------------------------------------------------------------------

  /**
   * @summary Iterate args and install all packages.
   *
   * @param {String[]} argv Array of package specs.
   * @returns {Number|Promise} The process exit code.
   *
   * @description
   * If a package cannot be installed, the remaining are ignored.
   *
   * At the end, the package.json s updated, if needed.
   */
  async installPackages (argv) {
    const log = this.log
    log.trace(`${this.constructor.name}.installPackages()`)

    const config = this.config

    let exitCode = CliExitCodes.SUCCESS
    for (const arg of argv) {
      exitCode = await this.installPackage(arg)
      if (exitCode !== CliExitCodes.SUCCESS) {
        break
      }
    }

    await this.rewritePackageJson()

    if (config.isGlobal) {
      if (config.doSaveProd || config.doSaveDev || config.doSaveOptional ||
        config.doSaveExact || config.doSaveBundle) {
        log.warn('Save related option(s) ignored for global installs.')
      }
    } else {
      if (config.doSaveBundle) {
        log.warn('--save-bundle not yet implemented, ignored.')
      }
    }
    return exitCode
  }

  /**
   * @summary Install a single package, using pacote.
   *
   * @param {String} packSpec Packages specifier, as per pacote usage.
   * @returns {Number|Promise} The process exit code.
   *
   * @description
   * Packages can be installed in a global location, or in the local
   * folder, which may be an xPack or not.
   */
  async installPackage (packSpec) {
    const log = this.log
    log.trace(`${this.constructor.name}.installPackage('${packSpec}')`)

    const config = this.config

    const cachePath = this.globalConfig.cacheFolderPath
    let manifest
    try {
      manifest = await pacote.manifest(packSpec, { cache: cachePath })
      log.trace(manifest)
    } catch (err) {
      log.error(err.message)
      return CliExitCodes.ERROR.INPUT
    }

    const manifestId = new ManifestId(manifest)
    log.trace(manifestId)

    const globalPackagePath = path.join(
      this.globalConfig.globalFolderPath, manifestId.getPath())

    const packFullName = manifestId.getFullName()

    log.info(`Processing ${packFullName}...`)

    const localPackageJson = this.packageJson

    let exitCode = 0
    if (config.isSystem) {
      // System install.
      log.error('System install not yet implemented.')
      exitCode = CliExitCodes.ERROR.APPLICATION
    } else if (config.isGlobal) {
      // Global install.
      exitCode = await this.installPackageGlobally({
        packSpec,
        globalPackagePath,
        cachePath,
        manifestId
      })
    } else if (localPackageJson && localPackageJson.xpack) {
      // Local install.
      exitCode = await this.installPackageLocally({
        packSpec,
        globalPackagePath,
        cachePath,
        manifest,
        manifestId
      })
    } else {
      exitCode = await this.installPackageStandalone({
        packSpec,
        cachePath,
        manifestId
      })
    }

    return exitCode
  }

  async installInRepository (
    { packSpec, globalPackagePath, cachePath, manifestId }) {
    assert(packSpec)
    assert(globalPackagePath)
    assert(cachePath)
    assert(manifestId)

    const log = this.log

    await pacote.extract(packSpec, globalPackagePath, { cache: cachePath })
    log.debug(`npm ${packSpec} package extracted.`)

    await this.xpack.downloadBinaries(
      { packagePath: globalPackagePath, cachePath, manifestId })

    log.verbose(`Write protecting folder '${globalPackagePath}'...`)
    await this.xpack.changeModeWritableRecursive(
      { absolutePath: globalPackagePath, isWritable: false })
  }

  async installPackageGlobally (
    { packSpec, globalPackagePath, cachePath, manifestId }) {
    assert(packSpec)
    assert(globalPackagePath)
    assert(cachePath)
    assert(manifestId)

    const log = this.log
    log.trace(`${this.constructor.name}.installPackageGlobally('${packSpec}')`)

    const config = this.config

    // Global install.
    const globalPackageJson = await this.xpack.hasPackageJson(globalPackagePath)
    if (globalPackageJson) {
      if (config.doForce) {
        log.verbose(`Unprotecting folder '${globalPackagePath}'...`)
        await this.xpack.changeModeWritableRecursive(
          { absolutePath: globalPackagePath, isWritable: true })
        log.verbose(`Removing folder '${globalPackagePath}'...`)
        await del(globalPackagePath, { force: true })
      } else {
        log.warn('Package already installed. ' +
          'Use --force to overwrite.')
        return CliExitCodes.ERROR.OUTPUT
      }
    }

    log.info(`Installing globally in '${globalPackagePath}'...`)
    await this.installInRepository(
      { packSpec, globalPackagePath, cachePath, manifestId })

    return CliExitCodes.SUCCESS
  }

  async installPackageLocally (
    { packSpec, globalPackagePath, cachePath, manifest, manifestId }) {
    assert(packSpec)
    assert(globalPackagePath)
    assert(cachePath)
    assert(manifest)
    assert(manifestId)

    const log = this.log
    log.trace(`${this.constructor.name}.installPackageLocally('${packSpec}')`)

    const config = this.config

    let destPackagePath = config.cwd

    // We are in an xPack folder, group all below `xpacks`
    log.trace('inside an xPack folder')
    destPackagePath = path.join(destPackagePath, localXpacksFolderName,
      manifestId.getFolderName())
    log.debug(`dest path ${destPackagePath}`)

    let destPackageJson = await this.xpack.hasPackageJson(destPackagePath)
    if (destPackageJson) {
      // Destination folder has a package.json, so it looks like an
      // existing package; be careful.
      if (config.doForce) {
        log.verbose(`Removing folder '${destPackagePath}'...`)
        await del(destPackagePath, { force: true })
        destPackageJson = null
      } else {
        log.warn('Package already installed. ' +
          'Use --force to overwrite.')
        return CliExitCodes.ERROR.OUTPUT
      }
    } else {
      log.debug('dest not a package or folder not existent')
    }

    const subFolderName = path.posix.join(
      localXpacksFolderName, manifestId.getFolderName())
    if (config.doCopy) {
      log.info(`Copying locally as '${subFolderName}'...`)
      await pacote.extract(packSpec, destPackagePath,
        { cachePath })
    } else {
      // When linking, install first in the repository, if not already there.
      const globalJson = await this.xpack.hasPackageJson(globalPackagePath)
      if (!globalJson) {
        log.verbose(`Adding to repository '${globalPackagePath}'...`)
        await this.installInRepository(
          { packSpec, globalPackagePath, cachePath, manifestId })
      } else {
        log.verbose(`Package already in '${globalPackagePath}'.`)
      }

      log.info(`Linking locally as '${subFolderName}'...`)
      await CliUtils.createFolderLink({
        linkPath: destPackagePath,
        sourcePath: globalPackagePath,
        hasWinSymLink: this.hasWinSymLink
      })
    }
    this.addDependency({ packSpec, manifest, manifestId })

    return CliExitCodes.SUCCESS
  }

  async installPackageStandalone ({ packSpec, cachePath, manifestId }) {
    assert(packSpec)
    assert(cachePath)
    assert(manifestId)

    const log = this.log
    log.trace(
      `${this.constructor.name}.installPackageStandalone('${packSpec}')`)

    const config = this.config

    let destPackagePath = config.cwd

    destPackagePath = path.join(destPackagePath,
      manifestId.getFolderName())

    let destPackageJson = await this.xpack.hasPackageJson(destPackagePath)
    if (destPackageJson) {
      // Destination folder has a package.json, so it looks like an
      // existing package; be careful.
      if (config.doForce) {
        log.verbose(`Removing folder '${destPackagePath}'...`)
        await del(destPackagePath, { force: true })
        destPackageJson = null
      } else {
        log.warn('Package already installed. ' +
            'Use --force to overwrite.')
        return CliExitCodes.ERROR.OUTPUT
      }
    } else {
      log.debug('dest is not a package or the folder does not exist')
    }

    log.info(`Installing standalone package in '${destPackagePath}'...`)
    await pacote.extract(packSpec, destPackagePath,
      { cachePath })

    return CliExitCodes.SUCCESS
  }

  // --------------------------------------------------------------------------

  // Check if the installed packages must be added to the dependencies and
  // return the dependencies group or null.
  computeDependencyDestination () {
    const config = this.config

    if (config.doSaveOptional) {
      return 'optionalDependencies'
    }
    if (config.doSaveDev) {
      return 'devDependencies'
    }
    if (config.doSaveProd) {
      return 'dependencies'
    }
    if (config.doNotSave) {
      return null
    }

    // Default.
    return 'dependencies'
  }

  /**
   * @summary Compute the dependency value for a iven manifest.
   *
   * @returns {String} The dependency specification.
   *
   * @description
   * When adding to dependencies, the dependency name is the
   * (possibly scoped) package name, but the value is not obvious.
   *
   * The common case is to use a semver version expression, and in
   * this case it is understood that the package lives on a npm repository.
   *
   * In all other cases various forms of URLs are used.
   */
  computeDependencyValue ({ packSpec, manifest }) {
    assert(manifest)
    assert(packSpec)

    const config = this.config

    // Note: in pacote 10.x there is a new _from field. Not available here.

    if (this.isNpmjsSpec(packSpec)) {
      // If published package, return the more or less exact version.
      return config.doSaveExact ? manifest.version : `^${manifest.version}`
    }

    // TODO: make file URLs relative, like npm.
    return manifest._resolved
  }

  isNpmjsSpec (packSpec) {
    if (packSpec.indexOf('@') !== -1) {
      return true
    }
    if (packSpec.indexOf('/') !== -1) {
      return false
    }
    if (packSpec.indexOf(':') !== -1) {
      return false
    }
    // Otherwise must be a single word, then a package name.
    return true
  }

  addDependency ({ packSpec, manifest, manifestId }) {
    assert(manifest)
    assert(manifestId)

    const log = this.log

    const config = this.config

    const json = this.packageJson
    if (json) {
      const depDestination = this.computeDependencyDestination()
      if (depDestination) {
        const depName = manifestId.getScopedName()
        const depValue = this.computeDependencyValue({ packSpec, manifest })
        log.info(
          `Adding "${manifestId.getScopedName()}": "${depValue}" ` +
          `to '${depDestination}'...`)

        if (!Object.prototype.hasOwnProperty.call(json, depDestination)) {
          json[depDestination] = {}
        }
        // Store dependency value, possibly overriding old one.
        json[depDestination][depName] = depValue

        // Mark json dirty to force a rewrite.
        config.mustRewritePackageJson = true
      }
    }
  }

  async rewritePackageJson () {
    const log = this.log
    log.trace(`${this.constructor.name}.rewritePackageJson()`)

    const config = this.config

    if (!this.packageJson || !config.mustRewritePackageJson) {
      log.trace('not a package, skip rewrite')
      return
    }

    await this.xpack.rewritePackageJson(this.packageJson)
  }

  // --------------------------------------------------------------------------

  async installDependencies () {
    const log = this.log
    log.trace(`${this.constructor.name}.installDependencies()`)

    const config = this.config

    const xpack = this.xpack
    const json = this.packageJson
    if (!json) {
      log.warn('No valid package in current folder.')
      return CliExitCodes.ERROR.APPLICATION
    }

    log.info(`Installing dependencies for package ${json.name}...`)

    this.collectedDependencies = {}
    await this.collectDependencies(json)
    await this.collectDevDependencies(json)

    const cachePath = this.globalConfig.cacheFolderPath

    const xpacksPath = path.join(config.cwd, localXpacksFolderName)
    await makeDir(xpacksPath)

    const nodeModulesPath = path.join(config.cwd, 'node_modules')

    log.info()
    if (Object.values(this.collectedDependencies).length) {
      for (const manifest of Object.values(this.collectedDependencies)) {
        const manifestId = new ManifestId(manifest)
        const globalPackagePath = path.join(
          this.globalConfig.globalFolderPath,
          manifestId.getPath())

        // All packages (npm & xPack) are first installed in the global
        // repository, if not already there.
        let globalJson = await xpack.hasPackageJson(globalPackagePath)
        if (!globalJson) {
          log.info(`Adding '${manifestId.getFullName()}' to ` +
            `repository as '${globalPackagePath}'...`)
          await pacote.extract(manifestId.getFullName(), globalPackagePath,
            { cache: cachePath })

          // Parse JSON again, after installing it should be there.
          globalJson = await xpack.hasPackageJson(globalPackagePath)

          // Q: does pacote catch cases when there is no package.json?
          if (!globalJson) {
            log.error('Not a package, quit.')
            return CliExitCodes.ERROR.APPLICATION
          }

          if (globalJson.xpack) {
            // Binary xPacks may have attached binaries, which must be
            // downloaded separatelly.
            await xpack.downloadBinaries(
              { packagePath: globalPackagePath, cachePath })
          } else {
            // npm packages, if present, are most probably tools, and
            // they most probably have dependencies.
            log.info('Installing npm dependencies for ' +
              `'${manifestId.getFullName()}'...`)
            const spawn = new Spawn()
            const code = await spawn.executeShellPromise(
              'npm install --production --color=false --no-progress',
              {
                cwd: globalPackagePath
              })
            if (code !== 0) {
              log.error(`Install dependencies failed (npm returned ${code}).`)
              return CliExitCodes.ERROR.APPLICATION
            }
          }
          globalJson = await xpack.hasPackageJson(globalPackagePath)
        }

        // The destination folder may be either xPacks or npm_modules.
        let destPath
        if (globalJson.xpack) {
          destPath = path.join(xpacksPath, manifestId.getFolderName())
        } else {
          destPath = path.join(nodeModulesPath, manifestId.getFolderName())
        }

        // At this point the package is in the global repository;
        // link it or make a copy (actually expan again); mind the npm deps.

        // npm modules can be contributed only be
        // devDependencies, since only tools make sense here.
        if (globalJson.xpack || manifest.isContributedByDevDependencies) {
          if (config.doCopy) {
            try {

            } catch (err) {
              log.error(err)
              return CliExitCodes.ERROR.APPLICATION
            }
          } else {
            try {
              await CliUtils.createFolderLink({
                linkPath: destPath,
                sourcePath: globalPackagePath,
                hasWinSymLink: this.hasWinSymLink
              })
              log.verbose(`Folder '${manifestId.getFolderName()}' ` +
                `linked to '${manifestId.getPosixPath()}'.`)

              if (globalJson.xpack) {
                // xPack
                if (globalJson.xpack.bin) {
                  await this.processBin(globalJson.xpack.bin, globalPackagePath,
                    manifestId.getFolderName(), xpacksPath)
                }
              } else {
                // node module
                if (globalJson.bin) {
                  await this.processBin(globalJson.bin, globalPackagePath,
                    manifestId.getFolderName(), nodeModulesPath)
                }
              }
            } catch (err) {
              // TODO: document who throws EEXIST.
              if (err.code !== 'EEXIST') {
                log.error(err)
                return CliExitCodes.ERROR.APPLICATION
              }
            }
          }
        } else {
          log.warn(`npm module '${manifestId.getFullName()}' ignored, ` +
            'not in devDependencies.')
        }
      }
    }

    return CliExitCodes.SUCCESS
  }

  async processBin (bins, from, folderName, dest) {
    const log = this.log

    const binPath = path.join(dest, '.bin')
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

      try {
        await del(toPath, { force: true })
        const p = path.posix.join(folderName, valuePath)
        if (!isCopy) {
          if (os.platform() === 'win32') {
            await del(`${toPath}.cmd`, { force: true })
            await del(`${toPath}${suffix}`, { force: true })
            if (this.hasWinSymLink) {
              await fsPromises.symlink(fromPath, toPath + suffix, 'file')
              log.verbose(`File '${key}${suffix}' linked to '${p}${suffix}'.`)
            } else {
              await cmdShim(fromPath, toPath)
              log.verbose(`File '${key}.cmd' forwarding to '${p}${suffix}'.`)
            }
          } else {
            await fsPromises.symlink(fromPath, toPath, 'file')
            log.verbose(`File '${key}' linked to '${p}'.`)
          }
        } else {
          await cpFile(fromPath, toPath, { overwrite: true })
          log.verbose(`File '${key}' copied from '${p}'.`)
        }
      } catch (err) {
        log.error(err)
      }
    }
  }

  async collectDependencies (json) {
    const log = this.log
    log.trace(`${this.constructor.name}.collectDependencies() for ${json.name}`)

    const cachePath = this.globalConfig.cacheFolderPath

    if (json.dependencies) {
      for (const [key, value] of Object.entries(json.dependencies)) {
        const version = value.replace(/^[^0-9]+/, '')
        const pack = `${key}@${version}`
        let manifest
        try {
          log.info(`Processing package ${pack}...`)
          manifest = await pacote.manifest(pack, { cache: cachePath })
        } catch (err) {
          log.error(err.message)
          return CliExitCodes.ERROR.APPLICATION
        }

        if (!this.collectedDependencies[key]) {
          this.collectedDependencies[key] = manifest
        } else {
          if (version !== manifest.version) {
            log.error('Version mitigation not yet implemented.')
            return CliExitCodes.ERROR.APPLICATION
          }
        }

        if (manifest.dependencies) {
          // Recursively collect dependencies.
          await this.collectDependencies(manifest)
        }
      }
    }
  }

  async collectDevDependencies (json) {
    const log = this.log
    log.trace(`${this.constructor.name}.collectDevDependencies()` +
      ` for ${json.name}`)

    const cachePath = this.globalConfig.cacheFolderPath

    if (json.devDependencies) {
      for (const [key, value] of Object.entries(json.devDependencies)) {
        const version = value.replace(/^[^0-9]+/, '')
        const pack = `${key}@${version}`
        let manifest
        try {
          log.info(`Processing package ${pack}...`)
          manifest = await pacote.manifest(pack, { cache: cachePath })
        } catch (err) {
          log.error(err.message)
          return CliExitCodes.ERROR.APPLICATION
        }

        if (!this.collectedDependencies[key]) {
          manifest.isContributedByDevDependencies = true
          this.collectedDependencies[key] = manifest
        } else {
          if (version !== manifest.version) {
            log.error('Version mitigation not yet implemented.')
            return CliExitCodes.ERROR.APPLICATION
          }
        }
      }
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
