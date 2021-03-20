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
 * The Xpm main module.
 *
 * It is re-exported publicly by `index.js`.
 *
 * To import classes from this module into Node.js applications, use:
 *
 * ```javascript
 * const Xpm = require('xpm').Xpm
 * ```
 */

// ----------------------------------------------------------------------------

// https://nodejs.org/docs/latest-v10.x/api/
const path = require('path')

// ----------------------------------------------------------------------------

// ES6: `import { CliApplication, CliOptions } from 'cli-start-options'
const { CliApplication, CliOptions } = require('@ilg/cli-start-options')

// ============================================================================

// export
class Xpm extends CliApplication {
  // --------------------------------------------------------------------------

  /**
   * @summary Initialise the application class object.
   *
   * @returns {undefined} Nothing.
   *
   * @description
   * Initialise the options manager with application
   * specific commands and common options.
   *
   * @override
   */
  static doInitialise () {
    const Self = this

    // ------------------------------------------------------------------------
    // Mandatory, must be set here, not in the library, since it takes
    // the shortcut of using `__dirname` of the main file.
    Self.rootPath = path.dirname(__dirname)

    // Enable -i|--interactive
    Self.hasInteractiveMode = true

    // ------------------------------------------------------------------------
    // Initialise the tree of known commands.
    // Paths should be relative to the package root.
    CliOptions.addCommand(
      ['install', 'i', 'intstall'],
      'lib/xpm/install.js')
    CliOptions.addCommand(
      ['run', 'rum', 'ru', 'run-action', 'run-script'],
      'lib/xpm/run-action.js')
    CliOptions.addCommand(
      ['init', 'ini'],
      'lib/xpm/init.js')
    CliOptions.addCommand(
      ['link', 'lnk'],
      'lib/xpm/link.js')
    CliOptions.addCommand(
      ['list', 'ls', 'll'],
      'lib/xpm/list.js')
    CliOptions.addCommand(
      ['uninstall', 'un', 'uni', 'unin', 'unintsall', 'unlink', 'rm', 'r'],
      'lib/xpm/uninstall.js')

    // 24 hours in seconds.
    Self.checkUpdatesIntervalSeconds = 60 * 60 * 24

    // The common options were already initialised by the caller,
    // and are ok, no need to redefine them.
  }

  // --------------------------------------------------------------------------

  // Constructor: use parent definition.
  // main(): use parent definition
  // help(): use parent definition.

  // (isn't object oriented code reuse great?)
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// The current class is added as a property to this object.

module.exports.Xpm = Xpm

// In ES6, it would be:
// export class Xpm { ... }
// ...
// import { Xpm } from 'xpm.js'

// ----------------------------------------------------------------------------
