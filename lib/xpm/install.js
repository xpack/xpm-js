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

const Promisifier = require('@ilg/es6-promisifier').Promisifier

// ES6: `import { CliCommand, CliExitCodes, CliError } from 'cli-start-options'
const CliCommand = require('@ilg/cli-start-options').CliCommand
const CliExitCodes = require('@ilg/cli-start-options').CliExitCodes
// const CliError = require('@ilg/cli-start-options').CliError

// ----------------------------------------------------------------------------

// Promisify functions from the Node.js callbacks library.
// New functions have similar names, but suffixed with `Promise`.
Promisifier.promisifyInPlace(fs, 'symlink')
// Promisifier.promisifyInPlace(fs, 'link')
Promisifier.promisifyInPlace(fs, 'stat')

const fsPromises = fs.promises

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
        postOptions: '[[@<scope>]/<name>[@<version]]', // Extra arguments.
        optionDefs: [
          {
            options: ['-g', '--global'],
            init: (context) => {
              context.config.isGlobal = false
            },
            action: (context) => {
              context.config.isGlobal = true
            },
            msg: 'Install the package globally in the home folder',
            isOptional: true
          },
          {
            options: ['-sy', '--system'],
            init: (context) => {
              context.config.isSystem = false
            },
            action: (context) => {
              context.config.isSystem = true
            },
            msg: 'Install the package in a system folder (not impl)',
            isOptional: true
          },
          {
            options: ['-f', '--force'],
            init: (context) => {
              context.config.doForce = false
            },
            action: (context) => {
              context.config.doForce = true
            },
            msg: 'Force install over existing package',
            isOptional: true
          },
          {
            options: ['-n', '--dry-run'],
            init: (context) => {
              context.config.isDryRun = false
            },
            action: (context) => {
              context.config.isDryRun = true
            },
            msg: 'Pretend to install the package (not impl)',
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
   */
  async doRun (args) {
    const log = this.log
    log.trace(`${this.constructor.name}.doRun()`)
    const context = this.context

    log.info(this.title)
    // const config = this.context.config
    for (let arg of args) {
      if (arg.startsWith('-')) {
        log.warn(`'${arg}' ignored`)
      }
    }

    context.globalConfig = new GlobalConfig()

    // Symbolic links do not work on Windows,
    // `make` fails when starting executables via links.
    // context.hasSymLink = true

    let exitCode = 0
    if (args.length > 0) {
      for (let arg of args) {
        if (!arg.startsWith('-')) {
          exitCode = await this.installPackage(arg)
          if (exitCode !== 0) {
            break
          }
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

    const manifestId = new ManifestId(manifest._id)
    let globalPackagePath = path.join(context.globalConfig.globalFolderPath,
      manifestId.getPath())

    let packFullName = manifestId.getFullName()

    log.info()
    log.info(`Processing ${packFullName}...`)

    // Read the cwd package.json
    const xpack = new Xpack(config.cwd, context)
    this.xpack = xpack

    if (config.isSystem) {
      // System install.
      log.error('System install not yet implemented.')
      return CliExitCodes.ERROR.APPLICATION
    } else if (config.isGlobal) {
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
      await xpack.downloadBinaries(globalPackagePath, cachePath)
    } else {
      // Local install.
      const globalJson = await this.xpack.isFolderPackage(globalPackagePath)
      if (!globalJson) {
        log.info(`Adding to repository '${globalPackagePath}'...`)
        await pacote.extract(pack, globalPackagePath, { cache: cachePath })
        await xpack.downloadBinaries(globalPackagePath, cachePath)
      }

      // Install in the local folder
      let localPackagePath = config.cwd
      const json = await this.xpack.isFolderPackage(config.cwd)
      if (json && json.xpack) {
        // If this is an xPack folder, group all below `xpacks`
        localPackagePath = path.join(localPackagePath, 'xpacks')
      }
      localPackagePath = path.join(localPackagePath,
        manifestId.getFolderName())

      const destJson = await this.xpack.isFolderPackage(localPackagePath)
      if (destJson) {
        // Destination looks like a package, be careful.
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
        const subFolderName = path.join('xpack', manifestId.getFolderName())
        log.info(`Adding to package as '${subFolderName}'...`)
      } else {
        log.info(`Installing standalone package in '${localPackagePath}'...`)
      }
      await pacote.extract(manifestId.getFullName(), localPackagePath,
        { cachePath })
      // TODO: add links
    }
    return CliExitCodes.SUCCESS
  }

  async installDependencies () {
    const log = this.log
    log.trace(`${this.constructor.name}.installDependencies()`)
    const context = this.context
    const config = context.config

    const xpack = new Xpack(config.cwd, context)
    const json = await xpack.isFolderPackage(config.cwd)
    if (!json) {
      log.warn('No valid package in current folder.')
      return CliExitCodes.ERROR.APPLICATION
    }

    log.info()
    log.info(`Installing dependencies for package ${json.name}...`)

    this.collectedDependencies = {}
    await this.collectDependencies(json)
    await this.collectDevDependencies(json)

    const cachePath = context.globalConfig.cacheFolderPath

    const xpacksPath = path.join(config.cwd, 'xpacks')
    await makeDir(xpacksPath)

    const nodeModulesPath = path.join(config.cwd, 'node_modules')

    log.info()
    if (Object.values(this.collectedDependencies).length) {
      for (const manifest of Object.values(this.collectedDependencies)) {
        const manifestId = new ManifestId(manifest._id)
        const globalPackagePath = path.join(
          context.globalConfig.globalFolderPath,
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
            await del(linkPath, { force: true })
            const symlinkType = os.platform() === 'win32'
              ? (context.hasSymLink ? 'dir' : 'junction') : 'dir'
            await fsPromises.symlink(globalPackagePath, linkPath, symlinkType)
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
    const context = this.context
    // const config = context.config

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
      let toPath = path.join(binPath, key)
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
        log.error(err)
      }
    }
  }

  async collectDependencies (json) {
    const log = this.log
    log.trace(`${this.constructor.name}.collectDependencies() for ${json.name}`)

    const context = this.context
    // const config = context.config

    const cachePath = context.globalConfig.cacheFolderPath

    if (json.dependencies) {
      for (const [key, value] of Object.entries(json.dependencies)) {
        const version = value.replace(/^[^0-9]+/, '')
        let pack = `${key}@${version}`
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

    const context = this.context
    // const config = context.config

    const cachePath = context.globalConfig.cacheFolderPath

    if (json.devDependencies) {
      for (const [key, value] of Object.entries(json.devDependencies)) {
        const version = value.replace(/^[^0-9]+/, '')
        let pack = `${key}@${version}`
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
