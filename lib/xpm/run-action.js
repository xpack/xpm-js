/*
 * This file is part of the xPack project (http://xpack.github.io).
 * Copyright (c) 2017-2025 Liviu Ionescu. All rights reserved.
 *
 * Permission to use, copy, modify, and/or distribute this software
 * for any purpose is hereby granted, under the terms of the MIT license.
 *
 * If a copy of the license was not distributed with this file, it can
 * be obtained from https://opensource.org/license/mit.
 */

'use strict'

/* eslint valid-jsdoc: "error" */
/* eslint max-len: [ "error", 80, { "ignoreUrls": true } ] */

// ----------------------------------------------------------------------------

/**
 * The `xpm run command [-- <args>]` command implementation.
 */

// ----------------------------------------------------------------------------

// https://nodejs.org/docs/latest/api/
import assert from 'assert'
import fs from 'fs'
// import os from 'os'
import path from 'path'
// import util from 'util'

// ----------------------------------------------------------------------------

// ES6: `import { CliCommand, CliExitCodes, CliError } from 'cli-start-options'
// import { CliCommand, CliExitCodes, CliHelp,
// CliError, CliErrorInput, CliOptions } from '@ilg/cli-start-options'
import cliStartOptionsCsj from '@ilg/cli-start-options'

// https://www.npmjs.com/package/@xpack/xpm-lib
import { XpmLiquidPackage, XpmPackage } from '@xpack/xpm-lib'

// ----------------------------------------------------------------------------

import { GlobalConfig } from '../utils/global-config.js'
import { Spawn } from '../utils/spawn.js'

import { isString } from '../utils/functions.js'

// ----------------------------------------------------------------------------

const fsPromises = fs.promises

// ----------------------------------------------------------------------------

