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
 * The `xpm run-script command [-- <args>]` command implementation.
 */

// ----------------------------------------------------------------------------

const fs = require('fs')
// const xml2js = require('xml2js')
const path = require('path')
const pacote = require('pacote')

// https://www.npmjs.com/package/liquidjs
const { Liquid } = require('liquidjs')

// https://www.npmjs.com/package/parse-git-config
const parseGitConfig = require('parse-git-config')

// https://www.npmjs.com/package/user-home
const userHome = require('user-home')

// https://www.npmjs.com/package/del
const del = require('del')

const mkdirp = require('mkdirp-promise')

const GlobalConfig = require('../utils/global-config.js').GlobalConfig
const Xpack = require('../utils/xpack.js').Xpack
const ManifestId = require('../utils/xpack.js').ManifestId
const Spawn = require('../../lib/utils/spawn.js').Spawn

const Promisifier = require('@xpack/es6-promisifier').Promisifier

// ES6: `import { CliCommand, CliExitCodes, CliError } from 'cli-start-options'
const { CliCommand, CliExitCodes, CliError } =
  require('@ilg/cli-start-options')

// ----------------------------------------------------------------------------

// Promisify functions from the Node.js callbacks library.
// New functions have similar names, but suffixed with `Promise`.
// Promisifier.promisifyInPlace(fs, 'readFile')
Promisifier.promisifyInPlace(fs, 'access')
Promisifier.promisifyInPlace(fs, 'writeFile')

// For easy migration, inspire from the Node 10 experimental API.
// Do not use `fs.promises` yet, to avoid the warning.
const fsPromises = fs.promises_

// ============================================================================

