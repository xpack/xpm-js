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

const Promisifier = require('@ilg/es6-promisifier').Promisifier

const CliErrorApplication = require('@ilg/cli-start-options')
  .CliErrorApplication

// ----------------------------------------------------------------------------

// Promisify functions from the Node.js callbacks library.
// New functions have similar names, but suffixed with `Promise`.
Promisifier.promisifyInPlace(fs, 'readFile')

// ============================================================================

class Xpack {
  constructor (xpackPath, context) {
    assert(xpackPath, 'Mandatory xpackPath')
    this.xpackPath = xpackPath
    assert(context, 'Mandatory context')
    this.context = context

    this.log = context.log
  }

  async readJson () {
    const log = this.log

    const filePath = path.join(this.xpackPath, 'package.json')
    log.trace(`filePath: '${filePath}'`)
    try {
      const fileContent = await fs.readFilePromise(filePath)

      this.json = JSON.parse(fileContent.toString())
      if (!this.json.name) {
        throw new CliErrorApplication('Missing mandatory xPack name.')
      }
      return this.json
    } catch (err) {
      throw new CliErrorApplication('The current folder must be an xPack.')
    }
  }

  parseManifestId (id) {
    const parts = {}
    if (id.startsWith('@')) {
      const arr = id.split('/')
      parts.scope = arr[0]
      const arr2 = arr[1].split('@')
      parts.name = arr2[0]
      parts.version = arr2[1]
    } else {
      const arr2 = id.split('@')
      parts.name = arr2[0]
      parts.version = arr2[1]
    }
    return parts
  }

  getPath (manifestIdParts) {
    if (manifestIdParts.scope) {
      return path.join(
        manifestIdParts.scope, manifestIdParts.name, manifestIdParts.version)
    } else {
      return path.join(
        manifestIdParts.name, manifestIdParts.version)
    }
  }

  getFullName (manifestIdParts) {
    if (manifestIdParts.scope) {
      return `${manifestIdParts.scope}/${manifestIdParts.name}` +
        `@${manifestIdParts.version}`
    } else {
      return `${manifestIdParts.name}@${manifestIdParts.version}`
    }
  }

  getFolderName (manifestIdParts) {
    if (manifestIdParts.scope) {
      return `${manifestIdParts.scope.slice(1)}-${manifestIdParts.name}`
    } else {
      return `${manifestIdParts.name}`
    }
  }

  downloadBinaries () {

  }

  async checkIfPack (folder) {
    const p = path.join(folder, 'package.json')

    try {
      const fileContent = await fs.readFilePromise(p)
      assert(fileContent !== null)
      const json = JSON.parse(fileContent.toString())
      if (json.name && json.version && json.xpack) {
        return json
      }
    } catch (err) {
    }
    return null
  }
}

class ManifestId {
  constructor (id) {
    if (id.startsWith('@')) {
      const arr = id.split('/')
      this.scope = arr[0]
      const arr2 = arr[1].split('@')
      this.name = arr2[0]
      this.version = arr2[1]
    } else {
      const arr2 = id.split('@')
      this.name = arr2[0]
      this.version = arr2[1]
    }
  }

  getPath () {
    if (this.scope) {
      return path.join(this.scope, this.name, this.version)
    } else {
      return path.join(
        this.name, this.version)
    }
  }

  getFullName () {
    if (this.scope) {
      return `${this.scope}/${this.name}@${this.version}`
    } else {
      return `${this.name}@${this.version}`
    }
  }

  getFolderName () {
    if (this.scope) {
      return `${this.scope.slice(1)}-${this.name}`
    } else {
      return `${this.name}`
    }
  }
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// The Test class is added as a property of this object.
module.exports.Xpack = Xpack
module.exports.ManifestId = ManifestId

// In ES6, it would be:
// export class Xpack { ... }
// ...
// import { Xpack } from '../utils/xpack.js'

// ----------------------------------------------------------------------------
