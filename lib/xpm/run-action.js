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
 * The `xpm run command [-- <args>]` command implementation.
 */

// ----------------------------------------------------------------------------

// https://nodejs.org/docs/latest-v10.x/api/
const assert = require('assert')
const fsPromises = require('fs').promises
// const os = require('os')
const path = require('path')
const util = require('util')

// ----------------------------------------------------------------------------

const { GlobalConfig } = require('../utils/global-config.js')
const { Spawn } = require('../utils/spawn.js')
const { Xpack } = require('../utils/xpack.js')

// ES6: `import { CliCommand, CliExitCodes, CliError } from 'cli-start-options'
const {
  CliCommand, CliExitCodes, CliHelp, CliErrorApplication, CliOptions
} = require('@ilg/cli-start-options')

const { isString } = require('../utils/functions.js')

/// ============================================================================

class RunAction extends CliCommand {
  // --------------------------------------------------------------------------

  /**
   * @summary Constructor, to set help definitions.
   *
   * @param {Object} context Reference to a context.
   */
  constructor (context) {
    super(context)

    // Title displayed with the help message.
    this.title = 'xPack manager - run package/configuration specific action'
    this.optionGroups = [
      {
        title: 'Run options',
        postOptions: '[<action>] [-- <action_args>]', // Extra arguments.
        optionDefs: [
          {
            options: ['-c', '--config'],
            init: ({ config }) => {
              config.configurationName = null
            },
            action: ({ config }, val) => {
              config.configurationName = val
            },
            msg: 'Run the configuration specific action',
            param: 'config_name',
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
            msg: 'Pretend to run the action',
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
      log.always(`${CliHelp.padRight('  <action_args>...', more.width)} ` +
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
    this.packageJson = await this.xpack.readPackageJson()

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

    assert(this.packageJson, 'missing mandatory package.json')
    const packageJson = this.packageJson

    let hasActions = false
    log.verbose()
    log.verbose(`Scripts included in xPack '${packageJson.name}':`)
    if (packageJson.scripts) {
      for (const [key, value] of Object.entries(packageJson.scripts)) {
        log.output(`- ${key}`)
        this.showCommands(value)
        hasActions = true
      }
    }
    if (packageJson.xpack) {
      if (packageJson.xpack.actions) {
        for (const [key, value] of Object.entries(packageJson.xpack.actions)) {
          log.output(`- ${key}`)
          this.showCommands(value)
          hasActions = true
        }
      }
      if (packageJson.xpack.configurations) {
        for (const [configurationName, configuration] of
          Object.entries(packageJson.xpack.configurations)) {
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

    const packageJson = this.packageJson

    const ownArguments = CliOptions.filterOwnArguments(args)
    ownArguments.forEach((opt) => {
      log.warn(`'${opt}' ignored`)
    })

    const { liquidEngine, liquidMap } = this.xpack.prepareLiquidEngine()

    liquidMap.package = this.packageJson

    let commandsArray
    let buildFolderRelativePath

    if (config.configurationName) {
      // --config
      const jsonXpackConfiguration =
        this.xpack.retrieveConfiguration({
          packageJson,
          configurationName: config.configurationName
        })

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

      // Add the name and a shallow copy of the JSON configuration.
      liquidMap.configuration = {
        name: config.configurationName,
        ...jsonXpackConfiguration
      }

      buildFolderRelativePath =
        await this.xpack.computeBuildFolderRelativePath({
          packageJson,
          configurationName: config.configurationName,
          liquidEngine,
          liquidMap
        })

      // Add resolved build path to configuration.
      liquidMap.configuration.buildFolderRelativePath = buildFolderRelativePath

      if (log.isVerbose()) {
        log.verbose(`liquidMap: ${util.inspect(liquidMap)}`)
      }

      log.trace(`initial action: '${commandsArray}'`)
    } else {
      // Prefer actions defined in the "xpack" property.
      if (packageJson.xpack.actions) {
        commandsArray = packageJson.xpack.actions[name]
      }
      if (!commandsArray) {
        // But, for compatibily reasons also accept the npm scripts.
        if (packageJson.scripts) {
          commandsArray = packageJson.scripts[name]
        }
      }
      if (!commandsArray) {
        throw new CliErrorApplication(
          `action "${name}" not found in package.json; ` +
          'check "xpack.actions" or "scripts" ')
      }
      log.trace(`script command: '${commandsArray}'`)
    }

    if (isString(commandsArray)) {
      commandsArray = [commandsArray]
    }

    commandsArray = (await this.xpack.performLiquidSubstitutions({
      inputString: commandsArray.join('\n'),
      liquidEngine,
      liquidMap
    })
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

    // Prefer xpacks over node_modules ("So the last shall be first"...)
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
              break
            }
          }
        }
      }
    }

    if (code !== CliExitCodes.SUCCESS) {
      if (log.isVerbose()) {
        log.verbose(`Returned error code '${code}'... Not good...`)
      } else {
        log.info(`> exit(${code})`)
      }
    }
    return code
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
module.exports.RunAction = RunAction

// In ES6, it would be:
// export class RunAction { ... }
// ...
// import { RunAction } from 'run-action.js'

// ----------------------------------------------------------------------------
