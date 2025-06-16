/*
 * This file is part of the xPack project (http://xpack.github.io).
 * Copyright (c) 2017 Liviu Ionescu. All rights reserved.
 *
 * Permission to use, copy, modify, and/or distribute this software
 * for any purpose is hereby granted, under the terms of the MIT license.
 *
 * If a copy of the license was not distributed with this file, it can
 * be obtained from https://opensource.org/license/mit.
 */

'use strict'

/* eslint valid-jsdoc: "error" */
/* eslint max-len: [ "error", 80, { "ignoreUrls": true } ] */

// ----------------------------------------------------------------------------

// https://nodejs.org/docs/latest-v12.x/api/index.htmchild_process.html#child_process_child_process_spawn_command_args_options
// const { spawn } = require('child_process')

// https://www.npmjs.com/package/cross-spawn
import spawn from 'cross-spawn'

import util from 'util'

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

export class Spawn {
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
      opts.windowsVerbatimArguments = true
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
// module.exports.Spawn = Spawn

// In ES6, it would be:
// export class Spawn { ... }
// ...
// import { Spawn } from '../utils/spawn.js'

// ----------------------------------------------------------------------------
