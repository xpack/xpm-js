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

const util = require('util')

// https://nodejs.org/docs/latest-v10.x/api/child_process.html#child_process_child_process_spawn_command_args_options
// const { spawn } = require('child_process')

// https://www.npmjs.com/package/cross-spawn
const spawn = require('cross-spawn')

// ============================================================================

// Borrowed from @npm/promise-spawn
// https://raw.githubusercontent.com/npm/promise-spawn/main/index.js
// Changes:
// rename reject -> rejectError, res -> resolve, rej -> reject
// reformat

const isPipe = (stdio = 'pipe', fd) =>
  stdio === 'pipe' || stdio === null
    ? true
    : Array.isArray(stdio)
      ? isPipe(stdio[fd], fd)
      : false

// 'extra' object is for decorating the error a bit more
const promiseSpawn = (cmd, args, opts, extra = {}) => {
  const cwd = opts.cwd || process.cwd()
  return promiseSpawnUid(cmd, args, {
    ...opts,
    cwd
  }, extra)
}

const stdioResult = (stdout, stderr, { stdioString, stdio }) =>
  stdioString
    ? {
        stdout: isPipe(stdio, 1) ? Buffer.concat(stdout).toString() : null,
        stderr: isPipe(stdio, 2) ? Buffer.concat(stderr).toString() : null
      }
    : {
        stdout: isPipe(stdio, 1) ? Buffer.concat(stdout) : null,
        stderr: isPipe(stdio, 2) ? Buffer.concat(stderr) : null
      }

const promiseSpawnUid = (cmd, args, opts, extra) => {
  let proc
  const p = new Promise((resolve, reject) => {
    if (opts.log) {
      opts.log.trace(`spawn(cmd='${cmd}',`)
      opts.log.trace(`args='${args}',`)
      opts.log.trace(`opts=${util.inspect(opts)})`)
    }
    proc = spawn(cmd, args, opts)
    const stdout = []
    const stderr = []
    const rejectError = er => reject(Object.assign(er, {
      cmd,
      args,
      ...stdioResult(stdout, stderr, opts),
      ...extra
    }))
    proc.on('error', rejectError)
    if (proc.stdout) {
      proc.stdout.on('data', c => stdout.push(c)).on('error', rejectError)
      proc.stdout.on('error', er => rejectError(er))
    }
    if (proc.stderr) {
      proc.stderr.on('data', c => stderr.push(c)).on('error', rejectError)
      proc.stderr.on('error', er => rejectError(er))
    }
    proc.on('close', (code, signal) => {
      const result = {
        cmd,
        args,
        code,
        signal,
        ...stdioResult(stdout, stderr, opts),
        ...extra
      }
      if (code || signal) {
        reject(Object.assign(new Error('command failed'), result))
      } else {
        resolve(result)
      }
    })
  })

  p.stdin = proc.stdin
  p.process = proc
  return p
}

class Spawn {
  spawnShellPromise (cmdString, opts) {
    if (!opts.stdio) {
      opts.stdio = 'inherit'
    }
    if (!opts.env) {
      opts.env = process.env
    }

    let sh = 'sh'
    let args = ['-c']

    if (process.platform === 'win32') {
      // comspec
      // ComSpec=C:\Windows\system32\cmd.exe
      sh = process.env.comspec || 'cmd'
      // /d Disable execution of AutoRun commands from registry
      // /s Modifies the treatment of string after /C or /K
      // /c Carries out the command specified by string and then terminates
      args = ['/d', '/s', '/c']

      // The Windows official name is with lower case letters.
      if (Object.prototype.hasOwnProperty.call(opts.env, 'PATH') &&
          opts.env.Path !== opts.env.PATH) {
        opts.env.Path = opts.env.PATH
        delete opts.env.PATH
      }
    }

    args.push(cmdString)

    return promiseSpawn(sh, args, opts)
  }

  // Return a promise that spawns a shell.
  _executeShellPromise (cmdString, opts = {}) {
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
        // comspec
        // ComSpec=C:\Windows\system32\cmd.exe
        sh = process.env.comspec || 'cmd'
        // /d Disable execution of AutoRun commands from registry
        // /s Modifies the treatment of string after /C or /K
        // /c Carries out the command specified by string and then terminates
        args = ['/d', '/s', '/c']

        // The Windows official name is with lower case letters.
        if (Object.prototype.hasOwnProperty.call(opts.env, 'PATH') &&
          opts.env.Path !== opts.env.PATH) {
          opts.env.Path = opts.env.PATH
          delete opts.env.PATH
        }
      }
      args.push(cmdString)
      // console.log(sh, args)
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