class Init extends CliCommand {
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
          title: 'Init options',
          insertInFront: true,
          optionsDefs: [
            {
              options: ['-t', '--template'],
              param: 'xpack',
              message: 'The xPack implementing the template',
              init: ({ config }) => {
                config.template = null
              },
              action: ({ config }, val) => {
                config.template = val
              },
              isOptional: true,
              isMultiple: false
            },
            {
              options: ['-n', '--name'],
              init: ({ config }) => {
                config.projectName = null
              },
              action: ({ config }, val) => {
                config.projectName = val
              },
              message: 'Project name',
              param: 'string',
              isOptional: true
            },
            {
              options: ['-p', '--property'],
              init: ({ config }) => {
                config.properties = {}
              },
              action: ({ config }, val) => {
                const arr = val.split('=', 2)
                if (arr.length === 1) {
                  arr[1] = 'true' // Mandatory a string, it is tested with '==='
                }
                config.properties[arr[0]] = arr[1]
              },
              message: 'Substitution variables',
              param: 'string',
              isOptional: true,
              isMultiple: true
            }
          ]
        }
      ]
    )
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

    log.info(this.helpTitle)
    log.info()

    const config = this.config

    try {
      const packagePath = path.resolve(config.cwd, 'package.json')
      await fsPromises.access(packagePath)

      log.error('The destination folder already has a package.json file.')
      return CliExitCodes.ERROR.OUTPUT // Possible override.
    } catch (er) {
      // The package.json is not present. That's fine.
    }

    if (config.projectName) {
      // Validate `--name` as project name.
      if (!config.projectName.match(
        /^([@][a-zA-Z0-9-_]+[/])?[a-zA-Z0-9-_]+$/)) {
        log.error(`Project name '${config.projectName}' ` +
          'may contain only letters, digits, hyphens and underscores.')
        return CliExitCodes.ERROR.SYNTAX
      }
    } else {
      // Default to the current folder name.
      config.projectName = path.basename(config.cwd)
    }

    // Possibly replace illegal chars with '_'
    config.projectName = config.projectName.replace(/[^@/a-zA-Z0-9-_]/g, '_')

    await mkdirp(config.cwd)

    let code
    if (config.template) {
      code = await this.doInitWithTemplate()
    } else {
      code = await this.doInitSimple()
    }

    this.outputDoneDuration()
    return code
  }

  async doInitWithTemplate () {
    const log = this.log
    log.trace(`${this.constructor.name}.doInitWithTemplate()`)

    const config = this.config

    this.globalConfig = new GlobalConfig()

    log.info()

    const cachePath = this.globalConfig.cacheFolderPath
    let manifest
    try {
      log.info(`Checking package ${config.template} metadata...`)
      manifest = await pacote.manifest(config.template, { cache: cachePath })
    } catch (err) {
      log.error(err)
      return CliExitCodes.ERROR.INPUT
    }
    const manifestId = new ManifestId(manifest)
    const globalPackagePath = path.join(this.globalConfig.globalFolderPath,
      manifestId.getPath())

    const xpack = new Xpack({ xpackFolderAbsolutePath: config.cwd, log })
    const packFullName = manifestId.getFullName()

    // Read the cwd package.json
    let globalJson = await xpack.hasPackageJson(globalPackagePath)
    if (!globalJson) {
      log.info(`Installing ${packFullName}...`)
      await pacote.extract(config.template, globalPackagePath,
        { cache: cachePath })

      log.info('Installing npm dependencies...')
      const spawn = new Spawn()
      const code = await spawn.executeShellPromise(
        'npm install --production --color=false',
        {
          cwd: globalPackagePath
        })
      if (code !== 0) {
        log.error(`Install dependencies failed (npm returned ${code}).`)
        await del(globalPackagePath, { force: true })
        return CliExitCodes.ERROR.APPLICATION
      }
      globalJson = await xpack.hasPackageJson(globalPackagePath)
    }

    if (!globalJson || !globalJson.xpack) {
      log.error('Not an xPack. Check for package.xpack.')
      return CliExitCodes.ERROR.APPLICATION
    }

    if (!globalJson.main) {
      log.error('Not an xPack template. Check for package.main.')
      return CliExitCodes.ERROR.APPLICATION
    }

    log.info(`Processing ${packFullName}...`)

    const mainTemplatePath = path.join(globalPackagePath, globalJson.main)
    const XpmInitTemplate = require(mainTemplatePath).XpmInitTemplate
    if (!XpmInitTemplate) {
      log.error('Not an xPack template. Check for XpmInitTemplate in exports.')
      return CliExitCodes.ERROR.APPLICATION
    }
    const xpmInitTemplate = new XpmInitTemplate({
      log,
      config
    })
    const code = await xpmInitTemplate.run()

    return code
  }

  async doInitSimple () {
    const log = this.log
    log.trace(`${this.constructor.name}.doInitSimple()`)

    const config = this.config

    const liquidMap = {}

    liquidMap.projectName = config.projectName
    // Return original if not a match.
    liquidMap.gitProjectName = config.projectName.replace(
      /^[@][a-zA-Z0-9-_]+[/]([a-zA-Z0-9-_]+)$/, '$1')

    const author = {}
    author.name = '<author-name>'
    author.email = '<author-email>'
    author.url = '<author-url>'

    let gitConfig
    try {
      gitConfig = await parseGitConfig.promise()
    } catch (err) {
      try {
        gitConfig = await parseGitConfig.promise(
          {
            cwd: userHome,
            path: '.gitconfig'
          }
        )
      } catch (err) {
      }
    }
    if (gitConfig) {
      if (gitConfig.user && gitConfig.user.name) {
        author.name = gitConfig.user.name
      }
      if (gitConfig.user && gitConfig.user.email) {
        author.email = gitConfig.user.email
      }
    }
    liquidMap.author = author

    const currentTime = new Date()
    liquidMap.year = currentTime.getFullYear().toString()

    const templatesPath = path.resolve(this.rootAbsolutePath,
      'assets', 'sources')
    log.debug(`from='${templatesPath}'`)

    this.engine = new Liquid({
      root: templatesPath,
      cache: false,
      strict_filters: true, // default: false
      strict_variables: true, // default: false
      trim_right: false, // default: false
      trim_left: false // default: false
    })

    log.info(`Creating project '${liquidMap.projectName}'...`)

    await this.render('package.json.liquid', 'package.json', liquidMap)

    try {
      const readmePath = path.resolve(config.cwd, 'LICENSE')
      await fsPromises.access(readmePath)

      log.info('File \'LICENSE\' preserved, not overriden.')
    } catch (er) {
      // The LICENSE is not present. That's fine.
      await this.render('LICENSE.liquid', 'LICENSE', liquidMap)
    }

    return CliExitCodes.SUCCESS
  }

  async render (inputFileRelativePath, outputFileRelativePath, map) {
    const log = this.log
    const config = this.config

    const str = await this.engine.renderFile(inputFileRelativePath, map)

    // const headerPath = path.resolve(codePath, `${pnam}.h`)
    const outputAbsolutePath = path.join(config.cwd, outputFileRelativePath)
    try {
      await fsPromises.writeFile(outputAbsolutePath, str, 'utf8')
    } catch (err) {
      throw new CliError(err.message, CliExitCodes.ERROR.OUTPUT)
    }
    log.info(`File '${outputFileRelativePath}' generated.`)
  }

  // --------------------------------------------------------------------------
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// The current class is added as a property of this object.
module.exports.Init = Init

// In ES6, it would be:
// export class Init { ... }
// ...
// import { Init } from 'init.js'

// ----------------------------------------------------------------------------
