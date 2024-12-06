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
 * The `xpm run command [-- <args>]` command implementation.
 */

// ----------------------------------------------------------------------------

// https://nodejs.org/docs/latest-v12.x/api/index.htm
import assert from 'assert'
import fs from 'fs'
import os from 'os'
import path from 'path'
import util from 'util'

// ----------------------------------------------------------------------------

// ES6: `import { CliCommand, CliExitCodes, CliError } from 'cli-start-options'
// import { CliCommand, CliExitCodes, CliHelp,
// CliError, CliErrorInput, CliOptions } from '@ilg/cli-start-options'
import cliStartOptionsCsj from '@ilg/cli-start-options'

// https://www.npmjs.com/package/@xpack/xpm-liquid
import { XpmLiquid } from '@xpack/xpm-liquid'

// ----------------------------------------------------------------------------

import { GlobalConfig } from '../utils/global-config.js'
import { Spawn } from '../utils/spawn.js'
import { Xpack } from '../utils/xpack.js'

import { isString } from '../utils/functions.js'

// ----------------------------------------------------------------------------

const fsPromises = fs.promises

// ----------------------------------------------------------------------------

const {
  CliCommand, CliExitCodes, CliHelp, CliError, CliErrorInput, CliOptions
} = cliStartOptionsCsj

/// ============================================================================

export class RunAction extends CliCommand {
  // --------------------------------------------------------------------------

