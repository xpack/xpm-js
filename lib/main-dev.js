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

// https://nodejs.org/docs/latest-v12.x/api/index.htm
import path from 'path'

import { fileURLToPath } from 'url'

// ----------------------------------------------------------------------------

// ES6: `import { CliApplication, CliOptions } from 'cli-start-options'
// import { CliApplication, CliOptions } from '@ilg/cli-start-options'
import cliStartOptionsCsj from '@ilg/cli-start-options'

// ----------------------------------------------------------------------------

const { CliApplication, CliOptions } = cliStartOptionsCsj
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ============================================================================

export
class XpmDev extends CliApplication {
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
    CliOptions.addCommand(['binaries'], 'lib/xpm-dev/binaries.js')
    CliOptions.addCommand(['binaries-update'], 'lib/xpm-dev/binaries-update.js')

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

// module.exports.XpmDev = XpmDev

// In ES6, it would be:
// export class XpmDev { ... }
// ...
// import { XpmDev } from 'xpm-dev.js'

// ----------------------------------------------------------------------------
