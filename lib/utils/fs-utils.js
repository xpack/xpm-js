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
const fs = require('fs')
const path = require('path')
// const util = require('util')

const Promisifier = require('@xpack/es6-promisifier').Promisifier

Promisifier.promisifyInPlace(fs, 'readdir')
Promisifier.promisifyInPlace(fs, 'lstat')
Promisifier.promisifyInPlace(fs, 'chmod')

// For easy migration, inspire from the Node 10 experimental API.
// Do not use `fs.promises` yet, to avoid the warning.
const fsPromises = fs.promises_

// ----------------------------------------------------------------------------

class FsUtils {
  static async chmodRecursive ({ inputPath, readOnly, log }) {
    assert(inputPath, 'Mandatory inputPath')
    assert(log, 'Mandatory log')

    const Self = this

    const stat = await fsPromises.lstat(inputPath)
    // log.trace(util.inspect(stat))

    // The order is important, process the folder before
    // changing it to RO.
    if (readOnly && stat.isDirectory()) {
      log.trace(inputPath)
      const files = await fsPromises.readdir(inputPath, { withFileTypes: true })
      for (const file of files) {
        await Self.chmodRecursive({
          inputPath: path.resolve(inputPath, file.name),
          readOnly,
          log
        })
      }
    }

    const mode = stat.mode
    // For RO, remove all W bits, for RW add only user.
    const newMode = readOnly
      ? mode & ~(fs.constants.S_IWUSR | fs.constants.S_IWGRP |
          fs.constants.S_IWOTH)
      : mode | (fs.constants.S_IWUSR)

    await fsPromises.chmod(inputPath, newMode)

    // If RW, process the folder after changing it to RW.
    if (!readOnly && stat.isDirectory()) {
      log.trace(inputPath)
      const files = await fsPromises.readdir(inputPath, { withFileTypes: true })
      for (const file of files) {
        await Self.chmodRecursive({
          inputPath: path.resolve(inputPath, file.name),
          readOnly,
          log
        })
      }
    }
  }

  // --------------------------------------------------------------------------
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// The FsUtils class is added as a property of this object.
module.exports.FsUtils = FsUtils

// In ES6, it would be:
// export class FsUtils { ... }
// ...
// import { FsUtils } from 'fs-utils.js'

// ----------------------------------------------------------------------------
