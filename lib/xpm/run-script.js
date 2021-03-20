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

// https://nodejs.org/docs/latest-v10.x/api/
const assert = require('assert')
const fsPromises = require('fs').promises
const os = require('os')
const path = require('path')
const util = require('util')

// ----------------------------------------------------------------------------

// https://www.npmjs.com/package/liquidjs
const { Liquid } = require('liquidjs')

// ----------------------------------------------------------------------------

const { GlobalConfig } = require('../utils/global-config.js')
const { Spawn } = require('../../lib/utils/spawn.js')
const { Xpack } = require('../../lib/utils/xpack.js')

// ES6: `import { CliCommand, CliExitCodes, CliError } from 'cli-start-options'
const {
  CliCommand, CliExitCodes, CliHelp, CliError, CliErrorApplication, CliOptions
} = require('@ilg/cli-start-options')

const { isString } = require('../../lib/utils/functions.js')

/// ============================================================================

class RunScript extends CliCommand {
  // --------------------------------------------------------------------------

  /**
   * @summary Constructor, to set help definitions.
   *
   * @param {Object} context Reference to a context.
   */
  constructor (context) {
    super(context)

    // Title displayed with the help message.
    this.title = 'xPack manager - run package specific action/script'
    this.optionGroups = [
      {
        title: 'Run options',
        postOptions: '[<action>] [-- <action args>]', // Extra arguments.
        optionDefs: [
          {
            options: ['-c', '--config'],
            init: ({ config }) => {
              config.configurationName = null
            },
            action: ({ config }, val) => {
              config.configurationName = val
            },
            msg: 'Configuration name',
            param: 'string',
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
            msg: 'Prepare but do not run commands',
            isOptional: true
          }
        ]
      }
    ]
  }

  doOutputHelpArgsDetails (more) {
    const log = this.context.log
    if (!more.isFirstPass) {
      log.always('where:')
      log.always(`${CliHelp.padRight('  <action>', more.width)} ` +
        'The name of the action/script (optional)')
      log.always(`${CliHelp.padRight('  <action args>...', more.width)} ` +
        'Extra arguments for the action (optional, multiple)')
    }
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
    const context = this.context
    const config = context.config

    context.globalConfig = new GlobalConfig()

    await context.globalConfig.checkDeprecatedFolders(log)

    // Read the cwd package.json
    this.xpack = new Xpack(config.cwd, context)
    this.xpackJson = await this.xpack.readPackageJson()

    let code
    if (args.length === 0) {
      // Show the existing scripts
      await this.showScripts()
      code = CliExitCodes.SUCCESS
    } else {
      // Run the args[0] script; pass the other args.
      code = await this.execute(args[0], args.slice(1))
    }
    if (log.isVerbose()) {
      this.outputDoneDuration()
    }
    return code
  }

  async showScripts () {
    const log = this.log
    log.trace(`${this.constructor.name}.showScripts()`)

    assert(this.xpackJson, 'missing mandatory xPack JSON')
    const xpackJson = this.xpackJson

    let hasActions = false
    log.verbose()
    log.verbose(`Scripts included in xPack '${xpackJson.name}':`)
    if (xpackJson.scripts) {
      for (const [key, value] of Object.entries(xpackJson.scripts)) {
        log.output(`- ${key}`)
        this.showCommands(value)
        hasActions = true
      }
    }
    if (xpackJson.xpack) {
      if (xpackJson.xpack.actions) {
        for (const [key, value] of Object.entries(xpackJson.xpack.actions)) {
          log.output(`- ${key}`)
          this.showCommands(value)
          hasActions = true
        }
      }
      if (xpackJson.xpack.configurations) {
        for (const [configurationName, configuration] of
          Object.entries(xpackJson.xpack.configurations)) {
          if (configuration.actions) {
            for (const [key, value] of Object.entries(configuration.actions)) {
              log.output(`- ${configurationName}/${key}`)
              this.showCommands(value)
              hasActions = true
            }
          }
        }
      }
    }

    if (!hasActions) {
      log.warn('no actions/scripts defined in package.json')
    }
  }

