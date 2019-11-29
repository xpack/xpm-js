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

const sysArch = require('arch')
const request = require('request')
const decompress = require('decompress')
const cacache = require('cacache')

const Promisifier = require('@xpack/es6-promisifier').Promisifier

const { CliError, CliErrorApplication, CliExitCodes } =
  require('@ilg/cli-start-options')

// ----------------------------------------------------------------------------

// Promisify functions from the Node.js callbacks library.
// New functions have similar names, but suffixed with `Promise`.
Promisifier.promisifyInPlace(fs, 'chmod')
Promisifier.promisifyInPlace(fs, 'lstat')
Promisifier.promisifyInPlace(fs, 'readdir')
Promisifier.promisifyInPlace(fs, 'readFile')
Promisifier.promisifyInPlace(fs, 'rename')
Promisifier.promisifyInPlace(fs, 'stat')
Promisifier.promisifyInPlace(fs, 'writeFile')

// For easy migration, inspire from the Node 10 experimental API.
// Do not use `fs.promises` yet, to avoid the warning.
const fsPromises = fs.promises_

const rimrafPromise = Promisifier.promisify(require('rimraf'))

// ============================================================================

class Xpack {
  constructor ({ xpackFolderAbsolutePath, log }) {
    assert(xpackFolderAbsolutePath, 'Mandatory xpackPath')
    this.xpackFolderAbsolutePath = xpackFolderAbsolutePath
    assert(log, 'Mandatory log')

    this.log = log
  }

  async readPackageJson ({
    folderAbsolutePath = this.xpackFolderAbsolutePath,
    mustBePublishable = false,
    mustBeXpack = false
  } = {}) {
    assert(folderAbsolutePath)

    const log = this.log

    const packageJsonPath = path.join(folderAbsolutePath, 'package.json')
    log.trace(`packageJsonPath: '${packageJsonPath}'`)
    try {
      const fileContent = await fsPromises.readFile(packageJsonPath)

      const packageJson = JSON.parse(fileContent.toString())
      // Name and version are not mandatory, they are needed
      // only when a package is published.
      if (mustBePublishable) {
        if (!packageJson.name || !packageJson.version) {
          throw new CliErrorApplication(
            `The package.json in '${folderAbsolutePath}' ` +
            'has no name & version properties.')
        }
      }
      if (mustBeXpack) {
        if (!packageJson.xpack) {
          throw new CliErrorApplication(
            `The package.json in '${folderAbsolutePath}' ` +
            'has no xpack property.')
        }
      }
      return packageJson
    } catch (err) {
      console.log(err.message)
      throw new CliErrorApplication(
        `The package.json in '${folderAbsolutePath}' cannot be parsed.`)
    }
  }

  async isPackageJsonPublishable (json) {
    if (json && json.name && json.version) {
      return true
    }
    return false
  }

  async isPackageJsonXpack (json) {
    if (json && json.xpack) {
      return true
    }
    return false
  }

  async hasPackageJson (folder) {
    assert(folder)

    try {
      const json = await this.readPackageJson({ folderAbsolutePath: folder })
      if (json && json.name && json.version) {
        return json
      }
    } catch (err) {
      return null
    }
    return null
  }

  async rewritePackageJson (json) {
    assert(json)

    const log = this.log
    const jsonStr = JSON.stringify(json, null, 2)

    const filePath = path.join(this.xpackFolderAbsolutePath, 'package.json')
    log.trace(`write filePath: '${filePath}'`)
    await fsPromises.writeFile(filePath, jsonStr)
  }

  // --------------------------------------------------------------------------

