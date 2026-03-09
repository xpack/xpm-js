/*
 * This file is part of the xPack project (http://xpack.github.io).
 * Copyright (c) 2021-2026 Liviu Ionescu. All rights reserved.
 *
 * Permission to use, copy, modify, and/or distribute this software
 * for any purpose is hereby granted, under the terms of the MIT license.
 *
 * If a copy of the license was not distributed with this file, it can
 * be obtained from https://opensource.org/license/mit.
 */

'use strict'

// ----------------------------------------------------------------------------

import assert from 'node:assert'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import * as util from 'node:util'
import * as stream from 'node:stream'

// https://www.npmjs.com/package/@npmcli/arborist
import { Arborist } from '@npmcli/arborist'

// https://www.npmjs.com/package/pacote
import pacote from 'pacote'
// import { AbbreviatedManifest, ManifestResult } from 'pacote'

// https://www.npmjs.com/package/cacache
// import cacache, { put } from 'cacache'
import cacache from 'cacache'

// https://www.npmjs.com/package/decompress
import decompress from 'decompress'

// https://www.npmjs.com/package/del
import { deleteAsync } from 'del'

// https://www.npmjs.com/package/proxy-from-env
import { getProxyForUrl } from 'proxy-from-env'

// https://www.npmjs.com/package/https-proxy-agent
import { HttpsProxyAgent } from 'https-proxy-agent'

// https://www.npmjs.com/package/node-fetch
// import fetch, { Response } from 'node-fetch'
import fetch from 'node-fetch'

// https://www.npmjs.com/package/@xpack/logger
// import { Logger } from '@xpack/logger'

// https://www.npmjs.com/package/@xpack/xpm-lib
import * as xpmLib from '@xpack/xpm-lib'

// ES6: `import { CliError } from 'cli-start-options'
import cliStartOptionsCsj from '@ilg/cli-start-options'

// ----------------------------------------------------------------------------

const { CliError } = cliStartOptionsCsj

// ----------------------------------------------------------------------------

export class XpmDownloader {
  // --------------------------------------------------------------------------
  // Members.

  /* readonly #log: Logger */
  #log

  // --------------------------------------------------------------------------
  // Constructor.

  constructor({ log } /* : { log: Logger } */) {
    this.#log = log

    log.trace(`${XpmDownloader.name}()`)
  }

  // --------------------------------------------------------------------------
  // Methods.

  async pacoteCreateManifest(
    { specifier, cacheFolderPath } /* : {
    specifier: string
    cacheFolderPath: string
  } */
  ) /* : Promise<AbbreviatedManifest & ManifestResult> */ {
    const log = this.#log
    log.trace(`${XpmDownloader.name}.pacoteCreateManifest('${specifier}')`)
    const manifest = await pacote.manifest(specifier, {
      cache: cacheFolderPath,
    })

    return manifest
  }

