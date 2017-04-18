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
 * The `xpm install <options> ...` command implementation.
 */

// ----------------------------------------------------------------------------

const fs = require('fs')
// const xml2js = require('xml2js')
// const path = require('path')

// TODO: extract to a separate module
const Promisifier = require('../utils/asy.js')

// ES6: `import { CliCommand, CliExitCodes, CliError } from 'cli-start-options'
const CliCommand = require('@ilg/cli-start-options').CliCommand
const CliExitCodes = require('@ilg/cli-start-options').CliExitCodes
// const CliError = require('@ilg/cli-start-options').CliError

// ----------------------------------------------------------------------------

// Promisify functions from the Node.js library.
if (!fs.readFilePromise) {
  fs.readFilePromise = Promisifier.promisify(fs.readFile)
}

if (!fs.statPromise) {
  fs.statPromise = Promisifier.promisify(fs.stat)
}

if (!fs.mkdirPromise) {
  fs.mkdirPromise = Promisifier.promisify(fs.mkdir)
}

if (!fs.writeFilePromise) {
  fs.writeFilePromise = Promisifier.promisify(fs.writeFile)
}

// ============================================================================

class Install extends CliCommand {
  // --------------------------------------------------------------------------

  /**
   * @summary Constructor, to set help definitions.
   *
   * @param {Object} context Reference to a context.
   */
  constructor (context) {
    super(context)

    // Title displayed with the help message.
    this.title = 'Convert an ARM SVD file from XML to JSON'
    this.optionGroups = [
      {
        title: 'Convert options',
        optionDefs: [
        ]
      }
    ]
  }

  /**
   * @summary Execute the `convert` command.
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
    // const config = this.context.config

    log.info('Done.')
    return CliExitCodes.SUCCESS
  }

  // --------------------------------------------------------------------------
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// The Convert class is added as a property of this object.
module.exports.Install = Install

// In ES6, it would be:
// export class Install { ... }
// ...
// import { Install } from 'install.js'

// ----------------------------------------------------------------------------