  async downloadBinaries ({ packagePath, cachePath, manifestId }) {
    assert(packagePath)
    assert(cachePath)
    assert(manifestId)

    const log = this.log

    const json = await this.hasPackageJson(packagePath)
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

    const platforms = json.xpack.binaries.platforms
    const platformKey = `${process.platform}-${sysArch()}`
    const platform = platforms[platformKey]
    if (!platform) {
      log.debug(`platform ${platformKey} not defined`)
      return
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
        // console.log(require('crypto').getHashes())
        opts.algorithms = [hashAlgorithm]
      }
      try {
        // Returns the computed integrity digest.
        const integrity = await this.cacheArchive({
          url: fileUrl,
          cachePath,
          cacheKey,
          opts
        })
        log.trace(integrity)
        if (integrity[hashAlgorithm][0].source !== integrityDigest) {
          throw new Error('Integrity check failed')
        } else {
          log.trace('integrity digest ok')
        }
      } catch (err) {
        // Do not throw yet, only display the error.
        log.info(err)
        if (os.platform() === 'win32') {
          log.info('If you have an aggressive antivirus, try to' +
            ' reconfigure it, or temporarily disable it.')
        }
        // Remove from the index.
        await cacache.rm.entry(cachePath, cacheKey)
        throw new CliError('Download failed.', CliExitCodes.ERROR.INPUT)
      }
      // Update the cache info after downloading the file.
      cacheInfo = await cacache.get.info(cachePath, cacheKey)
      if (!cacheInfo) {
        throw new CliError('Download failed.', CliExitCodes.ERROR.INPUT)
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
    log.verbose(`Extracting '${platform.fileName}'...`)
    res = await decompress(ipath, contentFolderPath, {
      strip: skip
    })
    if (log.isVerbose()) {
      log.verbose(`${res.length} files extracted.`)
    } else {
      log.info(`${res.length} files extracted from '${platform.fileName}'.`)
    }
  }

  async cacheArchive ({ url, cachePath, cacheKey, opts }) {
    const log = this.log
    log.trace(`${this.constructor.name}.cacheArchive()`)

    return new Promise((resolve, reject) => {
      // Use the html requester and pipe the result to the cache.
      request.get(url)
        .pipe(cacache.put.stream(cachePath, cacheKey, opts)
          .on('integrity', (value) => {
            log.debug(`computed integrity ${value}`)
            resolve(value)
          })
          .on('error', (err) => {
            log.trace('cacache.put.stream error')
            reject(err)
          })
        )
        .on('close', () => {
          log.trace('cacheArchive pipe close')
          resolve()
        })
        .on('error', (err) => {
          log.trace('cacheArchive pipe error')
          reject(err)
        })
    })
  }

  async skipRecursive ({ fromPath, destPath, skipCount }) {
    if (skipCount > 0) {
      const children = await fsPromises.readdir(fromPath)
      for (const child of children) {
        const newPath = path.join(fromPath, child)
        await this.skipRecursive(newPath, destPath, skipCount - 1)
      }
    } else {
      const children = await fsPromises.readdir(fromPath)
      for (const child of children) {
        await fsPromises.rename(path.join(
          fromPath, child), path.join(destPath, child))
      }
    }
  }

  computeWriteableMode ({ mode, isWritable }) {
    let newMode = mode
    if (isWritable) {
      // Set to writable only the groups that are readable.
      if ((mode & fs.constants.S_IRUSR) !== 0) {
        newMode |= fs.constants.S_IWUSR
      }
      if ((mode & fs.constants.S_IRGRP) !== 0) {
        newMode |= fs.constants.S_IWGRP
      }
      if ((mode & fs.constants.S_IROTH) !== 0) {
        newMode |= fs.constants.S_IWOTH
      }
    } else {
      // Clear the writable bits in all 3 groups.
      newMode &=
        ~(fs.constants.S_IWUSR | fs.constants.S_IWGRP | fs.constants.S_IWOTH)
    }
    return newMode
  }

  // Can be called on files and folders.
  async changeModeWritableRecursive ({ absolutePath, isWritable }) {
    assert(absolutePath)

    // lstat() is identical to stat(), except that if path is a symbolic
    // link, then the link itself is stat-ed, not the file that it refers to.
    const stat = await fsPromises.lstat(absolutePath)

    if (stat.isDirectory()) {
      // Before going down the recursion, make the current folder writable,
      // otherwise changes will fail.
      const newWritableMode = this.computeWriteableMode(
        { mode: stat.mode, isWritable: true })
      await fsPromises.chmod(absolutePath, newWritableMode)

      // The result will be an array of names.
      const childrenNames = await fsPromises.readdir(absolutePath)

      for (const childName of childrenNames) {
        const childAbsolutPath = path.join(absolutePath, childName)

        await this.changeModeWritableRecursive(
          { absolutePath: childAbsolutPath, isWritable })
      }
      if (!isWritable) {
        // Change folder mode to not writable.
        const newMode = this.computeWriteableMode(
          { mode: stat.mode, isWritable })
        await fsPromises.chmod(absolutePath, newMode)
      }
    } else if (stat.isFile()) {
      // Change file mode to whatever requested.
      const newMode = this.computeWriteableMode({ mode: stat.mode, isWritable })
      await fsPromises.chmod(absolutePath, newMode)
    } else if (stat.isSymbolicLink()) {
      // Change symbolic link mode to whatever requested.
      const newMode = this.computeWriteableMode({ mode: stat.mode, isWritable })
      await fsPromises.chmod(absolutePath, newMode)
    }
  }
}

class ManifestId {
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
module.exports.ManifestId = ManifestId

// In ES6, it would be:
// export class Xpack { ... }
// ...
// import { Xpack } from '../utils/xpack.js'

// ----------------------------------------------------------------------------
