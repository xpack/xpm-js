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

const path = require('path')

// ES6: `import { CliApplication, CliOptions } from 'cli-start-options'
const { CliApplication } =
  require('@ilg/cli-start-options')

// ============================================================================

// export
class Xpm extends CliApplication {
  // --------------------------------------------------------------------------

  /**
   * @summary Construct the application object.
   *
   * @param {Object} params The generic parameters object.
   *
   * @description
   * Initialise the options manager with application
   * specific commands and common options.
   */
  constructor (params) {
    super(params)

    const log = this.log

    // Mandatory, must be set here.
    // The path.dirname() walks the path up from `lib` to the project root.
    this.rootAbsolutePath = path.dirname(__dirname)

    // ------------------------------------------------------------------------

    this.helpOptions.title = 'The xPack package manager command line tool'
    this.helpOptions.titlePrefix = 'The xPack manager - '

    // ------------------------------------------------------------------------
    // The tree of known commands.
    // Paths should be relative to the package root.

    const commands = {
      install: {
        aliases: ['i', 'isntall'],
        modulePath: 'lib/xpm/install.js',
        helpOptions: {
          titleSuffix: 'Install package(s)',
          usageMoreOptions: '[<pkg>...]'
        }
      },
      uninstall: {
        aliases: ['ui', 'unisntall'],
        modulePath: 'lib/xpm/uninstall.js',
        helpOptions: {
          titleSuffix: 'Uninstall package(s)',
          usageMoreOptions: '[@<scope>]/<name>[@<version]'
        }
      },
      'run-script': {
        aliases: ['run', 'rum', 'urn'],
        modulePath: 'lib/xpm/run-script.js',
        helpOptions: {
          titleSuffix: 'Run package specific script',
          usageMoreOptions: 'name [-- <script args>...]'
        }
      },
      build: {
        aliases: ['b', 'bild'],
        modulePath: 'lib/xpm/build.js',
        helpOptions: {
          titleSuffix: 'Build package',
          usageMoreOptions: '[-- <build args>...]'
        }
      },
      init: {
        aliases: ['ini', 'inni'],
        modulePath: 'lib/xpm/init.js',
        helpOptions: {
          titleSuffix: 'Create an xPack, empty or from a template'
        }
      },
      cache: {
        helpOptions: {
          titleSuffix: 'Manage cache'
        },
        subCommands: {
          list: {
            aliases: ['ls'],
            modulePath: 'lib/xpm/cache.js',
            className: 'CacheList',
            helpOptions: {
              titleSuffix: 'Show cache content',
              usageMoreOptions: ''
            }
          },
          remove: {
            aliases: ['rm'],
            modulePath: 'lib/xpm/cache.js',
            className: 'CacheRemove',
            helpOptions: {
              titleSuffix: 'Remove cache content',
              usageMoreOptions: '<key>...'
            }
          },
          verify: {
            aliases: ['vfy'],
            modulePath: 'lib/xpm/cache.js',
            className: 'CacheVerify',
            helpOptions: {
              titleSuffix: 'Verify cache content',
              usageMoreOptions: ''
            }
          }
        }
      }
    }
    this.cmdsTree.addCommands(commands)
    log.trace(this.cmdsTree.getCommandsNames())
  }

  // --------------------------------------------------------------------------
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
