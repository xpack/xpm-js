/*
* This file is part of the xPack distribution
*   (http://xpack.github.io).
* Copyright (c) 2019 Liviu Ionescu.
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

/**
* The `xpm cache` command implementation.
*/

// ----------------------------------------------------------------------------

// const fs = require('fs')
const path = require('path')

// https://github.com/npm/cacache
const cacache = require('cacache')

// const Promisifier = require('@xpack/es6-promisifier').Promisifier

// ES6: `import { CliCommand, CliExitCodes, CliError } from 'cli-start-options'
const CliCommand = require('@ilg/cli-start-options').CliCommand
const CliExitCodes = require('@ilg/cli-start-options').CliExitCodes
const CliUtils = require('@ilg/cli-start-options').CliUtils

const GlobalConfig = require('../utils/global-config.js').GlobalConfig

// ----------------------------------------------------------------------------

// Promisify functions from the Node.js callbacks library.
// New functions have similar names, but suffixed with `Promise`.
// Promisifier.promisifyInPlace(fs, 'readFile')

// const fsPromises = fs.fsPromises

// ============================================================================

class Cache extends CliCommand {
  // --------------------------------------------------------------------------

  /**
  * @summary Constructor, to set help definitions.
  *
  * @param {Object} params The generic parameters object.
  */
  constructor (params) {
    super(params)

    // Title displayed with the help message.
    this.helpTitle = 'xPack manager - manage cache'
  }

  /**
  * @summary Execute the `cache list` command.
  *
  * @param {string[]} argv Command line arguments.
  * @returns {number} Return code.
  *
  * @override
  */
  async doRun (argv) {
    const log = this.log
    log.trace(`${this.constructor.name}.doRun()`)

    this.help({
      outputAlways: true
    })

    this.outputDoneDuration()
    return CliExitCodes.SUCCESS
  }

  // --------------------------------------------------------------------------
}

class CacheList extends CliCommand {
  // --------------------------------------------------------------------------

  /**
  * @summary Constructor, to set help definitions.
  *
  * @param {Object} params The generic parameters object.
  */
  constructor (params) {
    super(params)

    // Title displayed with the help message.
    this.helpTitle = 'xPack manager - show cache content'
    this.cliOptions.addOptionsGroups(
      [
        {
          title: 'Cache list options',
          insertInFront: true,
          optionsDefs: [
            {
              options: ['-a', '--all'],
              init: ({ config }) => {
                config.showAll = false
              },
              action: ({ config }, val) => {
                config.showAll = true
              },
              msg: 'Show all entries',
              isOptional: true
            },
            {
              options: ['--by-date'],
              init: ({ config }) => {
                config.orderByDate = false
              },
              action: ({ config }, val) => {
                config.orderByDate = true
              },
              msg: 'Order by date, ascending',
              isOptional: true
            }
          ]
        }
      ]
    )
  }

  /**
  * @summary Execute the `cache list` command.
  *
  * @param {string[]} argv Command line arguments.
  * @returns {number} Return code.
  *
  * @override
  */
  async doRun (argv) {
    const log = this.log
    log.trace(`${this.constructor.name}.doRun()`)

    log.info(this.helpTitle)
    log.info()

    const config = this.config

    this.globalConfig = new GlobalConfig()
    const cachePath = this.globalConfig.cacheFolderPath
    log.info(`The cache folder is '${cachePath}'.`)

    const oo = await cacache.ls(cachePath)

    let valuesArray
    if (config.showAll) {
      valuesArray = Object.values(oo)
    } else {
      valuesArray = Object.values(oo).filter((value) => {
        return value.key.startsWith('xpm:')
      })
    }

    const orderByDate = config.orderByDate
    let sortedArray
    const msgPrefix = config.showAll
      ? 'All cached content, ordered by'
      : 'Selected xpm cached content, ordered by'

    if (orderByDate) {
      log.info(`${msgPrefix} ascending date:`)
      sortedArray = valuesArray.sort((first, second) => {
        return first.time - second.time
      })
    } else {
      log.info(`${msgPrefix} descending size:`)
      sortedArray = valuesArray.sort((first, second) => {
        return second.size - first.size
      })
    }

    for (const value of sortedArray) {
      log.info(`- key: '${value.key}'`)
      const sizeStr = CliUtils.formatSize(value.size)
      const date = new Date(value.time)
      log.info(`  size: ${sizeStr}, date: ${date.toISOString()}`)
      const relPath = path.relative(cachePath, value.path)
      log.verbose(`  path: '${relPath}'`)
      log.verbose(`  integrity: ${value.integrity}`)
    }
    log.info(`${sortedArray.length} entries`)

    this.outputDoneDuration()
    return CliExitCodes.SUCCESS
  }

