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
 * The `xpm init` command implementation.
 */

// ----------------------------------------------------------------------------

// https://nodejs.org/docs/latest-v10.x/api/
const fsPromises = require('fs').promises
const os = require('os')
const path = require('path')
const util = require('util')

// https://www.npmjs.com/package/pacote
const pacote = require('pacote')

// ----------------------------------------------------------------------------

// https://www.npmjs.com/package/del
const del = require('del')

// https://www.npmjs.com/package/liquidjs
const { Liquid } = require('liquidjs')

// https://www.npmjs.com/package/parse-git-config
const parseGitConfig = require('parse-git-config')

// ----------------------------------------------------------------------------

const { GlobalConfig } = require('../utils/global-config.js')
const { ManifestIds } = require('../utils/xpack.js')
const { Spawn } = require('../../lib/utils/spawn.js')
const { Xpack } = require('../utils/xpack.js')

// ES6: `import { CliCommand, CliExitCodes, CliError } from 'cli-start-options'
const { CliCommand, CliExitCodes, CliError } = require('@ilg/cli-start-options')

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
            options: ['-t', '--template'],
            param: 'xpack',
            msg: 'The xPack implementing the template',
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
            msg: 'Project name',
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

    log.verbose(this.title)

    // Extra options are not catched by CLI and must be checked/filtered here.
    args.forEach((element) => {
      if (element.startsWith('-')) {
        log.warn(`'${element}' ignored`)
      }
    })

    const context = this.context
    const config = context.config

    try {
      const packagePath = path.resolve(process.cwd(), 'package.json')
      await fsPromises.access(packagePath)

      log.error('the destination folder already has a package.json file')
      return CliExitCodes.ERROR.OUTPUT // Possible override.
    } catch (er) {
      // The package.json is not present. That's fine.
    }

    if (config.projectName) {
      // Validate `--name` as project name.
      if (!config.projectName.match(
        /^([@][a-zA-Z0-9-_]+[/])?[a-zA-Z0-9-_]+$/)) {
        log.error(`project name '${config.projectName}' ` +
          'may contain only letters, digits, hyphens and underscores')
        return CliExitCodes.ERROR.SYNTAX
      }
    } else {
      // Default to the current folder name.
      config.projectName = path.basename(process.cwd()).replace(/\.git/, '')
    }

    // Possibly replace non alphanumeric chars with dash ('-')
    config.projectName = config.projectName
      .replace(/[^@/a-zA-Z0-9-_]/g, '-')
      .replace(/--/g, '-')

    let code
    if (config.template) {
      code = await this.doInitWithTemplate()
    } else {
      code = await this.doInitSimple()
    }

    if (log.isVerbose()) {
      this.outputDoneDuration()
    }
    return code
  }

  async doInitWithTemplate () {
    const log = this.log
    log.trace(`${this.constructor.name}.doInitWithTemplate()`)
    const context = this.context
    const config = context.config

    context.globalConfig = new GlobalConfig()

    log.info()

    const cacheFolderPath = context.globalConfig.cacheFolderPath
    let manifest
    try {
      log.info(`Checking package ${config.template} metadata...`)
      manifest =
        await pacote.manifest(config.template, { cache: cacheFolderPath })
    } catch (err) {
      log.trace(err)
      log.error(err.message)
      return CliExitCodes.ERROR.INPUT
    }
    log.trace(util.inspect(manifest))
    const manifestIds = new ManifestIds(manifest)
    const globalPackagePath = path.join(context.globalConfig.globalFolderPath,
      manifestIds.getPath())

    // Read the cwd package.json
    const xpack = new Xpack(config.cwd, context)
    const packFullName = manifestIds.getFullName()

    let globalJson = await xpack.isFolderPackage(globalPackagePath)
    if (!globalJson) {
      log.info(`Installing ${packFullName}...`)
      await pacote.extract(config.template, globalPackagePath,
        { cache: cacheFolderPath })

      globalJson = await xpack.isFolderPackage(globalPackagePath)
      if (!xpack.isXpack(globalJson)) {
        throw new CliError(
          'not an xPack template, ' +
          'check for the "xpack" property in package.json',
          CliExitCodes.ERROR.APPLICATION)
      }

      await xpack.checkMinimumXpmRequired(globalJson)

      if (!globalJson.main) {
        throw new CliError(
          'not an xPack template, ' +
          'check for the "main" property in package.json',
          CliExitCodes.ERROR.APPLICATION)
      }

      if (globalJson.bundledDependencies === undefined) {
        // Old templates did not bundle dependencies and
        // required a full install.
        log.info('Installing npm dependencies...')
        const spawn = new Spawn()
        // const code = await spawn.executeShellPromise(
        let result
        try {
          result = await spawn.spawnShellPromise(
            'npm install --production --color=false',
            {
              cwd: globalPackagePath,
              log
            })
        } catch (err) {
          log.verbose(err)
          await del(globalPackagePath, { force: true })
          throw new CliError(
            'install dependencies failed (npm returned error)',
            CliExitCodes.ERROR.APPLICATION)
        }
        // For just in case, the new code triggers an exception.
        const code = result.code
        if (code !== 0) {
          await del(globalPackagePath, { force: true })
          throw new CliError(
            `install dependencies failed (npm returned ${code})`,
            CliExitCodes.ERROR.APPLICATION)
        }
      }
    }

    log.info(`Processing ${packFullName}...`)

    const mainTemplatePath = path.join(globalPackagePath, globalJson.main)
    const { XpmInitTemplate } = require(mainTemplatePath)
    if (!XpmInitTemplate) {
      log.error('not an xPack template, check for XpmInitTemplate in exports')
      return CliExitCodes.ERROR.APPLICATION
    }

    // To keep things in sync and simplify template dependencies,
    // forward several objects form cli-start-options via the context.
    context.CliError = CliError
    context.CliExitCodes = CliExitCodes

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

    liquidMap.projectName = config.projectName.replace(/-xpack$/, '')
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
            cwd: os.homedir(),
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

    liquidMap.xpm = {}
    liquidMap.xpm.version = context.package.version

    const templatesPath = path.resolve(context.rootPath, 'assets', 'sources')
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

    await this.render('package-liquid.json', 'package.json', liquidMap)

    try {
      const readmePath = path.resolve(config.cwd, 'LICENSE')
      await fsPromises.access(readmePath)

      log.info('File \'LICENSE\' preserved, not overriden.')
    } catch (er) {
      // The LICENSE is not present. That's fine.
      await this.render('LICENSE-liquid', 'LICENSE', liquidMap)
    }

    return CliExitCodes.SUCCESS
  }

  async render (inputFileRelativePath, outputFileRelativePath, map) {
    const log = this.log

    const str = await this.engine.renderFile(inputFileRelativePath, map)

    // const headerPath = path.resolve(codePath, `${pnam}.h`)
    try {
      await fsPromises.writeFile(outputFileRelativePath, str, 'utf8')
    } catch (err) {
      log.trace(err)
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
