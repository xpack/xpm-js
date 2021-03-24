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
const path = require('path')

// ----------------------------------------------------------------------------

// https://www.npmjs.com/package/semver
const semverCompare = require('semver/functions/compare')

// ----------------------------------------------------------------------------

const { GlobalConfig } = require('../utils/global-config.js')
const { Xpack } = require('../utils/xpack.js')

// ES6: `import { CliCommand, CliExitCodes, CliError } from 'cli-start-options'
const { CliCommand, CliExitCodes, CliErrorApplication, CliError } =
  require('@ilg/cli-start-options')

// ============================================================================

/**
 * @typedef {Object} List
 * @property {GlobalConfig} globalConfig Global configuration properties.
 * @property {Xpack} xpack The object with xPack utilities.
 * @property {Object} packageJson The object parsed by xpack; may be null.
 */
class List extends CliCommand {
  // --------------------------------------------------------------------------

  /**
   * @summary Constructor, to set help definitions.
   *
   * @param {Object} context Reference to a context.
  */
  constructor (context) {
    super(context)

    // Title displayed with the help message.
    this.title = 'xPack manager - list packages'
    this.optionGroups = [
      {
        title: 'List options',
        optionDefs: [
          {
            options: ['-g', '--global'],
            init: ({ config }) => {
              config.isGlobal = false
            },
            action: ({ config }) => {
              config.isGlobal = true
            },
            msg: 'List the global package(s)',
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
            msg: 'List the system package(s) (not impl)',
            isOptional: true
          },
          {
            options: ['-c', '--config'],
            init: ({ config }) => {
              config.configurationName = null
            },
            action: ({ config }, val) => {
              config.configurationName = val
            },
            msg: 'Show the configuration specific dependencies',
            param: 'config_name',
            isOptional: true
          }
        ]
      }
    ]
  }

  /**
   * @summary Execute the `list` command.
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
      log.warn(`'${element}' ignored`)
    })

    context.globalConfig = new GlobalConfig()

    await context.globalConfig.checkDeprecatedFolders(log)

    // The current folder may not be an xPack or even a package at all.
    this.xpack = new Xpack(config.cwd, context)

    this.packageJson = await this.xpack.readPackageJson()

    if (config.isSystem) {
      // System uninstall.
      throw new CliErrorApplication('system list not yet implemented')
    }

    if (config.isGlobal) {
      await this.listPackagesGlobally()
    } else {
      await this.listPackagesLocally()
    }

    if (log.isVerbose()) {
      this.outputDoneDuration()
    }

    return CliExitCodes.SUCCESS
  }

  // --------------------------------------------------------------------------

  /**
   * @summary List the packages from the local folder.
   *
   * @returns {undefined|Promise} Nothing.
   *
   * @description
   * List the packages link from the local
   * folder, which must be an xPack.
   */
  async listPackagesLocally () {
    const log = this.log
    log.trace(
      `${this.constructor.name}.listPackagesLocally()`)

    const context = this.context
    const config = context.config

    const xpack = this.xpack
    const packageJson = this.packageJson

    if (!xpack.isPackage()) {
      throw new CliError(
        'not a valid package, check for package.json',
        CliExitCodes.ERROR.INPUT)
    }

    if (!xpack.isXpack()) {
      throw new CliError(
        'not an xPack, check for the "xpack" property in package.json',
        CliExitCodes.ERROR.INPUT)
    }

    if (config.configurationName) {
      // Throws if the configuration is not found.
      const configuration = xpack.retrieveConfiguration({
        packageJson,
        configurationName: config.configurationName
      })

      // Show the dependencies of a single configuration.
      await this.listPackagesFromOneFolder({
        configurationName: config.configurationName,
        configuration
      })
    } else {
      // Show the package dependencies.
      await this.listPackagesFromOneFolder()

      // Show the dependencies of all configurations.
      if (packageJson.xpack.configurations) {
        for (const [configurationName, configuration] of
          Object.entries(packageJson.xpack.configurations)) {
          if (configuration.dependencies || configuration.devDependencies) {
            log.info()
            if (log.isVerbose()) {
              log.info(`Configuration '${configurationName}'`)
            } else {
              log.info(`${configurationName}:`)
            }
            await this.listPackagesFromOneFolder({
              configurationName,
              configuration
            })
          }
        }
      }
    }
  }

