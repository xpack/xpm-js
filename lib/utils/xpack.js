/*
 * This file is part of the xPack project (http://xpack.github.io).
 * Copyright (c) 2017 Liviu Ionescu. All rights reserved.
 *
 * Permission to use, copy, modify, and/or distribute this software
 * for any purpose is hereby granted, under the terms of the MIT license.
 *
 * If a copy of the license was not distributed with this file, it can
 * be obtained from https://opensource.org/licenses/MIT/.
 */

'use strict'

/* eslint valid-jsdoc: "error" */
/* eslint max-len: [ "error", 80, { "ignoreUrls": true } ] */

// ----------------------------------------------------------------------------

// https://nodejs.org/docs/latest-v12.x/api/index.htm
import assert from 'assert'
import fs from 'fs'
import os from 'os'
import path from 'path'
import util from 'util'
import stream from 'stream'

// ----------------------------------------------------------------------------

// https://www.npmjs.com/package/cacache
import cacache from 'cacache'

// https://www.npmjs.com/package/decompress
import decompress from 'decompress'

// https://www.npmjs.com/package/del
import { deleteAsync } from 'del'

// https://www.npmjs.com/package/https-proxy-agent
import { HttpsProxyAgent } from 'https-proxy-agent'

// https://www.npmjs.com/package/node-fetch
import fetch from 'node-fetch'

// https://www.npmjs.com/package/proxy-from-env
import { getProxyForUrl } from 'proxy-from-env'

// https://www.npmjs.com/package/semver
import semver from 'semver'

// ----------------------------------------------------------------------------

// import { CliError, CliErrorInput, CliExitCodes }
// from '@ilg/cli-start-options'
import cliStartOptionsCsj from '@ilg/cli-start-options'

// ----------------------------------------------------------------------------

import { isString, isObject } from './functions.js'

// ----------------------------------------------------------------------------

const { CliError, CliErrorInput, CliExitCodes } = cliStartOptionsCsj
const fsPromises = fs.promises

// ============================================================================

