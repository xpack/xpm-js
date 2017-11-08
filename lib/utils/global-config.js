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

const path = require('path')

// ============================================================================

class GlobalConfig {
  // --------------------------------------------------------------------------

  constructor () {
    if (process.platform === 'darwin') {
      const home = process.env.HOME
      this.globalFolderPath = path.join(home, 'Library', 'xPacks')
      this.cacheFolderPath = path.join(home, 'Library', 'Caches', 'xPacks')
    } else if (process.platform === 'linux') {
      const home = process.env.HOME
      this.globalFolderPath = path.join(home, 'opt', 'xPacks')
      this.cacheFolderPath = path.join(home + '.caches', 'xPacks')
    } else if (process.platform === 'win32') {
      this.globalFolderPath = path.join(process.env.APPDATA, 'xPacks')
      this.cacheFolderPath = path.join(process.env.LOCALAPPDATA, 'Caches',
        'xPacks')
    }
  }

  // --------------------------------------------------------------------------
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// The Config class is added as a property of this object.
module.exports.GlobalConfig = GlobalConfig

// In ES6, it would be:
// export class GlobalConfig { ... }
// ...
// import { GlobalConfig } from 'utils/global-config.js'

// ----------------------------------------------------------------------------
