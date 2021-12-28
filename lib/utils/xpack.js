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

// https://nodejs.org/docs/latest-v10.x/api/
const assert = require('assert')
const fsPromises = require('fs').promises
const os = require('os')
const path = require('path')

// ----------------------------------------------------------------------------

// https://www.npmjs.com/package/cacache
const cacache = require('cacache')

// https://www.npmjs.com/package/decompress
const decompress = require('decompress')

// https://www.npmjs.com/package/del
const del = require('del')

// https://www.npmjs.com/package/node-fetch
const fetch = require('node-fetch')

// https://www.npmjs.com/package/semver
const semver = require('semver')

// ----------------------------------------------------------------------------

const { CliError, CliErrorInput, CliExitCodes } =
  require('@ilg/cli-start-options')

// ----------------------------------------------------------------------------

const cacacheUseStream = false

// ============================================================================

class Xpack {
  constructor (xpackPath, context) {
    assert(xpackPath, 'mandatory xpackPath')
    this.xpackPath = xpackPath
    assert(context, 'mandatory context')
    this.context = context

    this.log = context.log

    // this.packageJson
  }

  // Throws if package.json not found.
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
      log.trace(err)
      throw new CliErrorInput(
        `package.json not found or malformed, the '${this.xpackPath}' ` +
        'folder seems not an xPack')
    }
  }

  async rewritePackageJson (json = this.packageJson) {
    const log = this.log
    const jsonStr = JSON.stringify(json, null, 2) + '\n'

    const filePath = path.join(this.xpackPath, 'package.json')
    log.trace(`write filePath: '${filePath}'`)
    await fsPromises.writeFile(filePath, jsonStr)
  }

  getPlatformKey () {
    const context = this.context
    const config = context.config

    const platform = process.platform
    let arch = process.arch
    if (config.doForce32bit) {
      if (platform === 'win32' && arch === 'x64') {
        arch = 'ia32'
      } else if (platform === 'linux' && arch === 'x64') {
        arch = 'ia32'
      } else if (platform === 'linux' && arch === 'arm64') {
        arch = 'arm'
      }
    }
    return `${platform}-${arch}`
  }

  async downloadBinaries (packagePath, cacheFolderPath) {
    const context = this.context
    const config = context.config
    const log = this.log

    log.trace(`checking '${packagePath}'`)
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

    const platformKey = this.getPlatformKey()
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
      throw new CliErrorInput(`platform ${platformKey} not supported`)
    }

    if (!json.xpack.binaries.baseUrl) {
      throw new CliErrorInput(
        'missing "xpack.binaries.baseUrl" in package.json')
    }

    const contentFolderRelativePath =
      json.xpack.binaries.destination || '.content'
    const contentFolderPath = path.join(packagePath, contentFolderRelativePath)

    if (platform.skip) {
      log.warn('no binaries are available for this platform, command ignored')
      return
    }

    if (!platform.fileName) {
      throw new CliErrorInput(
        `missing xpack.binaries.platform[${platformKey}].fileName`)
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

    if (config.isDryRun) {
      log.info(`Pretend downloading ${fileUrl}...`)
      log.info(`Pretend extracting '${platform.fileName}'...`)
      return
    }

    const cacheKey = `xpm:binaries:${platform.fileName}`
    log.trace(`getting cacache info(${cacheFolderPath}, ${cacheKey})...`)
    // Debug only, to force the downloads.
    // await cacache.rm.entry(cacheFolderPath, cacheKey)
    let cacheInfo = await cacache.get.info(cacheFolderPath, cacheKey)
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
        await this.cacheArchive(fileUrl, cacheFolderPath,
          cacheKey, opts)
      } catch (err) {
        log.trace(err)
        // Do not throw yet, only display the error.
        log.info(err.message)
        if (os.platform() === 'win32') {
          log.info('If you have an aggressive antivirus, try to ' +
            'reconfigure it, or temporarily disable it.')
        }
        throw new CliErrorInput('download failed, quit')
      }
      // Update the cache info after downloading the file.
      cacheInfo = await cacache.get.info(cacheFolderPath, cacheKey)
      if (!cacheInfo) {
        throw new CliErrorInput('download failed, quit')
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

    log.trace(`del ${contentFolderPath}`)
    await del(contentFolderPath, { force: true })

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
    const shownFolderRelativePath =
      contentFolderRelativePath.replace(/^\.\//, '')
    if (log.isVerbose()) {
      log.verbose(
        `${res.length} files extracted in ` +
        `'${json.version}/${shownFolderRelativePath}'`)
    } else {
      log.info(
        `${res.length} files => '${contentFolderPath}'`)
    }
  }

  async cacheArchive (url, cacheFolderPath, key, opts) {
    const log = this.log

    // May throw an exception.
    // 3xx-5xx responses are NOT exceptions, and should be handled.
    const res = await fetch(url)

    log.debug(`fetch.status ${res.status}`)
    log.trace(`fetch.statusText ${res.statusText}`)

    if (res.ok) {
      if (cacacheUseStream) {
        return new Promise((resolve, reject) => {
          // Pipe the result to the cache.

          res.body.pipe(cacache.put.stream(cacheFolderPath, key, opts)
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
        return cacache.put(cacheFolderPath, key, data, opts)
      }
    }

    // res.status < 200 || res.status >= 300 (4xx, 5xx)
    // TODO: detect cases that can be retried.
    throw new CliError(
      `server returned ${res.status}: ${res.statusText}`)
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

  async isFolderPackage (folderPath) {
    const jsonPath = path.join(folderPath, 'package.json')

    try {
      const fileContent = await fsPromises.readFile(jsonPath)
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

  isPackage (json = this.packageJson) {
    return !!json
  }

  isXpack (json = this.packageJson) {
    return !!json && !!json.xpack
  }

  isBinaryXpack (json = this.packageJson) {
    return !!json && !!json.xpack && !!json.xpack.bin
  }

  isNodeModule (json = this.packageJson) {
    return !!json && !json.xpack
  }

  isBinaryNodeModule (json = this.packageJson) {
    return !!json && !json.xpack && !!json.bin
  }

  parsePackageSpecifier ({
    packSpec
  }) {
    assert(packSpec)

    const log = this.log

    let scope
    let name
    let version

    if (packSpec.startsWith('@')) {
      const arr = packSpec.split('/')
      if (arr.length > 2) {
        throw new CliError(
          `'${packSpec}' not a package name`)
      }
      scope = arr[0]
      if (arr.length > 1) {
        const arr2 = arr[1].split('@')
        name = arr2[0]
        if (arr2.length > 1) {
          version = arr2[1]
        }
      }
    } else {
      const arr2 = packSpec.split('@')
      name = arr2[0]
      if (arr2.length > 1) {
        version = arr2[1]
      }
    }
    log.trace(`${packSpec} => ${scope || '?'} ${name || '?'} ${version || '?'}`)

    return { scope, name, version }
  }

  retrieveConfiguration ({
    packageJson,
    configurationName
  }) {
    assert(packageJson)
    assert(packageJson.xpack)
    assert(configurationName)

    const log = this.log
    log.trace(
      `${this.constructor.name}.retrieveConfiguration('${configurationName}')`)

    // TODO: Legacy, remove it at some point.
    if (!packageJson.xpack.configurations &&
        !packageJson.xpack.buildConfigurations) {
      throw new CliErrorInput(
        'missing "xpack.buildConfigurations" property in package.json')
    }
    let configuration
    // Prefer `buildConfigurations`, but also accept `configurations`.
    if (packageJson.xpack.buildConfigurations) {
      configuration = packageJson.xpack.buildConfigurations[configurationName]
    } else if (packageJson.xpack.configurations) {
      // TODO: Legacy, remove it at some point.
      configuration = packageJson.xpack.configurations[configurationName]
    }
    if (!configuration) {
      throw new CliErrorInput(
        `missing "xpack.buildConfigurations.${configurationName}" ` +
        'property in package.json')
    }

    return configuration
  }

  /**
   * @summary Perform substitutions for the build folder.
   * @param {*} options Multiple options
   * @returns {string|Promise} The relative path.
   */
  async computeBuildFolderRelativePath ({
    configurationName,
    configuration,
    liquidEngine,
    liquidMap
  }) {
    assert(configurationName)
    assert(configuration)
    assert(liquidEngine)
    assert(liquidMap)

    const log = this.log

    let buildFolderRelativePath = liquidMap.properties.buildFolderRelativePath
    if (buildFolderRelativePath) {
      // If already defined by the user, perform substitutions.
      try {
        buildFolderRelativePath = await liquidEngine.performSubstitutions(
          buildFolderRelativePath, liquidMap)
      } catch (err) {
        log.trace(err)
        throw new CliError(err.message)
      }
    } else {
      // If not defined by the user, suggest a default and warn.
      buildFolderRelativePath = path.join('build', configurationName)
      liquidMap.properties.buildFolderRelativePath = buildFolderRelativePath

      log.warn('neither "configuration.properties.buildFolderRelativePath" ' +
        'nor "xpack.properties.buildFolderRelativePath" were found in ' +
        'package.json, using default ' + `"${buildFolderRelativePath}"...`)
    }

    log.trace(`buildFolderRelativePath: ${buildFolderRelativePath}`)
    return buildFolderRelativePath
  }

  // --------------------------------------------------------------------------

  async checkMinimumXpmRequired (packageJson) {
    const context = this.context
    const log = this.log

    log.trace(`${this.constructor.name}.checkMinimumXpmRequired()`)

    if (!packageJson) {
      // Not in a package.
      return
    }

    if (!packageJson.xpack ||
      !packageJson.xpack.minimumXpmRequired) {
      log.trace('minimumXpmRequired not used, no checks')
      return
    }
    // Remove the pre-release part.
    const minimumXpmRequired = semver.clean(
      packageJson.xpack.minimumXpmRequired.replace(/-.*$/, ''))

    log.trace(`minimumXpmRequired: ${minimumXpmRequired}`)

    log.trace(context.rootPath)
    const json = await this.isFolderPackage(context.rootPath)
    log.trace(json.version)

    // Remove the pre-release part.
    const xpmVersion = semver.clean(json.version.replace(/-.*$/, ''))
    if (semver.lt(xpmVersion, minimumXpmRequired)) {
      throw new CliError(
        `package '${packageJson.name}' requires xpm v${minimumXpmRequired} ` +
        'or later, please update', CliExitCodes.ERROR.PREREQUISITES)
    }
    // Check passed.
  }
}

// ============================================================================

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
    this.from_ = manifest._from
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

  getPacoteFrom () {
    return this.from_ ? this.from_ : this.getFullName()
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