export class Xpack {
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
      log.trace(util.inspect(err))
      throw new CliErrorInput(
        `package.json not found or malformed, the '${this.xpackPath}' ` +
        'folder seems not an xpm package')
    }
  }

  processInheritance (packageJson = this.packageJson) {
    // Start with a shallow copy of the original.
    const newPackageJson = {
      ...packageJson
    }

    if (!newPackageJson.xpack) {
      return newPackageJson
    }

    // Add a shallow copy of the xpack property.
    newPackageJson.xpack = {
      ...packageJson.xpack
    }

    // There are no build configurations, done.
    if (!newPackageJson.xpack.buildConfigurations) {
      return newPackageJson
    }

    // Clear the destination build configurations.
    newPackageJson.xpack.buildConfigurations = {}

    const pendingConfigurations = {}

    for (const key of Object.keys(packageJson.xpack.buildConfigurations)) {
      this.processBuildConfigurationInheritanceRecursive({
        buildConfigurationName: key,
        sourceBuildConfigurations: packageJson.xpack.buildConfigurations,
        destinationBuildConfigurations:
          newPackageJson.xpack.buildConfigurations,
        pendingConfigurations
      })
    }

    return newPackageJson
  }

  processBuildConfigurationInheritanceRecursive ({
    buildConfigurationName,
    sourceBuildConfigurations,
    destinationBuildConfigurations,
    pendingConfigurations
  }) {
    const log = this.log

    // Already processed.
    if (isObject(destinationBuildConfigurations[buildConfigurationName])) {
      return
    }

    const source = sourceBuildConfigurations[buildConfigurationName]

    const parentNames = []
    if (source.inherit) {
      if (isString(source.inherit)) {
        parentNames.push(source.inherit)
      } else if (Array.isArray(source.inherit)) {
        for (const value of source.inherit) {
          if (isString(value)) {
            parentNames.push(value)
          } else {
            throw new CliErrorInput('inherit can be only string or' +
              ` string array (${buildConfigurationName})`)
          }
        }
      } else {
        throw new CliErrorInput('inherit can be only string or' +
          ` string array (${buildConfigurationName})`)
      }
    }

    if (parentNames.length === 0) {
      // Has no parents, copy as is.
      destinationBuildConfigurations[buildConfigurationName] = {
        ...source
      }
      return
    }

    if (pendingConfigurations[buildConfigurationName]) {
      throw new CliErrorInput(
        `circular inheritance in ${buildConfigurationName}`)
    }

    // Mark the configuration as pending, to catch circular references.
    pendingConfigurations[buildConfigurationName] = true

    const parents = []
    for (const parentName of parentNames) {
      if (!isObject(sourceBuildConfigurations[parentName])) {
        throw new CliErrorInput(
          `inherit [${parentName}] not a valid buildConfiguration` +
          ` (${buildConfigurationName})`)
      }

      this.processBuildConfigurationInheritanceRecursive({
        buildConfigurationName: parentName,
        sourceBuildConfigurations,
        destinationBuildConfigurations,
        pendingConfigurations
      })

      // Remember as a parent.
      parents.push(destinationBuildConfigurations[parentName])
    }

    // Add the source configuration at the end of the list.
    parents.push(sourceBuildConfigurations[buildConfigurationName])

    const destination = {
      ...source,
      properties: {},
      actions: {},
      dependencies: {},
      devDependencies: {}
    }

    for (const parent of parents) {
      if (parent.properties) {
        destination.properties = {
          ...destination.properties,
          ...parent.properties
        }
      }

      if (parent.actions) {
        destination.actions = {
          ...destination.actions,
          ...parent.actions
        }
      }

      if (parent.dependencies) {
        destination.dependencies = {
          ...destination.dependencies,
          ...parent.dependencies
        }
      }

      if (parent.devDependencies) {
        destination.devDependencies = {
          ...destination.devDependencies,
          ...parent.devDependencies
        }
      }
    }

    // Set the final value.
    destinationBuildConfigurations[buildConfigurationName] = destination
    pendingConfigurations[buildConfigurationName] = false

    if (log.isTrace()) {
      log.trace(buildConfigurationName + ':')
      log.trace(util.inspect(destination))
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

  async downloadBinaries ({
    packagePath,
    packageTmpPath,
    cacheFolderPath
  }) {
    const context = this.context
    const config = context.config
    const log = this.log

    log.trace(`checking '${packageTmpPath}'`)
    const json = await this.isFolderPackage(packageTmpPath)
    if (!json || !json.xpack) {
      log.debug('doesn\'t look like an xpm package, ' +
        'package.json has no "xpack"')
      return
    }
    if (!json.xpack.binaries) {
      log.debug('doesn\'t look like a binary xpm package, ' +
        'package.json has no "xpack.binaries"')
      return
    }
    if (!json.xpack.binaries.platforms) {
      log.debug('doesn\'t look like a binary xpm package, ' +
        'package.json has no "xpack.binaries.platforms"')
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
        await this.cacheArchive(fileUrl, cacheFolderPath,
          cacheKey, opts)
        log.trace(`cache written for ${fileUrl}`)
      } catch (err) {
        log.trace(util.inspect(err))
        // Do not throw yet, only display the error.
        log.info(err.message)
        if (os.platform() === 'win32') {
          log.info('If you have an aggressive antivirus, try to ' +
            'reconfigure it, or temporarily disable it')
        }
        throw new CliErrorInput('download failed, quit')
      }
      // Update the cache info after downloading the file.
      cacheInfo = await cacache.get.info(cacheFolderPath, cacheKey)
      if (!cacheInfo) {
        throw new CliErrorInput('download failed, quit')
      }
    }

    log.trace(`cache path ${cacheInfo.path} for ${fileUrl}`)

    // The number of initial folder levels to skip.
    let skip = 0
    if (json.xpack.binaries.skip) {
      try {
        skip = parseInt(json.xpack.binaries.skip)
      } catch (err) {
      }
    }
    log.trace(`skip ${skip} levels`)

    const contentFolderRelativePath =
      json.xpack.binaries.destination || '.content'
    const contentFolderPath = path.join(packagePath,
      contentFolderRelativePath)
    const contentFolderTmpPath = path.join(packageTmpPath,
      contentFolderRelativePath)

    log.trace(`del ${contentFolderTmpPath}`)
    await deleteAsync(contentFolderTmpPath, { force: true })

    const cacheInfoPath = cacheInfo.path
    log.trace(`cacheInfoPath ${cacheInfoPath}`)
    let res = 0
    // Currently this includes decompressTar(), decompressTarbz2(),
    // decompressTargz(), decompressUnzip().
    log.info(`Extracting '${platform.fileName}'...`)
    res = await decompress(cacheInfoPath, contentFolderTmpPath, {
      strip: skip
    })

    if (log.isVerbose()) {
      // The common value is self relative ./.content; remove the folder.
      const shownFolderRelativePath =
        contentFolderRelativePath.replace(/^\.\//, '')
      log.verbose(
        `${res.length} files extracted in ` +
        `'${json.version}/${shownFolderRelativePath}'`)
    } else {
      log.info(
        `${res.length} files => '${contentFolderPath}'`)
    }
  }

  // Returns nothing.
  async cacheArchive (url, cacheFolderPath, key, opts) {
    const log = this.log

    // https://github.com/node-fetch/node-fetch/blob/main/docs/ERROR-HANDLING.md
    // https://github.com/node-fetch/node-fetch/blob/main/test/main.js
    // https://www.scrapingbee.com/blog/proxy-node-fetch/
    // https://iproyal.com/blog/how-do-i-use-a-node-fetch-proxy/

    let response
    let timeoutMillis = 1000
    const proxyUrl = getProxyForUrl(url)
    log.trace(`proxyUrl ${proxyUrl}`)
    const maxRetry = 5
    for (let retry = 0; retry < maxRetry; ++retry) {
      try {
        if (proxyUrl !== undefined && proxyUrl.length > 0) {
          const proxyAgent = new HttpsProxyAgent(proxyUrl)
          log.trace(`proxyAgent ${util.inspect(proxyAgent)} for ${url}`)
          response = await fetch(url, { agent: proxyAgent })
        } else {
          response = await fetch(url)
        }
      } catch (err) {
        log.trace(util.inspect(err))
        throw new CliError(
        `${err.message} in fetch ${url}`,
        CliExitCodes.ERROR.APPLICATION)
      }

      log.debug(`fetch.status ${response.status} ${url}`)
      log.trace(`fetch.statusText ${response.statusText} ${url}`)

      if (!response.ok) {
        break
      }

      // the HTTP response status was [200, 300).
      // https://en.wikipedia.org/wiki/List_of_HTTP_status_codes#2xx_success

      const pipelinePromise = util.promisify(stream.pipeline)

      log.trace(`create write stream for ${key}`)
      const cacacheWriteStream =
          cacache.put.stream(cacheFolderPath, key, opts)
      log.trace(`create pipeline for ${key}`)
      try {
        await pipelinePromise(response.body, cacacheWriteStream)
        // If no exception, everything must be ok.
        return
      } catch (err) {
        log.trace(util.inspect(err))
        if (retry >= maxRetry) {
          throw new CliError(
              `${err.message} in pipeline ${url}`,
              CliExitCodes.ERROR.APPLICATION)
        }
        // For now retry on all errors during download.
        // TODO: identify non recoverable and quit.
        log.warn(`${err.message} while downloading ${url}, retrying...`)
        const tenPercent = timeoutMillis * 0.1
        // +/- 10%
        // Math.random() * (max - min) + min
        const jitter = Math.floor(
          Math.random() * (tenPercent - (-tenPercent)) + (-tenPercent))
        timeoutMillis = timeoutMillis + jitter
        log.debug(`timeoutMillis: ${timeoutMillis}`)
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
        await sleep(timeoutMillis)

        // 1 2 4 8 16... seconds
        timeoutMillis = timeoutMillis * 2
      }
    }

    // res.status < 200 || res.status >= 300 (4xx, 5xx)
    // 1xx informational
    // 3xx: redirection messages
    // 4xx: client error
    // 5xx: server error
    // TODO: detect cases that can be retried.
    throw new CliError(
      `server returned ${response.status}: ${response.statusText} for ${key}`)
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
    // Since Nov. 2024, `executables` is preferred to `bin`.
    return !!json && !!json.xpack &&
    (!!json.xpack.executables || !!json.xpack.bin)
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
        log.trace(util.inspect(err))
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
      return undefined
    }

    if (!packageJson.xpack ||
      !packageJson.xpack.minimumXpmRequired) {
      log.trace('minimumXpmRequired not used, no checks')
      return undefined
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
    return minimumXpmRequired
  }
}

// ============================================================================

export class ManifestIds {
  constructor (manifest, policies) {
    assert(policies)
    this.policies = policies

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
      if (this.policies.nonHierarchicalLocalXpacksFolder) {
        // Linearise the name into a single folder.
        return `${this.scope.slice(1)}-${this.name}`
      } else {
        // Use the same hierarchical folders as npm.
        return path.join(this.scope, this.name)
      }
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
// module.exports.Xpack = Xpack
// module.exports.ManifestIds = ManifestIds

// In ES6, it would be:
// export class Xpack { ... }
// ...
// import { Xpack } from '../utils/xpack.js'

// ----------------------------------------------------------------------------
