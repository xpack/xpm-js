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

/*
 * This file implements the CLI specific code. It prepares a context
 * and calls the module code.
 *
 */

const assert = require('assert')
const path = require('path')

// ES6: `import { WscriptAvoider} from 'wscript-avoider'
const WscriptAvoider = require('wscript-avoider').WscriptAvoider

// ----------------------------------------------------------------------------

// export
class Cli {
  static run () {
    // On POSIX, `process.argv0` is 'node' (uninteresting).
    // On Windows, it is the node full path (uninteresting as well).
    console.log('argv0=' + process.argv0)

    // `process.argv[0]` is the node full path,
    // On macOS it looks like `/usr/local/bin/node`.
    // On Ubuntu it looks like `/usr/bin/nodejs`
    // On Windows it looks like `C:\Program Files\nodejs\node.exe`
    console.log('argv[0]=' + process.argv[0])

    // `process.argv[1]` is the full path of the invoking script,
    // On macOS it is either `/usr/local/bin/xpm` or `.../bin/xpm.js`.
    // On Ubuntu it is either `/usr/bin/xpm` or `.../bin/xpm.js`.
    // On Windows, it is a path in the `AppData` folder
    // like `C:\Users\ilg\AppData\Roaming\npm\node_modules\xpm\bin\xpm.js`
    console.log('argv[1]=' + process.argv[1])

    // With special care to use different scripts for different incarnations
    // of the program, it should be possible to differentiate between them.

    // Extract the name from the last path element; ignore extension, if any.
    const cmd = path.basename(process.argv[1]).split('.')[0]
    console.log('cmd=' + cmd)

    // Avoid running on WScript.
    WscriptAvoider.quitIfWscript(cmd)

    // Set the application name, to make `ps` output more readable.
    process.title = cmd

    console.log(cmd + ' started')
    setTimeout(() => {
      console.log(cmd + ' stopped')
      process.exit(0)
    }, 5 * 1000)
  }

  /**
   * @brief Dummy constructor, to catch unsupported instantiations.
   */
  constructor () {
    assert(false, 'Cli is a static class, instantiation not allowed.')
  }
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// The static class is added as a property of this object.
module.exports.Cli = Cli

// In ES6, it would be:
// export class Cli { ... }
// ...
// import { Cli } from 'cli'

// ----------------------------------------------------------------------------