const {
  CliCommand,
  CliExitCodes,
  CliHelp,
  CliError,
  CliErrorInput,
  CliOptions
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
    this.title =
      'xPack project manager - ' + 'run package/configuration specific action'
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
      log.always(
        `${CliHelp.padRight('  <action>', more.width)} ` +
          'The name of the action/script (optional)'
      )
      log.always(
        `${CliHelp.padRight('  <action_args>...', more.width)} ` +
          'Extra arguments for the action (optional, multiple)'
      )
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

    const xpmPackage = new XpmPackage({ log, folderPath: config.cwd })
    this.xpmPackage = xpmPackage

    try {
      // Read `package.json`; throw if not valid.
      this.jsonPackage = await xpmPackage.readPackageDotJsonThrow()
    } catch (err) {
      throw new CliErrorInput(err.message)
    }

    if (!xpmPackage.isNpmPackage()) {
      throw new CliErrorInput(
        'current folder is not a valid package, check for package.json'
      )
    }

    if (!xpmPackage.isXpmPackage()) {
      throw new CliErrorInput(
        'current folder is not an xpm package, ' +
          'check for the "xpack" property in package.json'
      )
    }

    try {
      await xpmPackage.checkMinimumXpmRequired(context.rootPath)
    } catch (err) {
      throw new CliError(err.message, CliExitCodes.ERROR.PREREQUISITES)
    }

    const xpmLiquidPackage = new XpmLiquidPackage({
      log,
      packageJson: this.jsonPackage
    })
    this.xpmLiquidPackage = xpmLiquidPackage

    let exitCode
    if (args.length === 0) {
      // Show the existing scripts
      await this.showScripts()
      exitCode = CliExitCodes.SUCCESS
    } else {
      await xpmLiquidPackage.buildConfigurations.initialise()
      if (
        config.isAllConfigs &&
        !xpmLiquidPackage.buildConfigurations.empty()
      ) {
        for (const buildConfigurationName of
          xpmLiquidPackage.buildConfigurations.names()) {
          const buildConfiguration = xpmLiquidPackage.buildConfigurations.get(
            buildConfigurationName
          )
          if (buildConfiguration.hidden) {
            // Ignore hidden configurations.
            continue
          }

          await buildConfiguration.actions.initialise()
          if (buildConfiguration.actions.empty()) {
            // Ignore configurations without actions.
            continue
          }

          if (!buildConfiguration.actions.has(args[0])) {
            // Ignore actions not defined by this configuration.
            continue
          }

          exitCode = await this.executeAction({
            name: args[0],
            args: args.slice(1),
            buildConfigurationName
          })
          if (exitCode !== CliExitCodes.SUCCESS && !config.isIgnoreErrors) {
            break
          }
        }
      } else {
        // Run the args[0] script; pass the other args.
        exitCode = await this.executeAction({
          name: args[0],
          args: args.slice(1),
          buildConfigurationName: config.configurationName
        })
      }
    }
    if (log.isVerbose) {
      this.outputDoneDuration()
    }
    return exitCode
  }

  async showScripts () {
    const log = this.log
    log.trace(`${this.constructor.name}.showScripts()`)

    assert(this.jsonPackage, 'missing mandatory package.json')
    const packageJson = this.jsonPackage

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

    const xpmLiquidPackage = this.xpmLiquidPackage

    await this.xpmLiquidPackage.topActions.initialise()
    if (!xpmLiquidPackage.topActions.empty()) {
      for (const actionName of xpmLiquidPackage.topActions.names()) {
        const commands = await xpmLiquidPackage.topActions
          .get(actionName)
          .commands()
        log.output(`- ${actionName}`)
        this.showCommands(commands)
        hasActions = true
      }
    }

    await this.xpmLiquidPackage.buildConfigurations.initialise()
    if (!xpmLiquidPackage.buildConfigurtions.empty()) {
      for (const buildConfigurationName of
        xpmLiquidPackage.buildConfigurtions.names()) {
        const buildConfiguration = xpmLiquidPackage.buildConfigurations.get(
          buildConfigurationName
        )
        await buildConfiguration.actions.initialise()
        if (!buildConfiguration.actions.empty()) {
          for (const actionName of buildConfiguration.actions.names()) {
            const commands = await buildConfiguration.actions
              .get(actionName)
              .commands()
            log.output(`- ${buildConfigurationName}/${actionName}`)
            this.showCommands(commands)
            hasActions = true
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

  async executeAction ({ name, args, buildConfigurationName }) {
    const log = this.log
    const context = this.context
    const config = context.config
    const packageJson = this.jsonPackage
    const xpmLiquidPackage = this.xpmLiquidPackage

    log.trace(`${this.constructor.name}.executeAction('${name}')`)

    const ownArguments = CliOptions.filterOwnArguments(args)
    ownArguments.forEach((opt) => {
      log.warn(`'${opt}' ignored`)
    })

    let buildConfiguration
    let actions

    if (buildConfigurationName) {
      // --config
      if (config.isAllConfigs) {
        if (log.isVerbose) {
          // When invoked with --all-configs, this method is called
          // multiple times, so inform the user which configuration
          // is being processed.
          log.verbose()
          log.verbose(
            `Running action ${name} for package ${packageJson.name}, ` +
              `configuration ${buildConfigurationName}...`
          )
        } else {
          log.info()
          log.info(`${packageJson.name} --config ${buildConfigurationName}...`)
        }
      }

      buildConfiguration = await xpmLiquidPackage.buildConfigurations.get(
        buildConfigurationName
      )

      await buildConfiguration.actions.initialise()
      if (!buildConfiguration.actions.has(name)) {
        throw new CliErrorInput(
          `action "${name}" not found, check the ` +
            `"xpack.buildConfigurations.${buildConfigurationName}.actions"` +
            ' property in package.json'
        )
      }
      actions = buildConfiguration.actions
    } else {
      await xpmLiquidPackage.topActions.initialise()
      if (!xpmLiquidPackage.topActions.has(name)) {
        throw new CliErrorInput(
          `action "${name}" not found, check the ` +
            '"xpack.actions" property in package.json'
        )
      }
      actions = xpmLiquidPackage.actions
    }
    const commandsArray = actions.get(name).commands
    log.trace(`action command(s): '${commandsArray}'`)

    const otherArguments = CliOptions.filterOtherArguments(args)

    if (commandsArray.length > 1 && otherArguments.length > 0) {
      throw new CliError(
        'optional arguments not supported for array of commands'
      )
    }

    const pack = context.package
    log.verbose()

    if (buildConfigurationName) {
      log.debug(
        `${pack.name}@${pack.version} ${buildConfigurationName}/${name}`
      )
    } else {
      log.debug(`${pack.name}@${pack.version} ${name}`)
    }
    log.trace(`rootPath: '${context.rootPath}'`)
    log.verbose(`CWD=${config.cwd}`)

    const opts = {}
    opts.log = log
    opts.cwd = config.cwd

    // Create a copy of the environment.
    const env = Object.assign({}, process.env)

    let pathsArray = []

    if (process.env.PATH) {
      process.env.PATH.split(path.delimiter).forEach((path_) => {
        pathsArray.push(path_)
      })
    }

    // Prefer xpacks over node_modules ("So the last shall be first"...)
    pathsArray = await this.prependPathIfPresent(
      config.cwd,
      'node_modules',
      pathsArray
    )
    pathsArray = await this.prependPathIfPresent(
      config.cwd,
      'xpacks',
      pathsArray
    )

    // Prefer configuration dependencies over global ones.
    if (buildConfigurationName) {
      // The configuration was set before.
      assert(buildConfiguration)
      const buildFolderRelativePath =
        buildConfiguration.getBuildFolderRelativePath()

      const buildPath = path.join(config.cwd, buildFolderRelativePath)
      pathsArray = await this.prependPathIfPresent(
        buildPath,
        'node_modules',
        pathsArray
      )
      pathsArray = await this.prependPathIfPresent(
        buildPath,
        'xpacks',
        pathsArray
      )
    }

    env.PATH = pathsArray.join(path.delimiter)

    opts.env = env
    log.verbose(`PATH=${env.PATH}`)

    log.verbose()

    const spawn = new Spawn()

    let exitCode = CliExitCodes.SUCCESS

    if (otherArguments.length > 0) {
      const commandWithArguments = [commandsArray[0].trim()]
        .concat(otherArguments)
        .join(' ')

      if (log.isVerbose) {
        log.verbose(`Invoking '${commandWithArguments}'...`)
      } else {
        log.info(`> ${commandWithArguments}`)
      }

      if (!config.isDryRun) {
        // code = await spawn.executeShellPromise(commandWithArguments, opts)
        let result
        try {
          result = await spawn.spawnShellPromise(commandWithArguments, opts)
          exitCode = result.code
        } catch (err) {
          log.verbose(err)
          if (config.isIgnoreErrors) {
            log.warn(`running '${commandWithArguments}' failed`)
            exitCode = CliExitCodes.SUCCESS
          } else {
            throw new CliError(`running '${commandWithArguments}' failed`)
          }
        }
      }
    } else {
      for (const command of commandsArray) {
        const trimmedCommand = command.trim()
        if (trimmedCommand) {
          if (log.isVerbose) {
            log.verbose(`Invoking '${trimmedCommand}'...`)
          } else {
            log.info(`> ${trimmedCommand}`)
          }
          if (!config.isDryRun) {
            // code = await spawn.executeShellPromise(trimmedCommand, opts)
            let result
            try {
              result = await spawn.spawnShellPromise(trimmedCommand, opts)
              exitCode = result.code
            } catch (err) {
              log.verbose(err)
              if (config.isIgnoreErrors) {
                log.warn(`running '${trimmedCommand}' failed`)
                exitCode = CliExitCodes.SUCCESS
              } else {
                throw new CliError(`running '${trimmedCommand}' failed`)
              }
            }
            if (!config.isIgnoreErrors) {
              // Break on first error.
              if (exitCode !== CliExitCodes.SUCCESS) {
                // Break on first error.
                break
              }
            }
          }
        }
      }
    }

    if (exitCode !== CliExitCodes.SUCCESS) {
      if (log.isVerbose) {
        log.verbose(`Returned error code '${exitCode}'... Not good...`)
      } else {
        log.info(`> exit(${exitCode})`)
      }
    }
    return exitCode
  }

  // --------------------------------------------------------------------------

  async prependPathIfPresent (basePath, folderName, pathArray) {
    assert(basePath)
    assert(folderName)
    assert(pathArray)

    const binPath = path.join(basePath, folderName, '.bin')
    try {
      await fsPromises.stat(binPath)
      // If the folder exists, return a new array with the binPath prepended.
      return [binPath, ...pathArray]
    } catch (err) {
      // If the folder does not exist, return the same array.
      return pathArray
    }
  }

  // --------------------------------------------------------------------------
}

// ----------------------------------------------------------------------------
