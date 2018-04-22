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

// const assert = require('assert')
// const fs = require('fs')
// const path = require('path')
const spawn = require('child_process').spawn

// const Promisifier = require('@ilg/es6-promisifier').Promisifier

// const CliErrorApplication = require('@ilg/cli-start-options')
//  .CliErrorApplication

// ----------------------------------------------------------------------------

// Promisify functions from the Node.js callbacks library.
// New functions have similar names, but suffixed with `Promise`.
// Promisifier.promisifyInPlace(fs, 'stat')

// ============================================================================

class Spawn {
  // Return a promise that spawns a shell.
  executeShellPromise (cmdString, opts = {}) {
    return new Promise(function (resolve, reject) {
      if (!opts.stdio) {
        opts.stdio = 'inherit'
      }
      if (!opts.env) {
        opts.env = process.env
      }

      // TODO: use custom shell (from configuration)
      let sh = 'sh'
      let args = ['-c']

      if (process.platform === 'win32') {
        sh = process.env.comspec || 'cmd'
        // /d Disable execution of AutoRun commands from registry
        // /s Modifies the treatment of string after /C or /K
        // /c Carries out the command specified by string and then terminates
        args = ['/d', '/s', '/c']

        // The Windows official name is with lower case letters.
        if (opts.env.hasOwnProperty('PATH') &&
          opts.env['Path'] !== opts.env['PATH']) {
          opts.env['Path'] = opts.env['PATH']
          delete opts.env['PATH']
        }
      }
      args.push(cmdString)
      // console.log(opts)
      // console.log(args)
      const proc = spawn(sh, args, opts)

      proc.on('close', (code) => {
        resolve(code)
      })
      proc.on('error', (err) => {
        reject(err)
      })
    })
  }
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// The current class is added as a property of this object.
module.exports.Spawn = Spawn

// In ES6, it would be:
// export class Spawn { ... }
// ...
// import { Spawn } from '../utils/spawn.js'

// ----------------------------------------------------------------------------
