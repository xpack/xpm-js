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
 * The `xpm init` command implementation.
 */

// ----------------------------------------------------------------------------

// https://nodejs.org/docs/latest-v12.x/api/index.htm
import fs from 'fs'
import os from 'os'
import path from 'path'
import util from 'util'

// ----------------------------------------------------------------------------

// https://www.npmjs.com/package/del
import { deleteAsync } from 'del'

// https://www.npmjs.com/package/liquidjs
import { Liquid } from 'liquidjs'
// import liquidjsCsj from 'liquidjs'

// https://www.npmjs.com/package/pacote
import pacote from 'pacote'

// https://www.npmjs.com/package/parse-git-config
import parseGitConfig from 'parse-git-config'

// ----------------------------------------------------------------------------

// ES6: `import { CliCommand, CliExitCodes, CliError } from 'cli-start-options'
import cliStartOptionsCsj from '@ilg/cli-start-options'

// https://www.npmjs.com/package/@npmcli/arborist
import { Arborist } from '@npmcli/arborist'

// ----------------------------------------------------------------------------

import { GlobalConfig } from '../utils/global-config.js'

import { ManifestIds, Xpack } from '../utils/xpack.js'
import { Policies } from '../utils/policies.js'
import { Spawn } from '../../lib/utils/spawn.js'

// ----------------------------------------------------------------------------

// const { Liquid } = liquidjsCsj
const { CliCommand, CliExitCodes, CliError } = cliStartOptionsCsj
const fsPromises = fs.promises

// ============================================================================

export class Init extends CliCommand {
  // --------------------------------------------------------------------------

