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

const assert = require('assert')
const path = require('path')

// https://github.com/npm/cacache
const cacache = require('cacache')

// const Promisifier = require('@xpack/es6-promisifier').Promisifier

// ES6: `import { CliCommand, CliExitCodes, CliError } from 'cli-start-options'
const { CliCommand, CliExitCodes, CliUtils } =
  require('@ilg/cli-start-options')

const GlobalConfig = require('../utils/global-config.js').GlobalConfig

// ----------------------------------------------------------------------------

// Promisify functions from the Node.js callbacks library.
// New functions have similar names, but suffixed with `Promise`.
// Promisifier.promisifyInPlace(fs, 'readFile')

// const fsPromises = fs.fsPromises

// ============================================================================

class CacheList extends CliCommand {
  // --------------------------------------------------------------------------

  /**
  * @summary Constructor, to set help definitions.
  *
  * @param {Object} params The generic parameters object.
  */
  constructor (params) {
    super(params)

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

    this.cliOptions.hasNoCustomOptions = true
    this.cliOptions.hasNoCustomArgs = true
  }

  /**
  * @summary Execute the `cache list` command.
  *
  * @param {string[]} args Command line arguments.
  * @returns {number} Return code.
  *
  * @override
  */
  async doRun (args) {
    const log = this.log
    log.trace(`${this.constructor.name}.doRun()`)

    log.info(this.helpTitle)
    log.info()

    this.globalConfig = new GlobalConfig()
    const cachePath = this.globalConfig.cacheFolderPath
    log.info(`The cache folder is '${cachePath}'.`)

    const entries = await cacache.ls(cachePath)

    const sortedEntries = this.filterAndOrder(entries)

    this.outputEntries(sortedEntries)

    this.outputDoneDuration()
    return CliExitCodes.SUCCESS
  }

  filterAndOrder (entries) {
    const log = this.log
    const config = this.config

    let valuesArray
    if (config.showAll) {
      valuesArray = Object.values(entries)
    } else {
      valuesArray = Object.values(entries).filter((value) => {
        return value.key.startsWith('xpm:')
      })
    }

    const orderByDate = config.orderByDate
    let sortedEntries
    const msgPrefix = config.showAll
      ? 'All cached content, ordered by'
      : 'Selected xpm cached content, ordered by'

    if (orderByDate) {
      log.info(`${msgPrefix} ascending date:`)
      sortedEntries = valuesArray.sort((first, second) => {
        return first.time - second.time
      })
    } else {
      log.info(`${msgPrefix} descending size:`)
      sortedEntries = valuesArray.sort((first, second) => {
        return second.size - first.size
      })
    }

    return sortedEntries
  }

  outputEntries (entries) {
    const log = this.log
    const cachePath = this.globalConfig.cacheFolderPath

    for (const value of entries) {
      log.info(`- key: '${value.key}'`)
      const sizeStr = CliUtils.formatSize(value.size)
      const date = new Date(value.time)
      log.info(`  size: ${sizeStr}, date: ${date.toISOString()}`)
      const relPath = path.relative(cachePath, value.path)
      log.verbose(`  path: '${relPath}'`)
      log.verbose(`  integrity: ${value.integrity}`)
    }
    log.info(`${entries.length} entries`)
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

    this.cliOptions.hasMandatoryArgs = true
    this.cliOptions.hasNoCustomOptions = true
  }

  /**
   * @summary Helper to explain what <key> means.
   *
   * @param {CliHelp} helper The helper object.
   * @param {Object} more Object used to handle the two pass processing.
   * @return {undefined}
   *
   * @override
   */
  doHelpWhere (helper, more) {
    assert(helper)

    if (!more.isFirstPass) {
      helper.output()
      helper.output('where:')
      helper.output(`${helper.padRight('  <key>...', more.width)} ` +
        'Cache keys (multiple)')
    }
  }

  /**
  * @summary Execute the `cache list` command.
  *
  * @param {string[]} args Command line arguments.
  * @returns {number} Return code.
  *
  * @override
  */
  async doRun (args) {
    const log = this.log
    log.trace(`${this.constructor.name}.doRun()`)

    // const config = this.config

    log.info(this.helpTitle)
    log.info()

    this.globalConfig = new GlobalConfig()
    const cachePath = this.globalConfig.cacheFolderPath

    log.info('Removing content, by key:')
    let count = 0
    for (const arg of args) {
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

    this.cliOptions.hasNoCustomOptions = true
    this.cliOptions.hasNoCustomArgs = true
  }

  /**
  * @summary Execute the `cache verify` command.
  *
  * @param {string[]} args Command line arguments.
  * @returns {number} Return code.
  *
  * @override
  */
  async doRun (args) {
    const log = this.log
    log.trace(`${this.constructor.name}.doRun()`)

    // const config = this.config

    log.info(this.helpTitle)
    log.info()

    this.globalConfig = new GlobalConfig()
    const cachePath = this.globalConfig.cacheFolderPath

    log.info('Verifying and fixing cache integrity...')
    const stats = await cacache.verify(cachePath)
    if (log.isVerbose) {
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
module.exports.CacheList = CacheList
module.exports.CacheRemove = CacheRemove
module.exports.CacheVerify = CacheVerify

// In ES6, it would be:
// export class CacheList { ... }
// ...
// import { CacheList } from 'cache.js'

// ----------------------------------------------------------------------------
