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
* The `xpm build [-- <args>]` command implementation.
*/

// ----------------------------------------------------------------------------

// const fs = require('fs')
// const path = require('path')

// const Promisifier = require('@xpack/es6-promisifier').Promisifier

// ES6: `import { CliCommand, CliExitCodes, CliError } from 'cli-start-options'
const CliCommand = require('@ilg/cli-start-options').CliCommand
const CliExitCodes = require('@ilg/cli-start-options').CliExitCodes
// const CliError = require('@ilg/cli-start-options').CliError
const CliHelp = require('@ilg/cli-start-options').CliHelp
const CliErrorApplication = require('@ilg/cli-start-options')
  .CliErrorApplication
const CliOptions = require('@ilg/cli-start-options').CliOptions

const Xpack = require('../../lib/utils/xpack.js').Xpack
const Spawn = require('../../lib/utils/spawn.js').Spawn

// ----------------------------------------------------------------------------

// Promisify functions from the Node.js callbacks library.
// New functions have similar names, but suffixed with `Promise`.
// Promisifier.promisifyInPlace(fs, 'readFile')

// const fsPromises = fs.fsPromises

// ============================================================================

class Build extends CliCommand {
  // --------------------------------------------------------------------------

  /**
  * @summary Constructor, to set help definitions.
  *
  * @param {Object} params The generic parameters object.
  */
  constructor (params) {
    super(params)

    // Title displayed with the help message.
    this.helpTitle = 'xPack manager - build package'
    this.cliOptions.addOptionsGroups(
      [
        {
          title: 'Build options',
          postOptions: '[-- <build args>]', // Extra arguments.
          optionsDefs: [
          ]
        }
      ]
    )
  }

  doOutputHelpArgsDetails (more) {
    const log = this.context.log
    if (!more.isFirstPass) {
      log.always('where:')
      log.always(`${CliHelp.padRight('  <build args>...', more.width)} ` +
        'Extra arguments for the build (optional, multiple)')
    }
  }

  /**
  * @summary Execute the `install` command.
  *
  * @param {string[]} argv Command line arguments.
  * @returns {number} Return code.
  *
  * @override
  */
  async doRun (argv) {
    const log = this.log
    log.trace(`${this.constructor.name}.doRun()`)

    log.info(this.title)
    log.info()

    const config = this.config

    this.xpack = new Xpack({
      xpackPath: config.cwd,
      log
    })
    // Read the cwd package.json
    this.xpackJson = await this.xpack.readPackageJson({
      mustBeXpack: true
    })

    const xpackJson = this.xpackJson

    const own = CliOptions.filterOwnArguments(argv)
    own.forEach((opt) => {
      log.warn(`'${opt}' ignored`)
    })

    const name = 'build'
    const scriptCmd = xpackJson.scripts[name]
    if (!scriptCmd) {
      throw new CliErrorApplication(`Missing script '${name}'`)
    }
    log.trace(`script content: '${scriptCmd}'`)

    const other = CliOptions.filterOtherArguments(argv)
    const cmd = [scriptCmd].concat(other).join(' ')
    const pack = this.xpackJson
    log.info()
    log.debug(`${pack.name}@${pack.version} ${name} '${this.rootPath}'`)
    log.info(`Changing current folder to '${process.cwd()}'...`)
    log.info(`Invoking '${cmd}'...`)
    log.info()

    const spawn = new Spawn()
    await spawn.executeShellPromise(cmd)

    this.outputDoneDuration()
    return CliExitCodes.SUCCESS
  }

  // --------------------------------------------------------------------------
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// The current class is added as a property of this object.
module.exports.Build = Build

// In ES6, it would be:
// export class Build { ... }
// ...
// import { Build } from 'install.js'

// ----------------------------------------------------------------------------
