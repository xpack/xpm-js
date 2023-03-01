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

import fs from 'fs'

// https://nodejs.org/docs/latest-v12.x/api/index.htm
import path from 'path'

import { fileURLToPath } from 'url'

// ----------------------------------------------------------------------------

// ES6: `import { CliApplication, CliOptions } from 'cli-start-options'
import cliStartOptionsCsj from '@ilg/cli-start-options'

// ----------------------------------------------------------------------------

const { CliApplication, CliOptions } = cliStartOptionsCsj
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ============================================================================

// export
export class Xpm extends CliApplication {
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
      ['install', 'i', 'intsall'],
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

    // ------------------------------------------------------------------------

    // Hack!
    // For unknown reasons, on Windows these definitions are not available.
    if (process.platform === 'win32') {
      if (fs.constants.S_IWUSR === undefined) {
        fs.constants.S_IWUSR = 128 // 0200
      }
      if (fs.constants.S_IWGRP === undefined) {
        fs.constants.S_IWGRP = 16 // 0020
      }
      if (fs.constants.S_IWOTH === undefined) {
        fs.constants.S_IWOTH = 2 // 0002
      }
    }

    // ------------------------------------------------------------------------
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

// module.exports.Xpm = Xpm

// In ES6, it would be:
// export class Xpm { ... }
// ...
// import { Xpm } from 'xpm.js'

// ----------------------------------------------------------------------------
