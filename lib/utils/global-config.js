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
const fs = require('fs')
const os = require('os')
const path = require('path')

// ----------------------------------------------------------------------------

const { CliErrorApplication } = require('@ilg/cli-start-options')

// ----------------------------------------------------------------------------

const Promisifier = require('@xpack/es6-promisifier').Promisifier

// Promisify functions from the Node.js callbacks library.
// New functions have similar names, but suffixed with `Promise`.
Promisifier.promisifyInPlace(fs, 'rename')
Promisifier.promisifyInPlace(fs, 'stat')
Promisifier.promisifyInPlace(fs, 'symlink')

// For easy migration, inspire from the Node 10 experimental API.
// Do not use `fs.promises` yet, to avoid the warning.
const fsPromises = fs.promises_

// ============================================================================

class GlobalConfig {
  // --------------------------------------------------------------------------

  constructor () {
    const repoFolder = process.env.XPACKS_REPO_FOLDER
    const cacheFolder = process.env.XPACKS_CACHE_FOLDER
    const systemFolder = process.env.XPACKS_SYSTEM_FOLDER

    if (process.platform === 'darwin') {
      const home = process.env.HOME
      this.globalDefaultFolderPath = path.join(home, 'Library',
        'xPacks')
      this.globalFolderPath = repoFolder || this.globalDefaultFolderPath
      this.cacheDefaultFolderPath = path.join(home, 'Library',
        'Caches', 'xPacks')
      this.cacheFolderPath = cacheFolder || this.cacheDefaultFolderPath
      this.systemFolderPath = systemFolder || '/opt/xPacks'
      this.systemBinFolderPath = '/usr/local/bin'
    } else if (process.platform === 'linux') {
      const home = process.env.HOME
      this.globalDeprecatedFolderPaths = [path.join(home, 'opt',
        'xPacks')]
      this.globalDefaultFolderPath = path.join(home, '.local',
        'xPacks')
      this.globalFolderPath = repoFolder || this.globalDefaultFolderPath
      this.cacheDefaultFolderPath = path.join(home, '.cache',
        'xPacks')
      this.cacheFolderPath = cacheFolder || this.cacheDefaultFolderPath
      this.systemFolderPath = systemFolder || '/opt/xPacks'
      this.systemBinFolderPath = '/usr/local/bin'
    } else if (process.platform === 'win32') {
      this.globalDefaultFolderPath = path.join(process.env.APPDATA,
        'xPacks')
      this.globalFolderPath = repoFolder || this.globalDefaultFolderPath
      this.cacheDefaultFolderPath = path.join(process.env.LOCALAPPDATA,
        'Caches', 'xPacks')
      this.cacheFolderPath = cacheFolder || this.cacheDefaultFolderPath
      this.systemFolderPath = systemFolder ||
        path.join(process.env.ProgramFiles, 'xPacks')
      this.systemBinFolderPath = path.join(this.systemFolderPath, '.bin')
    }

    this.localXpacksFolderName = 'xpacks'
    this.localNpmFolderName = 'node_modules'
    this.dotBin = '.bin'
    this.dotLink = '.Link'
  }

  async checkDeprecatedFolders (log) {
    assert(log)

    // If there are any deprecated folder names, try to rename them.
    if (this.globalDeprecatedFolderPaths) {
      try {
        // Use `stat()` to follow links.
        const stat = await fsPromises.stat(this.globalDefaultFolderPath)
        if (!stat.isDirectory) {
          throw new CliErrorApplication(
            `${this.globalDefaultFolderPath} + must be a folder`)
        }
      } catch (err) {
        for (const folderPath of this.globalDeprecatedFolderPaths) {
          try {
            const stat = await fsPromises.stat(folderPath)
            if (stat.isDirectory) {
              try {
                // Rename the deprecated name to the new default name.
                log.debug(
                  `rename(${folderPath}, ${this.globalDefaultFolderPath})`)
                await fsPromises.rename(folderPath,
                  this.globalDefaultFolderPath)
              } catch (err) {
                throw new CliErrorApplication(
                  `cannot rename '${folderPath}' ` +
                  `to '${this.globalDefaultFolderPath}'`)
              }
              try {
                // fs.symlink(target, path[, type], callback)
                // 'creates the link called path pointing to target'
                log.debug(
                  `symlink(${this.globalDefaultFolderPath}, ${folderPath})`)
                if (os.platform() === 'win32') {
                  await fsPromises.symlink(this.globalDefaultFolderPath,
                    folderPath, 'junction')
                } else {
                  await fsPromises.symlink(this.globalDefaultFolderPath,
                    folderPath)
                }
              } catch (err) {
                throw new CliErrorApplication(
                  `cannot symlink '${this.globalDefaultFolderPath}' ` +
                  `as '${folderPath}'`)
              }

              log.info(`Folder '${folderPath}' moved to ` +
                `'${this.globalDefaultFolderPath})'; link left behind.`)
              break
            }
          } catch (err) {
            // Next.
          }
        }
      }
    }
  }

  // --------------------------------------------------------------------------
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// The Config class is added as a property of this object.
module.exports.GlobalConfig = GlobalConfig

// In ES6, it would be:
// export class GlobalConfig { ... }
// ...
// import { GlobalConfig } from 'utils/global-config.js'

// ----------------------------------------------------------------------------
