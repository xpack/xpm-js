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
const path = require('path')

// ----------------------------------------------------------------------------

const { GlobalConfig } = require('../utils/global-config.js')
const { Spawn } = require('../../lib/utils/spawn.js')
const { Xpack } = require('../../lib/utils/xpack.js')

// ES6: `import { CliCommand, CliExitCodes, CliError } from 'cli-start-options'
const {
  CliCommand, CliExitCodes, CliHelp, CliErrorApplication, CliOptions
} = require('@ilg/cli-start-options')

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
    this.title = 'xPack manager - run package specific script'
    this.optionGroups = [
      {
        title: 'Run options',
        postOptions: '[<command>] [-- <script args>]', // Extra arguments.
        optionDefs: [
        ]
      }
    ]
  }

  doOutputHelpArgsDetails (more) {
    const log = this.context.log
    if (!more.isFirstPass) {
      log.always('where:')
      log.always(`${CliHelp.padRight('  <command>', more.width)} ` +
        'The command associated with the script (optional)')
      log.always(`${CliHelp.padRight('  <script args>...', more.width)} ` +
        'Extra arguments for the script (optional, multiple)')
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
    if (!xpackJson.scripts || Object.keys(xpackJson.scripts).length === 0) {
      log.warning('no \'scripts\' defined')
      return
    }

    log.verbose()
    log.verbose(`Scripts included in xPack '${xpackJson.name}':`)
    for (const [key, value] of Object.entries(xpackJson.scripts)) {
      log.output(`- ${key}`)
      log.output(`    ${value}`)
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

    const scriptCmd = xpackJson.scripts[name]
    if (!scriptCmd) {
      throw new CliErrorApplication(`missing script '${name}'`)
    }
    log.trace(`script content: '${scriptCmd}'`)

    const other = CliOptions.filterOtherArguments(args)
    const cmd = [scriptCmd].concat(other).join(' ')
    const pack = context.package
    log.verbose()
    log.debug(`${pack.name}@${pack.version} ${name} '${context.rootPath}'`)
    log.verbose(`CWD=${config.cwd}`)

    const opts = {}
    opts.cwd = config.cwd

    // Create a copy of the environment.
    const env = Object.assign({}, process.env)

    let pathArray = []

    if (process.env.PATH) {
      pathArray.push(process.env.PATH)
    }

    let p = path.join(config.cwd, 'node_modules', '.bin')
    try {
      await fsPromises.stat(p)
      pathArray = [p, ...pathArray]
    } catch (err) {
    }

    p = path.join(config.cwd, 'xpacks', '.bin')
    try {
      await fsPromises.stat(p)
      pathArray = [p, ...pathArray]
    } catch (err) {
    }

    env.PATH = pathArray.join(process.platform === 'win32' ? ';' : ':')

    opts.env = env
    log.verbose(`PATH=${env.PATH}`)

    if (log.isVerbose()) {
      log.verbose(`Invoking '${cmd}'...`)
    } else {
      log.info(`> ${cmd}`)
    }
    log.verbose()
    const spawn = new Spawn()
    const code = await spawn.executeShellPromise(cmd, opts)
    return code
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
