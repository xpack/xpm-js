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
const os = require('os')

const fetch = require('node-fetch')
const decompress = require('decompress')
const cacache = require('cacache')

const Promisifier = require('@xpack/es6-promisifier').Promisifier

const CliError = require('@ilg/cli-start-options').CliError
const CliErrorApplication = require('@ilg/cli-start-options')
  .CliErrorApplication
const CliExitCodes = require('@ilg/cli-start-options').CliExitCodes

// ----------------------------------------------------------------------------

// Promisify functions from the Node.js callbacks library.
// New functions have similar names, but suffixed with `Promise`.
Promisifier.promisifyInPlace(fs, 'readFile')
Promisifier.promisifyInPlace(fs, 'writeFile')
Promisifier.promisifyInPlace(fs, 'readdir')
Promisifier.promisifyInPlace(fs, 'rename')

// For easy migration, inspire from the Node 10 experimental API.
// Do not use `fs.promises` yet, to avoid the warning.
const fsPromises = fs.promises_

const rimrafPromise = Promisifier.promisify(require('rimraf'))

const cacacheUseStream = false

// ============================================================================

class Xpack {
  constructor (xpackPath, context) {
    assert(xpackPath, 'Mandatory xpackPath')
    this.xpackPath = xpackPath
    assert(context, 'Mandatory context')
    this.context = context

    this.log = context.log

    // this.packageJson
  }

  async readPackageJson () {
    const log = this.log

    const filePath = path.join(this.xpackPath, 'package.json')
    log.trace(`filePath: '${filePath}'`)
    try {
      const fileContent = await fsPromises.readFile(filePath)

      this.packageJson = JSON.parse(fileContent.toString())
      // Name and version are not mandatory, they are needed
      // only when a package is published.
      return this.packageJson
    } catch (err) {
      throw new CliErrorApplication(
        `The '${this.xpackPath}' folder must be an xPack.`)
    }
  }

  async rewritePackageJson () {
    const log = this.log
    const jsonStr = JSON.stringify(this.packageJson, null, 2) + '\n'

    const filePath = path.join(this.xpackPath, 'package.json')
    log.trace(`write filePath: '${filePath}'`)
    await fsPromises.writeFile(filePath, jsonStr)
  }