  /**
   * @summary Constructor, to set help definitions.
   *
   * @param {Object} context Reference to a context.
   */
  constructor (context) {
    super(context)

    // Title displayed with the help message.
    this.title = 'xPack project manager - ' +
      'run package/configuration specific action'
    this.optionGroups = [
      {
        title: 'Run options',
        postOptions: '[<action>] [-- <action_args>]', // Extra arguments.
        optionDefs: [
          {
            options: ['-c', '--config'],
            init: ({ config }) => {
              config.configurationName = undefined
            },
            action: ({ config }, val) => {
              config.configurationName = val.trim()
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
          },
          {
            options: ['-a', '--all-configs'],
            init: ({ config }) => {
              config.isAllConfigs = false
            },
            action: ({ config }) => {
              config.isAllConfigs = true
            },
            msg: 'Run the action for all configurations',
            isOptional: true
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
    const xpack = this.xpack

    // Throws if not valid.
    this.packageJson = await xpack.readPackageJson()
    this.packageJsonWithInheritance = xpack.processInheritance()

    const packageJson = this.packageJsonWithInheritance

    if (!xpack.isXpack()) {
      throw new CliErrorInput(
        'current folder not an xpm package, ' +
        'check for the "xpack" property in package.json')
    }

    await xpack.checkMinimumXpmRequired(packageJson)

    let code
    if (args.length === 0) {
      // Show the existing scripts
      await this.showScripts()
      code = CliExitCodes.SUCCESS
    } else {
      if (config.isAllConfigs && packageJson.xpack.buildConfigurations) {
        for (const [configurationName, configuration] of
          Object.entries(packageJson.xpack.buildConfigurations)) {
          if (configuration.hidden) {
            // Ignore hidden configurations.
            continue
          }

          if (!configuration.actions) {
            // Ignore configurations without actions.
            continue
          }
          const commandsArray = configuration.actions[args[0]]
          if (!commandsArray) {
            // Ignore actions not defined by this configuration.
            continue
          }

          code = await this.executeAction({
            name: args[0],
            args: args.slice(1),
            configurationName
          })
          if (code !== CliExitCodes.SUCCESS && !config.isIgnoreErrors) {
            break
          }
        }
      } else {
        // Run the args[0] script; pass the other args.
        code = await this.executeAction({
          name: args[0],
          args: args.slice(1),
          configurationName: config.configurationName
        })
      }
    }
    if (log.isVerbose()) {
      this.outputDoneDuration()
    }
    return code
  }

  async showScripts () {
    const log = this.log
    log.trace(`${this.constructor.name}.showScripts()`)

    assert(this.packageJsonWithInheritance, 'missing mandatory package.json')
    const packageJson = this.packageJsonWithInheritance

    let hasActions = false
    log.verbose()
    log.verbose(`Scripts included in xpm package '${packageJson.name}':`)
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

      const enumerateConfigurations = (from) => {
        for (const [configurationName, configuration] of
          Object.entries(from)) {
          if (configuration.actions) {
            for (const [key, value] of Object.entries(configuration.actions)) {
              log.output(`- ${configurationName}/${key}`)
              this.showCommands(value)
              hasActions = true
            }
          }
        }
      }
      if (packageJson.xpack.buildConfigurations) {
        enumerateConfigurations(packageJson.xpack.buildConfigurations)
      }
      // TODO: Legacy, remove it at some point.
      if (packageJson.xpack.configurations) {
        enumerateConfigurations(packageJson.xpack.configurations)
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

  async executeAction ({ name, args, configurationName }) {
    const log = this.log
    const context = this.context
    const config = context.config
    const xpack = this.xpack
    const packageJson = this.packageJsonWithInheritance

    log.trace(`${this.constructor.name}.executeAction('${name}')`)

    const ownArguments = CliOptions.filterOwnArguments(args)
    ownArguments.forEach((opt) => {
      log.warn(`'${opt}' ignored`)
    })

    const liquidEngine = new XpmLiquid(log)
    let liquidMap
    try {
      liquidMap = liquidEngine.prepareMap(packageJson,
        configurationName) // May be undefined!
    } catch (err) {
      log.trace(util.inspect(err))
      throw new CliError(err.message)
    }

    assert(packageJson.xpack)

    let commandsArray
    let configuration

    if (configurationName) {
      // --config
      if (config.isAllConfigs) {
        if (log.isVerbose()) {
          log.verbose()
          log.verbose(
            `Running action ${name} for package ${packageJson.name}, ` +
            `configuration ${configurationName}...`)
        } else {
          log.info()
          log.info(`${packageJson.name} --config ${configurationName}...`)
        }
      }

      configuration =
        xpack.retrieveConfiguration({
          packageJson,
          configurationName
        })

      if (!configuration.actions) {
        throw new CliErrorInput('missing ' +
          `"xpack.buildConfigurations.${configurationName}.actions" ` +
          'property in package.json')
      }
      commandsArray = configuration.actions[name]
      if (!commandsArray) {
        throw new CliErrorInput('missing "xpack.buildConfigurations.' +
          `${configurationName}.actions.${name}" ` +
          'property in package.json')
      }

      // The value is also stored in liquidMap.properties.
      await xpack.computeBuildFolderRelativePath({
        configurationName,
        configuration,
        liquidEngine,
        liquidMap
      })

      // As a side effect, this also populates the liquidMap.

      if (log.isTrace()) {
        log.trace(`liquidMap: ${util.inspect(liquidMap)}`)
      }

      log.trace(`initial action: '${commandsArray}'`)
    } else {
      // Prefer actions defined in the "xpack" property.
      if (packageJson.xpack.actions) {
        commandsArray = packageJson.xpack.actions[name]
      }
      if (!commandsArray) {
        // But, for compatibility reasons also accept the npm scripts.
        if (packageJson.scripts) {
          commandsArray = packageJson.scripts[name]
        }
      }
      if (!commandsArray) {
        throw new CliErrorInput(
          `action "${name}" not found in package.json, ` +
          'check "xpack.actions" or "scripts" ')
      }
      log.trace(`script command: '${commandsArray}'`)
    }

    if (isString(commandsArray)) {
      commandsArray = [commandsArray]
    }

    try {
      commandsArray = (await liquidEngine.performSubstitutions(
        commandsArray.join(os.EOL), liquidMap)).split(os.EOL)
    } catch (err) {
      log.trace(util.inspect(err))
      throw new CliError(err.message)
    }
    const otherArguments = CliOptions.filterOtherArguments(args)

    if (commandsArray.length > 1 && otherArguments.length > 0) {
      throw new CliError(
        'optional arguments not supported for array of commands')
    }

    const pack = context.package
    log.verbose()

    if (configurationName) {
      log.debug(
        `${pack.name}@${pack.version} ${configurationName}/${name}`)
    } else {
      log.debug(`${pack.name}@${pack.version} ${name}`)
    }
    log.trace(`rootPath '${context.rootPath}'`)
    log.verbose(`CWD=${config.cwd}`)

    const opts = {}
    opts.log = log
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

    // Prefer configuration dependencies over global ones.
    if (configurationName) {
      // The configuration was set before.
      assert(configuration)
      const buildFolderRelativePath =
        await xpack.computeBuildFolderRelativePath({
          liquidEngine,
          liquidMap,
          configuration,
          configurationName
        })

      const buildPath = path.join(config.cwd, buildFolderRelativePath)
      pathsArray = await this.prependPath(buildPath, 'node_modules', pathsArray)
      pathsArray = await this.prependPath(buildPath, 'xpacks', pathsArray)
    }

    env.PATH = pathsArray.join(path.delimiter)

    opts.env = env
    log.verbose(`PATH=${env.PATH}`)

    log.verbose()

    const spawn = new Spawn()

    let code = CliExitCodes.SUCCESS

    if (otherArguments.length > 0) {
      const commandWithArguments =
        [commandsArray[0].trim()].concat(otherArguments).join(' ')

      if (log.isVerbose()) {
        log.verbose(`Invoking '${commandWithArguments}'...`)
      } else {
        log.info(`> ${commandWithArguments}`)
      }

      if (!config.isDryRun) {
        // code = await spawn.executeShellPromise(commandWithArguments, opts)
        let result
        try {
          result = await spawn.spawnShellPromise(commandWithArguments, opts)
          code = result.code
        } catch (err) {
          log.verbose(err)
          if (config.isIgnoreErrors) {
            log.warn(`running '${commandWithArguments}' failed`)
            code = CliExitCodes.SUCCESS
          } else {
            throw new CliError(`running '${commandWithArguments}' failed`)
          }
        }
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
            // code = await spawn.executeShellPromise(trimmedCommand, opts)
            let result
            try {
              result = await spawn.spawnShellPromise(trimmedCommand, opts)
              code = result.code
            } catch (err) {
              log.verbose(err)
              if (config.isIgnoreErrors) {
                log.warn(`running '${trimmedCommand}' failed`)
                code = CliExitCodes.SUCCESS
              } else {
                throw new CliError(
                  `running '${trimmedCommand}' failed`)
              }
            }
            if (!config.isIgnoreErrors) {
              // Break on first error.
              if (code !== CliExitCodes.SUCCESS) {
                // Break on first error.
                break
              }
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
// module.exports.RunAction = RunAction

// In ES6, it would be:
// export class RunAction { ... }
// ...
// import { RunAction } from 'run-action.js'

// ----------------------------------------------------------------------------
