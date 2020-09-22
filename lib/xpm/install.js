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
const path = require('path')
const os = require('os')

// https://www.npmjs.com/package/pacote
const pacote = require('pacote')

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
const ManifestIds = require('../utils/xpack.js').ManifestIds
const Spawn = require('../../lib/utils/spawn.js').Spawn

const Promisifier = require('@xpack/es6-promisifier').Promisifier

// ES6: `import { CliCommand, CliExitCodes, CliError } from 'cli-start-options'
const CliCommand = require('@ilg/cli-start-options').CliCommand
const CliExitCodes = require('@ilg/cli-start-options').CliExitCodes
// const CliError = require('@ilg/cli-start-options').CliError
const CliErrorApplication = require('@ilg/cli-start-options')
  .CliErrorApplication

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
const dotBin = '.bin'

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
        postOptions: '[[@<scope>]/<name>[@<version]|<github_name>/<repo>]...',
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

    log.info(this.title)
    // const config = this.context.config
    for (const arg of args) {
      if (arg.startsWith('-')) {
        log.warn(`'${arg}' ignored`)
      }
    }

    context.globalConfig = new GlobalConfig()

    // The current folder may not be an xPack or even a package at all.
    this.xpack = new Xpack(config.cwd, context)

    try {
      this.packageJson = await this.xpack.readPackageJson()
    } catch (err) {
      // This happens when not installing in package.
      this.packageJson = null
    }

    // Symbolic links do not work on Windows,
    // `make` fails when starting executables via links.
    // context.hasSymLink = true

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
          log.warn('Save related option(s) ignored for global installs.')
        }
      } else {
        if (config.doSaveBundle) {
          log.warn('--save-bundle not yet implemented, ignored.')
        }
      }
    } else {
      exitCode = await this.installDependencies()
    }
    this.outputDoneDuration()
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
    } catch (err) {
      log.error(err.message)
      return CliExitCodes.ERROR.INPUT
    }

    const manifestIds = new ManifestIds(manifest)
    const globalPackagePath = path.join(context.globalConfig.globalFolderPath,
      manifestIds.getPath())

    const packFullName = manifestIds.getFullName()

    log.info()
    log.info(`Processing ${packFullName}...`)

    let exitCode = CliExitCodes.ERROR.APPLICATION
    if (config.isSystem) {
      // System install.
      log.error('System install not yet implemented.')
      exitCode = CliExitCodes.ERROR.APPLICATION
    } else if (config.isGlobal) {
      // Global install.
      exitCode = await this.installPackageGlobally(
        { pack, globalPackagePath, cachePath })
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

    const log = this.log
    log.trace(`${this.constructor.name}.installPackageGlobally('${pack}')`)
    const context = this.context
    const config = context.config

    // Global install.
    const globalJson = await this.xpack.isFolderPackage(globalPackagePath)
    if (globalJson) {
      if (config.doForce) {
        log.info(`Removing existing package from '${globalPackagePath}'...`)
        await del(globalPackagePath, { force: true })
      } else {
        log.warn('Package already installed. ' +
          'Use --force to overwrite.')
        return CliExitCodes.ERROR.NONE
      }
    }

    log.info(`Installing globally in '${globalPackagePath}'...`)
    await pacote.extract(pack, globalPackagePath, { cache: cachePath })
    log.debug(`npm ${pack} package extracted.`)

    await this.xpack.downloadBinaries(globalPackagePath, cachePath)

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

    let globalJson = await this.xpack.isFolderPackage(globalPackagePath)
    if (!globalJson) {
      log.info(`Adding to repository '${globalPackagePath}'...`)
      await pacote.extract(pack, globalPackagePath, { cache: cachePath })
      log.debug(`npm ${pack} package extracted.`)

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
      localPackagePath = path.join(localPackagePath, localXpacksFolderName)
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
        log.info(`Removing existing package from '${localPackagePath}'...`)
        await del(localPackagePath, { force: true })
      } else {
        log.warn('Package already installed. ' +
          'Use --force to overwrite.')
        return CliExitCodes.ERROR.OUTPUT
      }
    }

    // Check if standalone (non in a package) install.
    if (!json) {
      // The current folder is not a package.
      if (this.xpack.isBinaryPackage(globalJson)) {
        throw new CliErrorApplication(
          'Installing standalone binary xPack not supported.')
      } else {
        log.info(`Installing standalone package in '${localPackagePath}'...`)

        // TODO: add links instead of a full copy.
        await pacote.extract(manifestIds.getFullName(), localPackagePath,
          { cachePath })
        return CliExitCodes.SUCCESS
      }
    }

    // Install inside a package.
    const subFolderName = path.join(
      localXpacksFolderName, manifestIds.getFolderName())

    if (this.xpack.isBinaryPackage(globalJson)) {
      // For binaries in a package:
      // - do not extract
      // - add .bin links
      // - add devDependencies.
      const xpacksPath = path.join(config.cwd, localXpacksFolderName)

      await this.processBin({
        bins: globalJson.xpack.bin,
        from: globalPackagePath,
        folderName: manifestIds.getFolderName(),
        dest: xpacksPath
      })

      this.addDependency({
        manifest,
        manifestIds,
        depDestination: 'devDependencies'
      })

      return CliExitCodes.SUCCESS
    }

    log.info(`Adding to current package as '${subFolderName}'...`)

    // TODO: add links instead of a full copy.
    await pacote.extract(manifestIds.getFullName(), localPackagePath,
      { cachePath })

    this.addDependency({ manifest, manifestIds })

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

    const x = manifest._resolved
    if (x.startsWith('github:')) {
      return x.split('#')[0]
    }
    return (config.doSaveExact || manifest.version.includes('-'))
      ? manifest.version : `^${manifest.version}`
  }

  addDependency (params) {
    const manifest = params.manifest
    const manifestIds = params.manifestIds

    const log = this.log
    const context = this.context
    const config = context.config

    const json = this.packageJson

    if (json) {
      const depDestination =
        this.computeDependencyDestination(params.depDestination)
      if (depDestination) {
        log.info(
          `Adding '${manifestIds.getScopedName()}' to '${depDestination}'.`)

        const depName = manifestIds.getScopedName()
        const depValue = this.computeDependencyValue({ manifest })
        if (!Object.prototype.hasOwnProperty.call(json, depDestination)) {
          json[depDestination] = {}
        }
        // Store dependency value, possibly overriding old one.
        json[depDestination][depName] = depValue

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
      log.warn('No valid package in current folder.')
      return CliExitCodes.ERROR.APPLICATION
    }

    log.info()
    log.info(`Installing dependencies for package ${json.name}...`)

    this.collectedDependencies = {}
    await this.collectDependencies(json)
    await this.collectDependencies(json, true) // devDependencies

    const cachePath = context.globalConfig.cacheFolderPath

    const xpacksPath = path.join(config.cwd, localXpacksFolderName)
    await makeDir(xpacksPath)

    const nodeModulesPath = path.join(config.cwd, 'node_modules')

    log.info()
    if (Object.values(this.collectedDependencies).length) {
      for (const manifest of Object.values(this.collectedDependencies)) {
        const manifestIds = new ManifestIds(manifest)
        const globalPackagePath = path.join(
          context.globalConfig.globalFolderPath,
          manifestIds.getPath())

        let globalJson = await xpack.isFolderPackage(globalPackagePath)
        if (!globalJson) {
          log.info(`Adding '${manifestIds.getFullName()}' to ` +
            `repository as '${globalPackagePath}'...`)
          await pacote.extract(manifestIds.getFullName(), globalPackagePath,
            { cache: cachePath })

          globalJson = await xpack.isFolderPackage(globalPackagePath)
          if (globalJson.xpack) {
            await xpack.downloadBinaries(globalPackagePath, cachePath)
          } else {
            log.info('Installing npm dependencies for ' +
              `'${manifestIds.getFullName()}'...`)
            const spawn = new Spawn()
            const code = await spawn.executeShellPromise(
              'npm install --production --color=false',
              {
                cwd: globalPackagePath
              })
            if (code !== 0) {
              log.error(`Install dependencies failed (npm returned ${code}).`)
              return CliExitCodes.ERROR.APPLICATION
            }
          }
          globalJson = await xpack.isFolderPackage(globalPackagePath)
        }
        if (globalJson.xpack || manifest.isContributedByDevDependencies) {
          let linkPath
          if (globalJson.xpack) {
            linkPath = path.join(xpacksPath, manifestIds.getFolderName())
          } else {
            await makeDir(nodeModulesPath)
            linkPath = path.join(nodeModulesPath, manifestIds.getFolderName())
          }
          try {
            await del(linkPath, { force: true })
            const symlinkType = os.platform() === 'win32'
              ? (context.hasSymLink ? 'dir' : 'junction') : 'dir'
            await fsPromises.symlink(globalPackagePath, linkPath, symlinkType)
            log.verbose(`Folder '${manifestIds.getFolderName()}' ` +
              `linked to '${manifestIds.getPosixPath()}'.`)

            if (globalJson.xpack) {
              // xPack
              if (globalJson.xpack.bin) {
                await this.processBin({
                  bins: globalJson.xpack.bin,
                  from: globalPackagePath,
                  folderName: manifestIds.getFolderName(),
                  dest: xpacksPath,
                  isInstallDependencies: true,
                  packageName: manifestIds.getFullName()
                })
              }
            } else {
              // node module
              if (globalJson.bin) {
                await this.processBin({
                  bins: globalJson.bin,
                  from: globalPackagePath,
                  folderName: manifestIds.getFolderName(),
                  dest: nodeModulesPath,
                  isInstallDependencies: true,
                  packageName: manifestIds.getFullName()
                })
              }
            }
          } catch (err) {
            if (err.code !== 'EEXIST') {
              log.error(err)
              return CliExitCodes.ERROR.APPLICATION
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
    folderName,
    dest,
    isInstallDependencies,
    packageName
  }) {
    const log = this.log
    const context = this.context
    // const config = context.config

    const intoPackage = isInstallDependencies ? packageName + ' ' : ''

    if (os.platform() === 'win32') {
      log.info(`Adding .cmd stubs to ${intoPackage}binaries in ` +
        `'${localXpacksFolderName}/${dotBin}'...`)
    } else {
      log.info(`Adding symbolic links to ${intoPackage}binaries in ` +
        `'${localXpacksFolderName}/${dotBin}'...`)
    }

    const binPath = path.join(dest, dotBin)
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
            if (context.hasSymLink) {
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
        throw new CliErrorApplication(err.message)
      }
    }
  }

  async collectDependencies (json, isDev = false) {
    const log = this.log
    log.trace(`${this.constructor.name}.collectDependencies() for ${json.name}`)

    const context = this.context
    // const config = context.config

    const cachePath = context.globalConfig.cacheFolderPath

    const deps = isDev ? json.devDependencies : json.dependencies

    if (deps) {
      for (const [key, value] of Object.entries(deps)) {
        const version = value.replace(/^[^0-9]+/, '')
        const pack = `${key}@${version}`
        let manifest
        try {
          log.info(`Processing package ${pack}...`)
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
              `Conflicting version ${prevVersion} also requested;` +
              ' mitigation not yet implemented.')
          }
        }

        if (!isDev && manifest.dependencies) {
          // Recursively collect dependencies.
          await this.collectDependencies(manifest)
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