  async pacoteExtractPackage(
    {
      packFullName,
      specifier,
      destinationFolderPath,
      cacheFolderPath,
      setReadOnly,
      verboseMessage,
      config,
      policies,
    } /* : {
    packFullName: string
    specifier: string
    destinationFolderPath: string
    cacheFolderPath: string
    setReadOnly: boolean
    verboseMessage: string
    config: XpmConfig
    policies: XpmPolicies
  } */
  ) /*: Promise<void> */ {
    assert(packFullName)
    assert(specifier)
    assert(destinationFolderPath)
    assert(cacheFolderPath)
    assert(verboseMessage)
    assert(config)
    assert(policies)

    const log = this.#log
    log.trace(`${XpmDownloader.name}.pacoteExtractContent('${specifier}')`)

    let destinationXpmPackage = new xpmLib.Package({
      log,
      packageFolderPath: destinationFolderPath,
    })
    const jsonDestination = await destinationXpmPackage.readPackageDotJson()
    if (jsonDestination) {
      // The package is already present in the destination folder.
      if (!config.doForce) {
        if (!config.doSkipIfInstalled) {
          log.warn(
            `package ${packFullName} already installed, ` +
              'use --force to overwrite'
          )
        }
        return // Not an error, proceed to other packages.
      }

      if (setReadOnly) {
        if (config.isDryRun) {
          log.verbose('Pretend changing permissions to read-write...')
          log.verbose(
            'Pretend removing existing package from ' +
              `'${destinationFolderPath}'...`
          )
        } else {
          log.verbose('Changing permissions to read-write...')
          await xpmLib.chmodRecursively({
            inputPath: destinationFolderPath,
            readOnly: false,
            log,
          })

          log.verbose(
            `Removing existing package from '${destinationFolderPath}'...`
          )
          await deleteAsync(destinationFolderPath, { force: true })
        }
      }
    }

    const destinationTmpFolderPath = destinationFolderPath + '.tmp'
    log.trace(`del(${destinationTmpFolderPath})`)
    await deleteAsync(destinationTmpFolderPath, { force: true })

    if (log.isVerbose && verboseMessage) {
      log.verbose(verboseMessage)
    }

    if (config.isDryRun) {
      if (!log.isVerbose) {
        log.info(`${packFullName} => '${destinationFolderPath}' (dry run)`)
      }
    } else {
      await this.pacoteExtract({
        specifier,
        destinationFolderPath: destinationTmpFolderPath,
        cacheFolderPath,
      })
      if (!log.isVerbose) {
        log.info(`${packFullName} => '${destinationFolderPath}'`)
      }
      destinationXpmPackage = new xpmLib.Package({
        log,
        packageFolderPath: destinationTmpFolderPath,
      })
    }

    await destinationXpmPackage.readPackageDotJson()
    if (!destinationXpmPackage.isXpmPackage()) {
      if (!policies.shareNpmDependencies) {
        log.trace(`del(${destinationTmpFolderPath})`)
        await deleteAsync(destinationTmpFolderPath, { force: true })
        throw new xpmLib.InputError(
          `${packFullName} is not an xpm package, use npm to install it`
        )
      }
      log.debug(
        `'${destinationFolderPath}' doesn't look like an ` +
          'xpm package, package.json has no "xpack"'
      )
      return
    }

    if (config.isDryRun) {
      if (setReadOnly) {
        log.verbose('Pretend changing permissions to read-only...')
      }
    } else {
      await this.#downloadBinaries({
        destinationXpmPackage,
        destinationFolderPath,
        cacheFolderPath,
        config,
      })

      // When everything is ready, rename the folder to the desired name.
      await fs.rename(destinationTmpFolderPath, destinationFolderPath)
      log.trace(`rename(${destinationTmpFolderPath}, ${destinationFolderPath})`)