  showCommands (value) {
    const log = this.log
    if (isString(value)) {
      log.output(`    ${value}`)
    } else if (Array.isArray(value)) {
      for (const oneValue of value) {
        log.output(`    ${oneValue}`)
      }
    }
  }

  async execute (name, args) {
    const log = this.log
    const context = this.context
    const config = context.config

    log.trace(`${this.constructor.name}.execute('${name}')`)

    const xpackJson = this.xpackJson

    const own = CliOptions.filterOwnArguments(args)
    own.forEach((opt) => {
      log.warn(`'${opt}' ignored`)
    })

    // https://liquidjs.com/
    const liquidEngine = new Liquid({
      strictFilters: true,
      strictVariables: true,
      trimTagLeft: false,
      trimTagRight: false,
      trimValueLeft: false,
      trimValueRight: false,
      greedy: false
    })

    // Register tag `{% endl %}` to insert a new line in the output string.
    liquidEngine.registerTag('endl', {
      render: async () => {
        return '\n'
      }
    })

    const liquidMap = {
      package: this.xpackJson,
      os,
      path
    }
    // The `configuration` property is added later, when available.

    let commandsArray
    let buildFolderRelativePath

    if (config.configurationName) {
      if (!xpackJson.xpack.configurations) {
        throw new CliErrorApplication(
          'missing "xpack.configurations" property in package.json')
      }
      const jsonXpackConfiguration =
        xpackJson.xpack.configurations[config.configurationName]
      if (!jsonXpackConfiguration) {
        throw new CliErrorApplication(
          `missing "xpack.configurations.${config.configurationName}" ` +
          'property in package.json')
      }
      if (!jsonXpackConfiguration.actions) {
        throw new CliErrorApplication('missing ' +
          `"xpack.configurations.${config.configurationName}.actions" ` +
          'property in package.json')
      }
      commandsArray = jsonXpackConfiguration.actions[name]
      if (!commandsArray) {
        throw new CliErrorApplication('missing "xpack.configurations.' +
          `${config.configurationName}.actions.${name}" ` +
          'property in package.json')
      }

      buildFolderRelativePath = jsonXpackConfiguration.buildFolderRelativePath
      if (!buildFolderRelativePath) {
        if (xpackJson.xpack.properties) {
          buildFolderRelativePath =
            xpackJson.xpack.properties.buildFolderRelativePath
        }
      }
      if (!buildFolderRelativePath) {
        buildFolderRelativePath = `build/${config.configurationName}`
        log.warn('neither "configuration.buildFolderRelativePath" nor ' +
          '"xpack.properties.buildFolderRelativePath" were found in ' +
          'package.json; using default ' + `"${buildFolderRelativePath}"...`)
      }

      // Add name and a shallow copy of the JSON configuration.
      liquidMap.configuration = {
        name: config.configurationName,
        ...jsonXpackConfiguration
      }

      buildFolderRelativePath = await this.performSubstitutions(
        buildFolderRelativePath, liquidEngine, liquidMap)

      // Add resolved build path to configuration.
      liquidMap.configuration.buildFolderRelativePath = buildFolderRelativePath

      if (log.isVerbose()) {
        log.verbose(`liquidMap: ${util.inspect(liquidMap)}`)
      }

      log.trace(`initial action: '${commandsArray}'`)
    } else {
      // Prefer actions defined in the "xpack" property.
      if (xpackJson.xpack.actions) {
        commandsArray = xpackJson.xpack.actions[name]
      }
      if (!commandsArray) {
        // But, for compatibily reasons also accept the npm scripts.
        if (xpackJson.scripts) {
          commandsArray = xpackJson.scripts[name]
        }
      }
      if (!commandsArray) {
        throw new CliErrorApplication(
          `action "${name}" not found in package.json;` +
          'check "xpack.actions" or "scripts" ')
      }
      log.trace(`script command: '${commandsArray}'`)
    }

    if (isString(commandsArray)) {
      commandsArray = [commandsArray]
    }

    commandsArray = (await this.performSubstitutions(
      commandsArray.join('\n'), liquidEngine, liquidMap)
    ).split('\n')

    const otherArguments = CliOptions.filterOtherArguments(args)

    if (commandsArray.length > 0 && otherArguments.length > 0) {
      throw new CliErrorApplication(
        'optional arguments not supported for array of commands')
    }

    const pack = context.package
    log.verbose()
    if (config.configurationName) {
      log.debug(
        `${pack.name}@${pack.version} ${config.configurationName}/${name}`)
    } else {
      log.debug(`${pack.name}@${pack.version} ${name}`)
    }
    log.trace(`rootPath '${context.rootPath}'`)
    log.verbose(`CWD=${config.cwd}`)

    const opts = {}
    opts.cwd = config.cwd

    // Create a copy of the environment.
    const env = Object.assign({}, process.env)

    let pathsArray = []

    if (process.env.PATH) {
      process.env.PATH.split(path.delimiter).forEach(
        (path_) => { pathsArray.push(path_) }
      )
    }

    pathsArray = await this.prependPath(config.cwd, 'node_modules', pathsArray)
    pathsArray = await this.prependPath(config.cwd, 'xpacks', pathsArray)

    env.PATH = pathsArray.join(path.delimiter)

    opts.env = env
    log.verbose(`PATH=${env.PATH}`)

    log.verbose()

    const spawn = new Spawn()

    let code = CliExitCodes.SUCCESS

    if (otherArguments.lenth > 0) {
      const commandWithArguments =
        [commandsArray[0].trim()].concat(otherArguments).join(' ')

      if (log.isVerbose()) {
        log.verbose(`Invoking '${commandWithArguments}'...`)
      } else {
        log.info(`> ${commandWithArguments}`)
      }

      if (!config.isDryRun) {
        code = await spawn.executeShellPromise(commandWithArguments, opts)
      }
    } else {
      for (const command of commandsArray) {
        const trimmedCommand = command.trim()
        if (trimmedCommand) {
          if (log.isVerbose()) {
            log.verbose(`Invoking '${trimmedCommand}'...`)
          } else {
            log.info(`> ${trimmedCommand}`)
          }
          if (!config.isDryRun) {
            code = await spawn.executeShellPromise(trimmedCommand, opts)
            if (code !== 0) {
              // Break on first error.
              return code
            }
          }
        }
      }
    }

    return code
  }

  // --------------------------------------------------------------------------

  async performSubstitutions (inputString, liquidEngine, liquidMap) {
    const log = this.log

    let newString = inputString

    // Iterate until all substitutions are done.
    while (newString.includes('{{') || newString.includes('{%')) {
      try {
        newString = await liquidEngine.parseAndRender(newString, liquidMap)
        log.trace(`expanded: '${newString}'`)
      } catch (err) {
        throw new CliError(err.message, CliExitCodes.ERROR.INPUT)
      }
    }
    return newString
  }

  // --------------------------------------------------------------------------

  async prependPath (basePath, folderName, pathArray) {
    assert(basePath)
    assert(folderName)
    assert(pathArray)

    const binPath = path.join(basePath, folderName, '.bin')
    try {
      await fsPromises.stat(binPath)
      // If the folder exists, prepend.
      return [binPath, ...pathArray]
    } catch (err) {
      // If the folder does not exist, return the same array.
      return pathArray
    }
  }

  // --------------------------------------------------------------------------
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// The current class is added as a property of this object.
module.exports.RunScript = RunScript

// In ES6, it would be:
// export class RunScript { ... }
// ...
// import { RunScript } from 'run-script.js'

// ----------------------------------------------------------------------------