  /**
   * @summary Constructor, to set help definitions.
   *
   * @param {Object} context Reference to a context.
   */
  constructor (context) {
    super(context)

    // Title displayed with the help message.
    this.title = 'xPack project manager - create an xpm package, ' +
      'empty or from a template'
    this.optionGroups = [
      {
        title: 'Init options',
        optionDefs: [
          {
            options: ['-t', '--template'],
            param: 'xpack',
            msg: 'The xpm package implementing the template',
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
          },
          {
            options: ['--ignore-errors'],
            init: ({ config }) => {
              config.isIgnoreErrors = false
            },
            action: ({ config }) => {
              config.isIgnoreErrors = true
            },
            msg: 'Ignore script errors',
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
   * @returns {number} Process exit code.
   *
   * @override
   */
  async doRun (args) {
    const log = this.log
    log.trace(`${this.constructor.name}.doRun()`)

    log.verbose(this.title)

    // Extra options are not caught by CLI and must be checked/filtered here.
    args.forEach((element) => {
      if (element.startsWith('-')) {
        log.warn(`'${element}' ignored`)
      }
    })

    const context = this.context
    const config = context.config

    log.info()

    this.xpack = new Xpack(config.cwd, context)
    const xpack = this.xpack

    try {
      this.packageJson = await xpack.readPackageJson()
    } catch (err) {
      // The package.json is not present. That's fine, proceed to create it.
      this.packageJson = null
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

    const xpmVersion = context.package.version.split('-', 1)[0]
    this.policies = new Policies(xpmVersion, context)

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

    const xpack = this.xpack
    if (xpack.isPackage()) {
      log.error('the destination folder already has a package.json file')
      return CliExitCodes.ERROR.OUTPUT // Possible override.
    }

    context.globalConfig = new GlobalConfig()

    const cacheFolderPath = context.globalConfig.cacheFolderPath
    let manifest
    try {
      log.info(`Checking package ${config.template} metadata...`)
      manifest =
        await pacote.manifest(config.template,
          { cache: cacheFolderPath })
    } catch (err) {
      log.trace(util.inspect(err))
      log.error(err.message)
      return CliExitCodes.ERROR.INPUT
    }
    log.trace(util.inspect(manifest))
    const manifestIds = new ManifestIds(manifest, this.policies)
    const globalPackagePath = path.join(context.globalConfig.globalFolderPath,
      manifestIds.getPath())

    const packFullName = manifestIds.getFullName()

    let globalJson = await xpack.isFolderPackage(globalPackagePath)
    if (!globalJson) {
      log.info(`Installing ${packFullName}...`)
      await pacote.extract(config.template, globalPackagePath,
        { cache: cacheFolderPath, Arborist })

      globalJson = await xpack.isFolderPackage(globalPackagePath)
      if (!xpack.isXpack(globalJson)) {
        throw new CliError(
          'not an xpm package template, ' +
          'check for the "xpack" property in package.json',
          CliExitCodes.ERROR.APPLICATION)
      }

      await xpack.checkMinimumXpmRequired(globalJson)

      if (!globalJson.main) {
        throw new CliError(
          'not an xpm package template, ' +
          'check for the "main" property in package.json',
          CliExitCodes.ERROR.APPLICATION)
      }

      // Keep bundled for compatibility.
      if (globalJson.bundleDependencies === undefined &&
          globalJson.bundledDependencies === undefined) {
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
          await deleteAsync(globalPackagePath, { force: true })
          throw new CliError(
            'install dependencies failed (npm returned error)',
            CliExitCodes.ERROR.APPLICATION)
        }
        // For just in case, the new code triggers an exception.
        const code = result.code
        if (code !== 0) {
          await deleteAsync(globalPackagePath, { force: true })
          throw new CliError(
            `install dependencies failed (npm returned ${code})`,
            CliExitCodes.ERROR.APPLICATION)
        }
      }
    }

    log.info(`Processing ${packFullName}...`)

    const mainTemplatePath = path.join(globalPackagePath, globalJson.main)
    // Use dynamic import.
    // On Windows, absolute paths start with a drive letter, and the
    // explicit `file://` is mandatory.
    const { XpmInitTemplate } =
      await import(`file://${mainTemplatePath.toString()}`)
    if (!XpmInitTemplate) {
      log.error('not an xpm package template, ' +
        'check for "XpmInitTemplate" in exports')
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

    const xpack = this.xpack

    const liquidMap = {}

    liquidMap.projectName = config.projectName.replace(/-xpack$/, '')
    // Return original if not a match.
    liquidMap.gitProjectName = config.projectName.replace(
      /^[@][a-zA-Z0-9-_]+[/]([a-zA-Z0-9-_]+)$/, '$1')

    const author = {}
    author.name = '<author-name>'
    author.email = '<author-email>'
    author.url = '<author-url>'

    let gitConfig = null
    try {
      gitConfig = await parseGitConfig.promise()
    } catch (err) {
    }
    if (gitConfig === null) {
      try {
        gitConfig = await parseGitConfig.promise(
          {
            cwd: os.homedir(),
            path: '.gitconfig'
          }
        )
      } catch (err) {
        // ENOENT: no such file or directory, stat '/github/home/.gitconfig'
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
    liquidMap.xpm.version = context.package.version.split('-', 1)[0]

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

    if (xpack.isPackage()) {
      if (xpack.isXpack()) {
        if (config.isIgnoreErrors) {
          log.warn('the destination folder is already an xpm package')
          return CliExitCodes.SUCCESS
        } else {
          log.error('the destination folder is already an xpm package')
          return CliExitCodes.ERROR.OUTPUT // Possible override.
        }
      } else {
        log.verbose('Adding the xpack property to package.json')

        this.packageJson.xpack = {
          minimumXpmRequired: liquidMap.xpm.version,
          dependencies: {},
          devDependencies: {},
          properties: {},
          actions: {},
          buildConfigurations: {}
        }

        if (!Array.isArray(this.packageJson.keywords)) {
          this.packageJson.keywords = []
        }
        if (!this.packageJson.keywords.includes('xpack')) {
          this.packageJson.keywords.push('xpack')
        }

        await xpack.rewritePackageJson()
      }
    } else {
      log.info(`Creating project '${liquidMap.projectName}'...`)

      await this.render('package-liquid.json', 'package.json', liquidMap)
    }

    try {
      const readmePath = path.resolve(config.cwd, 'LICENSE')
      await fsPromises.access(readmePath)

      log.info('File \'LICENSE\' preserved, not overridden')
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
      log.trace(util.inspect(err))
      throw new CliError(err.message, CliExitCodes.ERROR.OUTPUT)
    }
    log.info(`File '${outputFileRelativePath}' generated`)
  }

  // --------------------------------------------------------------------------
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// The current class is added as a property of this object.
// module.exports.Init = Init

// In ES6, it would be:
// export class Init { ... }
// ...
// import { Init } from 'init.js'

// ----------------------------------------------------------------------------