  async downloadBinaries (packagePath, cachePath) {
    const log = this.log

    const json = await this.isFolderPackage(packagePath)
    if (!json || !json.xpack) {
      log.debug('doesn\'t look like an xPack, package.json has no xpack')
      return
    }
    if (!json.xpack.binaries) {
      log.debug('doesn\'t look like a binary xPack, package.json has no ' +
        'xpack.binaries')
      return
    }
    if (!json.xpack.binaries.platforms) {
      log.debug('doesn\'t look like a binary xPack, package.json has no ' +
        'xpack.binaries.platforms')
      return
    }

    const platformKey = `${process.platform}-${process.arch}`
    const platformKeyAliases = new Set()

    if (['linux-x32', 'linux-x86', 'linux-ia32'].includes(platformKey)) {
      platformKeyAliases.add('linux-x32')
      platformKeyAliases.add('linux-x86')
      platformKeyAliases.add('linux-ia32') // official
    } else if (['win32-x32', 'win32-x86', 'win32-ia32'].includes(platformKey)) {
      platformKeyAliases.add('win32-x32')
      platformKeyAliases.add('win32-x86')
      platformKeyAliases.add('win32-ia32') // official
    } else {
      platformKeyAliases.add(platformKey)
    }

    const platforms = json.xpack.binaries.platforms

    let platform
    for (const item of platformKeyAliases) {
      if (platforms[item]) {
        platform = platforms[item]
        break
      }
    }
    if (!platform) {
      throw new CliError(`Platform ${platformKey} not supported.`,
        CliExitCodes.ERROR.INPUT)
    }

    if (!json.xpack.binaries.baseUrl) {
      throw new CliError('Missing xpack.binaries.baseUrl',
        CliExitCodes.ERROR.INPUT)
    }

    const contentFolder = json.xpack.binaries.destination || '.content'
    const contentFolderPath = path.join(packagePath, contentFolder)

    if (platform.skip) {
      log.warn('No binaries are available for this platform, command ignored.')
      return
    }

    if (!platform.fileName) {
      throw new CliError(
        `Missing xpack.binaries.platform[${platformKey}].fileName`,
        CliExitCodes.ERROR.INPUT)
    }

    // Prefer the platform specific URL, if available, otherwise
    // use the common URL.
    let fileUrl = platform.baseUrl || json.xpack.binaries.baseUrl
    if (!fileUrl.endsWith('/')) {
      fileUrl += '/'
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
    log.trace(`expected integrity digest ${integrityDigest} for ${hexSum}`)

    const cacheKey = `xpm:binaries:${platform.fileName}`
    log.trace(`getting cacache info(${cachePath}, ${cacheKey})...`)
    // Debug only, to force the downloads.
    // await cacache.rm.entry(cachePath, cacheKey)
    let cacheInfo = await cacache.get.info(cachePath, cacheKey)
    if (!cacheInfo) {
      // If the cache has no idea of the desired file, proceed with
      // the download.
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
        // Do not throw yet, only display the error.
        log.info(err.message)
        if (os.platform() === 'win32') {
          log.info('If you have an aggressive antivirus, try to' +
            ' reconfigure it, or temporarily disable it.')
        }
        throw new CliError('Download failed. Quit.', CliExitCodes.ERROR.INPUT)
      }
      // Update the cache info after downloading the file.
      cacheInfo = await cacache.get.info(cachePath, cacheKey)
      if (!cacheInfo) {
        throw new CliError('Download failed. Quit.', CliExitCodes.ERROR.INPUT)
      }
    }

    // The number of initial folder levels to skip.
    let skip = 0
    if (json.xpack.binaries.skip) {
      try {
        skip = parseInt(json.xpack.binaries.skip)
      } catch (err) {
      }
    }
    log.trace(`skip ${skip} levels`)

    log.trace(`rimraf ${contentFolderPath}`)
    await rimrafPromise(contentFolderPath)

    const ipath = cacheInfo.path
    log.trace(`ipath ${ipath}`)
    let res = 0
    // Currently this includes decompressTar(), decompressTarbz2(),
    // decompressTargz(), decompressUnzip().
    log.info(`Extracting '${platform.fileName}'...`)
    res = await decompress(ipath, contentFolderPath, {
      strip: skip
    })
    // The common value is self relative ./.content; remove the folder.
    const shownFolder = contentFolder.replace(/^\.\//, '')
    log.info(
      `${res.length} files extracted in '${json.version}/${shownFolder}'.`)
  }

  async cacheArchive (url, cachePath, key, opts) {
    const log = this.log

    while (true) {
      // May throw an exception.
      // 3xx-5xx responses are NOT exceptions, and should be handled.
      const res = await fetch(url)

      log.debug(`fetch.status ${res.status}`)
      log.trace(`fetch.statusText ${res.statusText}`)

      if (res.ok) {
        if (cacacheUseStream) {
          return new Promise((resolve, reject) => {
          // Pipe the result to the cache.

            res.body.pipe(cacache.put.stream(cachePath, key, opts)
              .on('integrity', (value) => {
                log.debug(`computed integrity ${value}`)
                resolve(value)
              })
              .on('error', (err) => {
                log.trace('cacache.put.stream error')
                reject(err)
              })
            ).on('close', () => {
              log.trace('cacheArchive pipe close')
              resolve()
            }).on('error', (err) => {
              log.trace('cacheArchive pipe error')
              reject(err)
            })
          })
        } else {
          // Unfortunately cacache from 13.x up has a problem with streams,
          // and the workaround is to use a buffer.
          // This is not great for large binary xPacks, like toolchains,
          // which can reach 150 MB.
          const data = await res.buffer()
          return cacache.put(cachePath, key, data, opts)
        }
      }

      // res.status < 200 || res.status >= 300 (4xx, 5xx)
      // TODO: detect cases that can be retried.
      throw new CliErrorApplication(
        `Server returned ${res.status}: ${res.statusText}.`)
    }
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
      return null
    }
    return null
  }

  isXpack (json = this.packageJson) {
    return json.xpack
  }

  isBinaryPackage (json = this.packageJson) {
    return json.xpack && json.xpack.bin
  }
}

class ManifestIds {
  constructor (manifest) {
    if (manifest._id) {
      // If pacote returns an ID, it is considered more trustworthy,
      // although it probably comes from the same name & version fields.
      if (manifest._id.startsWith('@')) {
        const parts = manifest._id.split('/')
        this.scope = parts[0]
        const parts2 = parts[1].split('@')
        this.name = parts2[0]
        this.version = parts2[1] || manifest.version
      } else {
        const parts = manifest._id.split('@')
        this.name = parts[0]
        this.version = parts[1] || manifest.version
      }
    } else {
      // Without ID, use the package.json name & version.
      assert(manifest.name)
      assert(manifest.version)
      if (manifest.name.startsWith('@')) {
        const arr = manifest.name.split('/')
        this.scope = arr[0]
        this.name = arr[1]
        this.version = manifest.version
      } else {
        this.name = manifest.name
        this.version = manifest.version
      }
    }

    // TODO: validate scope, name & version.
  }

  getScopedName () {
    if (this.scope) {
      return `${this.scope}/${this.name}`
    } else {
      return `${this.name}`
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
      return path.posix.join(this.name, this.version)
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
module.exports.ManifestIds = ManifestIds

// In ES6, it would be:
// export class Xpack { ... }
// ...
// import { Xpack } from '../utils/xpack.js'

// ----------------------------------------------------------------------------