  // --------------------------------------------------------------------------
}

class CacheRemove extends CliCommand {
  // --------------------------------------------------------------------------

  /**
  * @summary Constructor, to set help definitions.
  *
  * @param {Object} params The generic parameters object.
  */
  constructor (params) {
    super(params)

    // Title displayed with the help message.
    this.helpTitle = 'xPack manager - remove cache content'
  }

  /**
  * @summary Execute the `cache list` command.
  *
  * @param {string[]} argv Command line arguments.
  * @returns {number} Return code.
  *
  * @override
  */
  async doRun (argv) {
    const log = this.log
    log.trace(`${this.constructor.name}.doRun()`)

    // const config = this.config

    log.info(this.helpTitle)
    log.info()

    if (argv.length === 0) {
      log.info('This command requires arguments.')
      return CliExitCodes.SUCCESS
    }

    this.globalConfig = new GlobalConfig()
    const cachePath = this.globalConfig.cacheFolderPath

    log.info('Removing, by key:')
    let count = 0
    for (const arg of argv) {
      const info = await cacache.get.info(cachePath, arg)

      if (info) {
        log.info(`- '${arg}'...`)
        log.trace(info)
        await cacache.rm.entry(cachePath, arg)
        await cacache.rm.content(cachePath, info.integrity)
        ++count
      } else {
        log.info(`- '${arg}' not found, ignored`)
      }
    }
    log.info(`${count} removed.`)

    this.outputDoneDuration()
    return CliExitCodes.SUCCESS
  }

  // --------------------------------------------------------------------------
}

class CacheVerify extends CliCommand {
  // --------------------------------------------------------------------------

  /**
  * @summary Constructor, to set help definitions.
  *
  * @param {Object} params The generic parameters object.
  */
  constructor (params) {
    super(params)

    // Title displayed with the help message.
    this.helpTitle = 'xPack manager - verify cache content'
    this.cliOptions.addOptionsGroups(
      [
      ]
    )
  }

  /**
  * @summary Execute the `cache verify` command.
  *
  * @param {string[]} argv Command line arguments.
  * @returns {number} Return code.
  *
  * @override
  */
  async doRun (argv) {
    const log = this.log
    log.trace(`${this.constructor.name}.doRun()`)

    // const config = this.config

    log.info(this.helpTitle)
    log.info()

    if (argv.length) {
      log.info('This command accepts no args.')
      for (const arg of argv) {
        log.warn(`Argument '${arg}' ignored`)
      }
      log.info()
    }

    this.globalConfig = new GlobalConfig()
    const cachePath = this.globalConfig.cacheFolderPath

    log.info('Verifying and fixing cache integrity...')
    const stats = await cacache.verify(cachePath)
    if (log.isVerbose()) {
      log.verbose('Full status:')
      log.verbose(stats)
    } else {
      log.info(`Total ${stats.totalEntries} entries, ` +
        `verified ${stats.verifiedContent}, ` +
        `reclaimed ${stats.reclaimedCount} entries ` +
        `(${CliUtils.formatSize(stats.reclaimedSize)}).`)
    }
    log.info('Done.')

    this.outputDoneDuration()
    return CliExitCodes.SUCCESS
  }

  // --------------------------------------------------------------------------
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// The current class is added as a property of this object.
module.exports.Cache = Cache
module.exports.CacheList = CacheList
module.exports.CacheRemove = CacheRemove
module.exports.CacheVerify = CacheVerify

// In ES6, it would be:
// export class CacheList { ... }
// ...
// import { CacheList } from 'cache.js'

// ----------------------------------------------------------------------------