      log.trace(`in '${destinationFolderPath}'`)
      if (setReadOnly) {
        log.verbose('Changing permissions to read-only...')
        await xpmLib.chmodRecursively({
          inputPath: destinationFolderPath,
          readOnly: true,
          log,
        })
      }
    }
  }

  async pacoteExtract(
    { specifier, destinationFolderPath, cacheFolderPath } /* : {
    specifier: string
    destinationFolderPath: string
    cacheFolderPath: string
  } */
  ) /*: Promise<void> */ {
    assert(specifier)
    assert(destinationFolderPath)
    assert(cacheFolderPath)

    const log = this.#log
    log.trace(`${XpmDownloader.name}.pacoteExtract(${specifier})`)

    try {
      log.trace(`pacote.extract(${specifier})`)
      const fetchResult = await pacote.extract(
        specifier,
        destinationFolderPath,
        { cache: cacheFolderPath, Arborist }
      )
      log.trace(`fetchResult: ${util.inspect(fetchResult)}`)
    } catch (error) {
      log.trace(util.inspect(error))
      throw new xpmLib.InputError(`Package ${specifier} not found`)
    }
  }

  async #downloadBinaries(
    {
      destinationXpmPackage,
      destinationFolderPath,
      cacheFolderPath,
      config,
    } /* : {
    destinationXpmPackage: XpmPackage
    destinationFolderPath: string
    cacheFolderPath: string
    config: XpmConfig
  } */
  ) /*: Promise<void> */ {
    assert(destinationXpmPackage)
    assert(destinationFolderPath)
    assert(cacheFolderPath)
    assert(config)

    const log = this.#log
    const packageFolderPath = destinationXpmPackage.packageFolderPath
    const jsonPackage = destinationXpmPackage.jsonPackage
    assert(jsonPackage)

    log.trace(`${XpmDownloader.name}.downloadBinaries(${packageFolderPath})`)
    if (!destinationXpmPackage.isXpmPackage()) {
      log.debug(
        "doesn't look like an xpm package, " + 'package.json has no "xpack"'
      )
      return
    }
    if (!destinationXpmPackage.isBinaryXpmPackage()) {
      log.debug(
        "doesn't look like an xpm package, " +
          'package.json has no "xpack.executables" and "xpack.binaries"'
      )
      return
    }

    const platformKey = xpmLib.getPlatformKey()
    // const platformKeyAliases = new Set<string>()
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

    assert(jsonPackage.xpack.binaries)
    const platforms = jsonPackage.xpack.binaries.platforms

    let platform
    for (const item of platformKeyAliases) {
      if (Object.prototype.hasOwnProperty.call(platforms, item)) {
        platform = platforms[item]
        break
      }
    }
    if (!platform) {
      throw new xpmLib.InputError(`platform ${platformKey} not supported`)
    }

    if (!jsonPackage.xpack.binaries.baseUrl) {
      throw new xpmLib.InputError(
        'missing "xpack.binaries.baseUrl" in package.json'
      )
    }

    if (platform.skip) {
      log.warn('no binaries are available for this platform, command ignored')
      return
    }

    if (!platform.fileName) {
      throw new xpmLib.InputError(
        `missing xpack.binaries.platform[${platformKey}].fileName`
      )
    }

    // Prefer the platform specific URL, if available, otherwise
    // use the common URL.
    let fileUrl = platform.baseUrl ?? jsonPackage.xpack.binaries.baseUrl
    if (!fileUrl.endsWith('/')) {
      fileUrl += '/'
    }

    fileUrl += platform.fileName

    let hashAlgorithm = '?'
    let hexSum = '?'
    if (platform.sha256) {
      hashAlgorithm = 'sha256'
      hexSum = platform.sha256
    } else if (platform.sha512) {
      hashAlgorithm = 'sha512'
      hexSum = platform.sha512
    }

    let integrityDigest = '?'
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
      const opts /* : { integrity?: string } */ = {}
      if (integrityDigest) {
        // Enable hash checking.
        opts.integrity = integrityDigest
      }
      try {
        await this.cacheArchive({
          url: fileUrl,
          cacheFolderPath,
          key: cacheKey,
          opts,
        })
        log.trace(`cache written for ${fileUrl}`)
      } catch (error) {
        log.trace(util.inspect(error))
        // Do not throw yet, only display the error.
        if (error instanceof Error) {
          log.info(error.message)
        } else {
          log.info(String(error))
        }
        if (os.platform() === 'win32') {
          log.info(
            'If you have an aggressive antivirus, try to ' +
              'reconfigure it, or temporarily disable it'
          )
        }
        throw new CliError('download failed, quit')
      }
      // Update the cache info after downloading the file.
      cacheInfo = await cacache.get.info(cacheFolderPath, cacheKey)
      if (!cacheInfo) {
        throw new CliError('download failed, quit')
      }
    }

    log.trace(`cache path ${cacheInfo.path} for ${fileUrl}`)

    // The number of initial folder levels to skip.
    let skip = 0
    if (jsonPackage.xpack.binaries.skip) {
      try {
        skip = jsonPackage.xpack.binaries.skip
      } catch {
        // Ignore invalid skip value, use default
      }
    }
    log.trace(`skip ${skip.toString()} levels`)

    const contentFolderRelativePath =
      jsonPackage.xpack.binaries.destination || '.content'
    const contentFolderPath = path.join(
      packageFolderPath,
      contentFolderRelativePath
    )
    const destinationContentFolderPath = path.join(
      destinationFolderPath,
      contentFolderRelativePath
    )

    log.trace(`del ${contentFolderPath}`)
    await deleteAsync(contentFolderPath, { force: true })

    const cacheInfoPath = cacheInfo.path
    log.trace(`cacheInfoPath ${cacheInfoPath}`)
    let res /* : decompress.File[] */ = []
    // Currently this includes decompressTar(), decompressTarbz2(),
    // decompressTargz(), decompressUnzip().
    log.info(`Extracting '${platform.fileName}'...`)

    res = await decompress(cacheInfoPath, contentFolderPath, {
      strip: skip,
    })

    if (log.isVerbose) {
      // The common value is self relative ./.content; remove the folder.
      const shownFolderRelativePath = contentFolderRelativePath.replace(
        /^\.\//,
        ''
      )
      assert(jsonPackage.version)
      log.verbose(
        `${res.length.toString()} files extracted in ` +
          `'${jsonPackage.version}/${shownFolderRelativePath}'`
      )
    } else {
      log.info(
        `${res.length.toString()} files => '${destinationContentFolderPath}'`
      )
    }
  }

  // Returns nothing. Used by downloadBinaries().
  async cacheArchive(
    { url, cacheFolderPath, key, opts } /*: {
    url: string
    cacheFolderPath: string
    key: string

    opts: put.Options
  } */
  ) /*: Promise<void> */ {
    assert(url)
    assert(cacheFolderPath)
    assert(key)
    assert(opts)
    const log = this.#log

    // https://github.com/node-fetch/node-fetch/blob/main/docs/ERROR-HANDLING.md
    // https://github.com/node-fetch/node-fetch/blob/main/test/main.js
    // https://www.scrapingbee.com/blog/proxy-node-fetch/
    // https://iproyal.com/blog/how-do-i-use-a-node-fetch-proxy/

    let response /* : Response | undefined */
    let timeoutMillis = 1000
    // If no proxy is set, an empty string is returned.

    const proxyUrl /* : string */ = getProxyForUrl(url)
    log.trace(`proxyUrl ${proxyUrl}`)
    const maxRetry = 5
    for (let retry = 0; retry < maxRetry; ++retry) {
      try {
        if (proxyUrl.length > 0) {
          const proxyAgent = new HttpsProxyAgent(proxyUrl)
          log.trace(`proxyAgent ${util.inspect(proxyAgent)} for ${url}`)
          response = await fetch(url, { agent: proxyAgent })
        } else {
          response = await fetch(url)
        }
      } catch (error) {
        log.trace(util.inspect(error))
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        throw new CliError(`${errorMessage} in fetch ${url}`)
      }

      log.debug(`fetch.status ${response.status.toString()} ${url}`)
      log.trace(`fetch.statusText ${response.statusText} ${url}`)

      if (!response.ok) {
        break
      }

      // the HTTP response status was [200, 300).
      // https://en.wikipedia.org/wiki/List_of_HTTP_status_codes#2xx_success

      const pipelinePromise = util.promisify(stream.pipeline)

      log.trace(`create write stream for ${key}`)

      const cacacheWriteStream = cacache.put.stream(cacheFolderPath, key, opts)
      log.trace(`create pipeline for ${key}`)
      try {
        assert(response.body)
        await pipelinePromise(response.body, cacacheWriteStream)
        // If no exception, everything must be ok.
        return
      } catch (error) {
        log.trace(util.inspect(error))
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        if (retry >= maxRetry) {
          throw new CliError(`${errorMessage} in pipeline ${url}`)
        }
        // For now retry on all errors during download.
        // TODO: identify non recoverable and quit.
        log.warn(`${errorMessage} while downloading ${url}, retrying...`)
        const tenPercent = timeoutMillis * 0.1
        // +/- 10%
        // Math.random() * (max - min) + min
        const jitter = Math.floor(
          Math.random() * (tenPercent - -tenPercent) + -tenPercent
        )
        timeoutMillis = timeoutMillis + jitter
        log.debug(`timeoutMillis: ${timeoutMillis.toString()}`)
        const sleep = (ms /* : number */) =>
          new Promise((resolve) => setTimeout(resolve, ms))
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
    assert(response)
    throw new CliError(
      `server returned ${response.status.toString()}: ` +
        `${response.statusText} for ${key}`
    )
  }
}

// ----------------------------------------------------------------------------