  async listPackagesFromOneFolder ({
    configurationName,
    configuration
  } = {}) {
    const log = this.log
    log.trace(
      `${this.constructor.name}.listPackagesLocally()`)

    const context = this.context
    const config = context.config

    const xpack = this.xpack

    // const configurationPrefix = (configurationName + '/') || ''

    let xpacksFolderPath

    if (configuration && configurationName) {
      const { liquidEngine, liquidMap } = xpack.prepareLiquidEngine()

      const buildFolderRelativePath =
        await xpack.computeBuildFolderRelativePath({
          liquidEngine,
          liquidMap,
          configuration,
          configurationName
        })

      xpacksFolderPath = path.join(config.cwd,
        buildFolderRelativePath,
        context.globalConfig.localXpacksFolderName)
    } else {
      xpacksFolderPath = path.join(config.cwd,
        context.globalConfig.localXpacksFolderName)
    }

    let stat
    try {
      stat = await fsPromises.lstat(xpacksFolderPath)
    } catch (err) {
      stat = undefined
    }

    const dotBin = context.globalConfig.dotBin

    if (stat && stat.isDirectory()) {
      log.verbose('Installed xPacks:')
      const files = await fsPromises.readdir(xpacksFolderPath,
        { withFileTypes: true })
      let hasBin = false

      for (const file of files) {
        if (file.name === dotBin) {
          hasBin = true
        }
        if (file.name.startsWith('.')) {
          continue
        }
        const subFolderPath = path.join(xpacksFolderPath, file.name)
        const json = await xpack.isFolderPackage(subFolderPath)
        log.output(`- ${json.name}/${json.version}`)
        log.output(`  ${json.description || ''}`)
      }

      if (hasBin) {
        log.info()
        log.verbose('xPack binaries:')
        const binaries = await fsPromises.readdir(
          path.join(xpacksFolderPath, dotBin),
          { withFileTypes: true })

        for (const binary of binaries) {
          const tmp =
            `${context.globalConfig.localXpacksFolderName}/` +
            `${dotBin}/${binary.name}`
          log.output(`- ${tmp}`)
        }
      }
    } else {
      log.verbose('No xPacks installed.')
    }

    const nodeFolderPath = path.join(config.cwd,
      context.globalConfig.localNpmFolderName)

    try {
      stat = await fsPromises.lstat(nodeFolderPath)
    } catch (err) {
      stat = undefined
    }

    if (stat && stat.isDirectory()) {
      log.verbose()
      log.verbose('Installed Node.js modules:')
      const files = await fsPromises.readdir(nodeFolderPath,
        { withFileTypes: true })
      let hasBin = false
      for (const file of files) {
        if (file.name === dotBin) {
          hasBin = true
        }
        if (file.name.startsWith('.')) {
          continue
        }
        const subFolderPath = path.join(nodeFolderPath, file.name)
        const json = await xpack.isFolderPackage(subFolderPath)
        log.output(`- ${json.name}/${json.version}`)
        log.output(`  ${json.description || ''}`)
      }
      if (hasBin) {
        log.verbose()
        log.verbose('Node.js binaries:')
        const binaries = await fsPromises.readdir(
          path.join(nodeFolderPath, dotBin),
          { withFileTypes: true })

        for (const binary of binaries) {
          const tmp =
            `${context.globalConfig.localNpmFolderName}/` +
            `${dotBin}/${binary.name}`
          log.output(`- ${tmp}`)
        }
      }
    } else {
      log.verbose('No Node.js modules installed.')
    }
  }

  /**
 * @summary List a single package from the global repository.
 *
 * @param {String} packSpec Packages specifier, as [@scope/]name[@version].
 * @returns {undefined|Promise} Nothing.
 *
 * @description
 * Remove the package from the global location. If the version is not
 * given, all versions are removed.
 */
  async listPackagesGlobally () {
    const log = this.log
    log.trace(
      `${this.constructor.name}.uninstallPackageGlobally()`)

    const context = this.context
    // const config = context.config

    log.verbose(
      `Packages available in '${context.globalConfig.globalFolderPath}':`)

    const xpacksMap = new Map()

    await this.findGlobalXpacksRecursive({
      folderPath: context.globalConfig.globalFolderPath,
      xpacksMap
    })

    const xpacksMapAscending = new Map([...xpacksMap.entries()].sort())
    for (const [name, xpackVersionsMap] of xpacksMapAscending) {
      const xpackVersionsMapAscending =
        new Map([...xpackVersionsMap.entries()].sort((a, b) => {
          return semverCompare(a[0], b[0])
        }))
      let description = ''
      for (const [, content] of xpackVersionsMapAscending) {
        if (content.description) {
          description = content.description
        }
      }

      log.output(`- ${name}`)
      log.output(`  ${description}`)
      for (const [version] of xpackVersionsMapAscending) {
        log.output(`  - ${version}`)
      }
    }
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

    const xpack = this.xpack

    if (!this.packageJson || !config.mustRewritePackageJson) {
      return
    }

    await xpack.rewritePackageJson()
  }

  async findGlobalXpacksRecursive ({
    folderPath,
    xpacksMap
  }) {
    const log = this.log

    const xpack = this.xpack

    // The first concern is to terminate the recursion when
    // identifying folders that look like a package.
    const json = await xpack.isFolderPackage(folderPath)
    if (json) {
      let xpackVersionsMap = xpacksMap.get(json.name)
      if (!xpackVersionsMap) {
        xpackVersionsMap = new Map()
        xpacksMap.set(json.name, xpackVersionsMap)
      }
      log.trace(`${json.name}@${json.version}`)

      const content = {}
      content.description = json.description || ''
      content.filePath = folderPath

      xpackVersionsMap.set(json.version, content)

      return
    }

    // Recurse on children folders.
    const files = await fsPromises.readdir(folderPath, { withFileTypes: true })
    for (const file of files) {
      if (file.isDirectory()) {
        await this.findGlobalXpacksRecursive({
          folderPath: path.join(folderPath, file.name),
          xpacksMap
        })
      }
    }
  }

  // --------------------------------------------------------------------------
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// The List class is added as a property of this object.
module.exports.List = List

// In ES6, it would be:
// export class List { ... }
// ...
// import { List } from 'list.js'

// ----------------------------------------------------------------------------
