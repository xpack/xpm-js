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

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const Promisifier = require('@ilg/es6-promisifier').Promisifier

// ES6: `import { CliCommand, CliExitCodes, CliError } from 'cli-start-options'
const CliCommand = require('@ilg/cli-start-options').CliCommand
const CliExitCodes = require('@ilg/cli-start-options').CliExitCodes
// const CliError = require('@ilg/cli-start-options').CliError
const CliHelp = require('@ilg/cli-start-options').CliHelp
// const CliApplication = require('@ilg/cli-start-options').CliApplication
const CliErrorApplication = require('@ilg/cli-start-options')
  .CliErrorApplication
const CliOptions = require('@ilg/cli-start-options').CliOptions

const Xpack = require('../../lib/utils/xpack.js').Xpack
const Spawn = require('../../lib/utils/spawn.js').Spawn

// ----------------------------------------------------------------------------

// Promisify functions from the Node.js callbacks library.
// New functions have similar names, but suffixed with `Promise`.
// Promisifier.promisifyInPlace(fs, 'readFile')
Promisifier.promisifyInPlace(fs, 'stat')

const fsPromises = fs.promises

// ============================================================================

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
        `The command associated with the script (optional)`)
      log.always(`${CliHelp.padRight('  <script args>...', more.width)} ` +
        `Extra arguments for the script (optional, multiple)`)
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

    log.info(this.title)
    const context = this.context
    const config = context.config

    // Read the cwd package.json
    this.xpack = new Xpack(config.cwd, context)
    this.xpackJson = await this.xpack.readJson()

    let code
    if (args.length === 0) {
      // Show the existing scripts
      await this.showScripts()
      code = CliExitCodes.SUCCESS
    } else {
      // Run the args[0] script; pass the other args.
      code = await this.execute(args[0], args.slice(1))
    }
    this.outputDoneDuration()
    return code
  }

  async showScripts () {
    const log = this.log
    log.trace(`${this.constructor.name}.showScripts()`)

    assert(this.xpackJson, 'Missing mandatory xPack JSON.')
    const xpackJson = this.xpackJson
    if (!xpackJson.scripts || Object.keys(xpackJson.scripts).length === 0) {
      log.warning('No \'scripts\' defined.')
      return
    }

    log.output()
    log.output(`Scripts included in xPack '${xpackJson.name}':`)
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
      throw new CliErrorApplication(`Missing script '${name}'`)
    }
    log.trace(`script content: '${scriptCmd}'`)

    const other = CliOptions.filterOtherArguments(args)
    const cmd = [scriptCmd].concat(other).join(' ')
    const pack = context.package
    log.info()
    log.debug(`${pack.name}@${pack.version} ${name} '${context.rootPath}'`)
    log.info(`Changing current folder to '${config.cwd}'...`)

    const opts = {}
    opts.cwd = config.cwd

    // Create a copy of the environment.
    const env = Object.assign({}, process.env)

    const pathArray = []

    // TODO: adjust path with xpacks/.bin, node_modules/.bin
    let p = path.join(config.cwd, 'xpacks', '.bin')
    try {
      await fsPromises.stat(p)
      pathArray.push(p)
    } catch (err) {
    }

    p = path.join(config.cwd, 'node_modules', '.bin')
    try {
      await fsPromises.stat(p)
      pathArray.push(p)
    } catch (err) {
    }

    if (process.env['PATH']) {
      pathArray.push(process.env['PATH'])
    }
    env['PATH'] = pathArray.join(process.platform === 'win32' ? ';' : ':')

    opts.env = env
    log.trace(`PATH=${env['PATH']}`)

    log.info(`Invoking '${cmd}'...`)
    log.info()
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
