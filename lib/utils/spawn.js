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

const assert = require('assert')
// const fs = require('fs')
// const path = require('path')
const spawn = require('child_process').spawn

// const Promisifier = require('@ilg/es6-promisifier').Promisifier

// const CliErrorApplication = require('@ilg/cli-start-options')
//  .CliErrorApplication

// ----------------------------------------------------------------------------

// Promisify functions from the Node.js callbacks library.
// New functions have similar names, but suffixed with `Promise`.
// Promisifier.promisifyInPlace(fs, 'readFile')

// ============================================================================

class Spawn {
  constructor (context) {
    assert(context, 'Mandatory context')
    this.context = context

    this.log = context.log
  }

  // Return a promise that spawns a shell.
  executeShellPromise (cmdString) {
    return new Promise(function (resolve, reject) {
      const opts = {}
      opts.stdio = 'inherit'

      let sh = 'sh'
      let shFlag = '-c'

      // TODO: adjust path
      // if (env[PATH]) pathArr.push(env[PATH])
      // env[PATH] = pathArr.join(process.platform === 'win32' ? ';' : ':')

      // TODO: use custom shell (from configuration)

      if (process.platform === 'win32') {
        sh = process.env.comspec || 'cmd'
        shFlag = '/d /s /c'
        // conf.windowsVerbatimArguments = true
      }
      const proc = spawn(sh, [shFlag, cmdString], opts)

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
