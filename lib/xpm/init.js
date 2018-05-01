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

// https://www.npmjs.com/package/shopify-liquid
const Liquid = require('liquidjs')

// https://www.npmjs.com/package/parse-git-config
const parseGitConfig = require('parse-git-config')

// https://www.npmjs.com/package/user-home
const userHome = require('user-home')

// https://www.npmjs.com/package/del
const del = require('del')

const GlobalConfig = require('../utils/global-config.js').GlobalConfig
const Xpack = require('../utils/xpack.js').Xpack
const ManifestId = require('../utils/xpack.js').ManifestId
const Spawn = require('../../lib/utils/spawn.js').Spawn

const Promisifier = require('@ilg/es6-promisifier').Promisifier

// ES6: `import { CliCommand, CliExitCodes, CliError } from 'cli-start-options'
const CliCommand = require('@ilg/cli-start-options').CliCommand
const CliExitCodes = require('@ilg/cli-start-options').CliExitCodes
const CliError = require('@ilg/cli-start-options').CliError
// const CliHelp = require('@ilg/cli-start-options').CliHelp

// ----------------------------------------------------------------------------

// Promisify functions from the Node.js callbacks library.
// New functions have similar names, but suffixed with `Promise`.
// Promisifier.promisifyInPlace(fs, 'readFile')
Promisifier.promisifyInPlace(fs, 'access')
Promisifier.promisifyInPlace(fs, 'writeFile')

const fsPromises = fs.promises

// ============================================================================

class Init extends CliCommand {
  // --------------------------------------------------------------------------

  /**
   * @summary Constructor, to set help definitions.
   *
   * @param {Object} context Reference to a context.
   */
  constructor (context) {
    super(context)

    // Title displayed with the help message.
    this.title = 'xPack manager - create an xPack, empty or from a template'
    this.optionGroups = [
      {
        title: 'Init options',
        optionDefs: [
          {
            options: ['--template', '-t'],
            param: 'xpack',
            msg: 'The xPack implementing the template',
            init: (context) => {
              context.config.template = null
            },
            action: (context, val) => {
              context.config.template = val
            },
            isOptional: true,
            isMultiple: false
          },
          {
            options: ['-n', '--name'],
            action: (context, val) => {
              context.config.projectName = val
            },
            init: (context) => {
              context.config.projectName = null
            },
            msg: 'Project name',
            param: 'string',
            isOptional: true
          },
          {
            options: ['-p', '--property'],
            init: (context) => {
              context.config.properties = {}
            },
            action: (context, val) => {
              const arr = val.split('=', 2)
              if (arr.length === 1) {
                arr[1] = 'true' // Mandatory a string, it is tested with '==='
              }
              context.config.properties[arr[0]] = arr[1]
            },
            msg: 'Substitution variables',
            param: 'string',
            isOptional: true,
            isMultiple: true
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

    log.info(this.title)

    const context = this.context
    const config = context.config

    try {
      const packagePath = path.resolve(process.cwd(), 'package.json')
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
      config.projectName = path.basename(process.cwd())
    }

    // Possibly replace illegal chars with '_'
    config.projectName = config.projectName.replace(/[^@/a-zA-Z0-9-_]/g, '_')

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
    const context = this.context
    const config = context.config

    context.globalConfig = new GlobalConfig()

    log.info()

    const cachePath = context.globalConfig.cacheFolderPath
    let manifest
    try {
      log.info(`Checking package ${config.template} metadata...`)
      manifest = await pacote.manifest(config.template, { cache: cachePath })
    } catch (err) {
      log.error(err)
      return CliExitCodes.ERROR.INPUT
    }
    const manifestId = new ManifestId(manifest._id)
    let globalPackagePath = path.join(context.globalConfig.globalFolderPath,
      manifestId.getPath())

    // Read the cwd package.json
    const xpack = new Xpack(config.cwd, context)
    let packFullName = manifestId.getFullName()

    let globalJson = await xpack.isFolderPackage(globalPackagePath)
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
      globalJson = await xpack.isFolderPackage(globalPackagePath)
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
    const xpmInitTemplate = new XpmInitTemplate(context)
    const code = await xpmInitTemplate.run()

    return code
  }

  async doInitSimple () {
    const log = this.log
    log.trace(`${this.constructor.name}.doInitSimple()`)
    const context = this.context
    const config = context.config

    const liquidMap = {}

    liquidMap['projectName'] = config.projectName
    // Return original if not a match.
    liquidMap['gitProjectName'] = config.projectName.replace(
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
    liquidMap['author'] = author

    const currentTime = new Date()
    liquidMap['year'] = currentTime.getFullYear().toString()

    const templatesPath = path.resolve(context.rootPath, 'assets', 'sources')
    log.debug(`from='${templatesPath}'`)

    this.engine = Liquid({
      root: templatesPath,
      cache: false,
      strict_filters: true, // default: false
      strict_variables: true, // default: false
      trim_right: false, // default: false
      trim_left: false // default: false
    })

    log.info(`Creating project '${liquidMap['projectName']}'...`)

    await this.render('package.json.liquid', 'package.json', liquidMap)
    await this.render('LICENSE.liquid', 'LICENSE', liquidMap)

    return CliExitCodes.SUCCESS
  }

  async render (inputFileRelativePath, outputFileRelativePath, map) {
    const log = this.log

    const str = await this.engine.renderFile(inputFileRelativePath, map)

    // const headerPath = path.resolve(codePath, `${pnam}.h`)
    try {
      await fsPromises.writeFile(outputFileRelativePath, str, 'utf8')
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
