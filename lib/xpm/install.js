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
const CliCommand = require('@ilg/cli-start-options').CliCommand
const CliExitCodes = require('@ilg/cli-start-options').CliExitCodes
// const CliError = require('@ilg/cli-start-options').CliError
const CliUtils = require('@ilg/cli-start-options').CliUtils

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

class Install extends CliCommand {
  // --------------------------------------------------------------------------

  /**
   * @summary Constructor, to set help definitions.
   *
   * @param {Object} params The generic parameters object.
   */
  constructor (params) {
    super(params)

    // Title displayed with the help message.
    this.helpTitle = 'xPack manager - install package(s)'
    this.cliOptions.addOptionsGroups(
      [
        {
          title: 'Install options',
          // Extra arguments.
          postOptions: '[[@<scope>]/<name>[@<version]|<github_name>/<repo>]...',
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
   * @returns {number} Return code.
   *
   * @override
   * @description
   * The command has two distinct modes.
   * 1. If there are no command line pacakge names, the command is expected
   * to be invoked in an xPack folder and install the dependencies and
   * devDependencies.
   * 2. If there are command line package names, the command will install
   * the refered packages, either globally or locally, possibly inside
   * an xPack, followed by adding the package in the dependencies.
   */
  async doRun (argv) {
    const log = this.log
    log.trace(`${this.constructor.name}.doRun()`)

    const config = this.config

    // TODO: remove when cli-start-options is updated.
    log.debug(`os arch=${os.arch()}, platform=${os.platform()},` +
      ` release=${os.release()}`)
    log.debug(`node ${process.version}`)

    log.info(this.helpTitle)
    log.info()

    for (const arg of argv) {
      if (arg.startsWith('-')) {
        log.warn(`'${arg}' ignored`)
      }
    }

    this.globalConfig = new GlobalConfig()

    // The current folder may not be an xPack or even a package at all.
    this.xpack = new Xpack({
      xpackPath: config.cwd,
      log
    })

    try {
      this.packageJson = await this.xpack.readPackageJson()
    } catch (err) {
      // This happens when not installing in package.
      this.packageJson = null
    }

    // When symbolic links will work on Windows, this might be enabled.
    // this.hasWinSymLink = true
    // For now it is not, and the result is that 'junctions' are created
    // for folders.

    let exitCode = 0
    if (argv.length > 0) {
      for (const arg of argv) {
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

    const config = this.config

    const cachePath = this.globalConfig.cacheFolderPath
    let manifest
    try {
      manifest = await pacote.manifest(pack, { cache: cachePath })
    } catch (err) {
      log.error(err.message)
      return CliExitCodes.ERROR.INPUT
    }

    const manifestId = new ManifestId(manifest)
    const globalPackagePath = path.join(this.globalConfig.globalFolderPath,
      manifestId.getPath())

    const packFullName = manifestId.getFullName()

    log.info(`Processing ${packFullName}...`)

    let exitCode = CliExitCodes.ERROR.APPLICATION
    if (config.isSystem) {
      // System install.
      log.error('System install not yet implemented.')
      exitCode = CliExitCodes.ERROR.APPLICATION
    } else if (config.isGlobal) {
      // Global install.
      exitCode = await this.installPackageGlobally({
        pack,
        globalPackagePath,
        cachePath
      })
    } else {
      // Local install.
      exitCode = await this.installPackageLocally({
        pack,
        globalPackagePath,
        cachePath,
        manifest,
        manifestId
      })
    }
    return exitCode
  }

  async installPackageGlobally ({ pack, globalPackagePath, cachePath }) {
    const log = this.log
    log.trace(`${this.constructor.name}.installPackageGlobally('${pack}')`)

    const config = this.config

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

  async installPackageLocally (
    { pack, globalPackagePath, cachePath, manifest, manifestId }) {
    const log = this.log
    log.trace(`${this.constructor.name}.installPackageLocally('${pack}')`)

    const config = this.config

    const globalJson = await this.xpack.isFolderPackage(globalPackagePath)
    if (!globalJson) {
      log.info(`Adding to repository '${globalPackagePath}'...`)
      await pacote.extract(pack, globalPackagePath, { cache: cachePath })
      log.debug(`npm ${pack} package extracted.`)

      await this.xpack.downloadBinaries(globalPackagePath, cachePath)
    } else {
      log.info(`Package already in '${globalPackagePath}'.`)
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
      manifestId.getFolderName())
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

    if (json) {
      const subFolderName = path.join(
        localXpacksFolderName, manifestId.getFolderName())
      log.info(`Adding to package as '${subFolderName}'...`)
    } else {
      log.info(`Installing standalone package in '${localPackagePath}'...`)
    }

    // TODO: add links instead of a full copy.
    await pacote.extract(manifestId.getFullName(), localPackagePath,
      { cachePath })

    this.addDependency({ manifest, manifestId })

    return CliExitCodes.SUCCESS
  }

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
    if (!config.doNotSave) {
      return 'dependencies'
    }
    return null
  }

  computeDependencyValue ({ manifest }) {
    assert(manifest)

    const config = this.config

    const x = manifest._resolved
    if (x.startsWith('github:')) {
      return x.split('#')[0]
    }
    return config.doSaveExact ? manifest.version : `^${manifest.version}`
  }

  addDependency ({ manifest, manifestId }) {
    const log = this.log

    const config = this.config

    const json = this.packageJson

    if (json) {
      const depDestination = this.computeDependencyDestination()
      if (depDestination) {
        log.info(
          `Adding '${manifestId.getScopedName()}' to '${depDestination}'...`)

        const depName = manifestId.getScopedName()
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

    const config = this.config

    if (!this.packageJson || !config.mustRewritePackageJson) {
      return
    }

    await this.xpack.rewritePackageJson()
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
        const manifestId = new ManifestId(manifest._id)
        const globalPackagePath = path.join(
          this.globalConfig.globalFolderPath,
          manifestId.getPath())

        let globalJson = await xpack.isFolderPackage(globalPackagePath)
        if (!globalJson) {
          log.info(`Adding '${manifestId.getFullName()}' to ` +
            `repository as '${globalPackagePath}'...`)
          await pacote.extract(manifest._id, globalPackagePath,
            { cache: cachePath })

          globalJson = await xpack.isFolderPackage(globalPackagePath)
          if (globalJson.xpack) {
            await xpack.downloadBinaries(globalPackagePath, cachePath)
          } else {
            log.info('Installing npm dependencies for ' +
              `'${manifestId.getFullName()}'...`)
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
            linkPath = path.join(xpacksPath, manifestId.getFolderName())
          } else {
            await makeDir(nodeModulesPath)
            linkPath = path.join(nodeModulesPath, manifestId.getFolderName())
          }
          try {
            await CliUtils.createFolderLink({
              linkPath,
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
