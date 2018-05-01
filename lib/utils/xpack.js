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

const sysArch = require('arch')
const request = require('request')
const decompress = require('decompress')
const tar = require('tar')
const cacache = require('cacache')

const Promisifier = require('@ilg/es6-promisifier').Promisifier

const CliError = require('@ilg/cli-start-options').CliError
const CliErrorApplication = require('@ilg/cli-start-options')
  .CliErrorApplication
const CliExitCodes = require('@ilg/cli-start-options').CliExitCodes

// ----------------------------------------------------------------------------

// Promisify functions from the Node.js callbacks library.
// New functions have similar names, but suffixed with `Promise`.
Promisifier.promisifyInPlace(fs, 'readFile')
Promisifier.promisifyInPlace(fs, 'readdir')
Promisifier.promisifyInPlace(fs, 'rename')

const fsPromises = fs.promises

const mkdirpPromise = Promisifier.promisify(require('mkdirp'))
const rimrafPromise = Promisifier.promisify(require('rimraf'))

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
      const fileContent = await fsPromises.readFile(filePath)

      this.json = JSON.parse(fileContent.toString())
      if (!this.json.name) {
        throw new CliErrorApplication('Missing mandatory xPack name.')
      }
      return this.json
    } catch (err) {
      throw new CliErrorApplication('The current folder must be an xPack.')
    }
  }

  async downloadBinaries (packagePath, cachePath) {
    const log = this.log

    const json = await this.isFolderPackage(packagePath)
    if (!json || !json.xpack || !json.xpack.binaries ||
      !json.xpack.binaries.platforms) {
      return
    }

    const platforms = json.xpack.binaries.platforms
    const platformKey = `${process.platform}-${sysArch()}`
    const platform = platforms[platformKey]
    if (!platform) {
      return
    }

    if (!json.xpack.binaries.baseUrl) {
      throw new CliError('Missing xpack.binaries.baseUrl',
        CliExitCodes.ERROR.INPUT)
    }

    const contentFolder = json.xpack.binaries.destination || '.content'
    const contentFolderPath = path.join(packagePath, contentFolder)

    let fileUrl = json.xpack.binaries.baseUrl
    if (!fileUrl.endsWith('/')) {
      fileUrl += '/'
    }

    if (platform.skip) {
      log.warn(`No binaries are available for this platform, command ignored.`)
      return
    }

    if (!platform.fileName) {
      throw new CliError(
        `Missing xpack.binaries.platform[${platformKey}].fileName`,
        CliExitCodes.ERROR.INPUT)
    }
    fileUrl += platform.fileName

    let hashAlgorithm
    let hexSum
    if (platform.sha256) {
      hashAlgorithm = 'sha256'
      hexSum = platform.sha256
    } else if (platform.sha512) {
      hashAlgorithm = 'sha512'
      hexSum = platform.sha512
    }

    let integrityDigest
    if (hexSum) {
      const buff = Buffer.from(hexSum, 'hex')
      integrityDigest = `${hashAlgorithm}-${buff.toString('base64')}`
    }

    const cacheKey = `xpm:binaries:${platform.fileName}`
    // Debug only, to force the downloads.
    // await cacache.rm.entry(cachePath, cacheKey)
    let info = await cacache.get.info(cachePath, cacheKey)
    if (!info) {
      log.info(`Downloading ${fileUrl}...`)
      const opts = {}
      if (integrityDigest) {
        // Enable hash checking.
        opts.integrity = integrityDigest
      }
      try {
        // Returns the computed integrity digest.
        await this.cacheArchive(fileUrl, cachePath,
          cacheKey, opts)
      } catch (err) {
        log.info(err)
      }
    }

    let skip = 0
    if (json.xpack.binaries.skip) {
      try {
        skip = parseInt(json.xpack.binaries.skip)
      } catch (err) {
      }
    }

    log.trace(`rimraf ${contentFolderPath}`)
    await rimrafPromise(contentFolderPath)
    log.info(`Extracting '${platform.fileName}'...`)
    const ipath = (await cacache.get.info(cachePath, cacheKey)).path
    log.trace(`ipath ${ipath}`)
    let res = 0
    // Currently this includes decompressTar(), decompressTarbz2(),
    // decompressTargz(), decompressUnzip().
    res = await decompress(ipath, contentFolderPath, {
      strip: skip
    })
    log.info(`${res.length} files extracted.`)

    // log.info('xx')
  }

  async cacheArchive (url, cachePath, key, opts) {
    return new Promise((resolve, reject) => {
      request.get(url)
        .pipe(cacache.put.stream(cachePath, key, opts)
          .on('integrity', (value) => {
            resolve(value)
          })
          .on('error', (err) => {
            reject(err)
          })
        )
        .on('close', () => {
          resolve()
        })
        .on('error', (err) => {
          reject(err)
        })
    })
  }

  async skipRecursive (from, dest, skip) {
    if (skip > 0) {
      const children = await fsPromises.readdir(from)
      for (const child of children) {
        const newPath = path.join(from, child)
        await this.skipRecursive(newPath, dest, skip - 1)
      }
    } else {
      const children = await fsPromises.readdir(from)
      for (const child of children) {
        await fsPromises.rename(path.join(from, child), path.join(dest, child))
      }
    }
  }

  // Currently no longer used, decompress can handle all formats.
  async extractTgzStream (tgzStream, destPath, skip = 0) {
    const log = this.log

    // cwd - Extract files relative to the specified directory. Defaults to
    // process.cwd(). If provided, this must exist and must be a directory.
    // strip - Remove the specified number of leading path elements.
    // Pathnames with fewer elements will be silently skipped. Note that
    // the pathname is edited after applying the filter, but before security
    // checks.

    log.trace(`mkdirp ${destPath}`)
    await mkdirpPromise(destPath) // Mandatory.

    log.trace(`tar.x cwd:${destPath} strip:${skip}`)
    return new Promise((resolve, reject) => {
      tgzStream.pipe(tar.x({
        cwd: destPath,
        strip: skip
      }))
        .on('close', () => {
          resolve()
        })
        .on('error', (err) => {
          reject(err)
        })
    })
  }

  async isFolderPackage (folder) {
    const p = path.join(folder, 'package.json')

    try {
      const fileContent = await fsPromises.readFile(p)
      assert(fileContent !== null)
      const json = JSON.parse(fileContent.toString())
      if (json.name && json.version) {
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

  getPosixPath () {
    if (this.scope) {
      return path.posix.join(this.scope, this.name, this.version)
    } else {
      return path.posix.join(
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
