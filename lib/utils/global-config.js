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

// ----------------------------------------------------------------------------

// import { CliError } from '@ilg/cli-start-options'
import cliStartOptionsCsj from '@ilg/cli-start-options'

// ----------------------------------------------------------------------------

const { CliError } = cliStartOptionsCsj
const fsPromises = fs.promises

// ============================================================================

export class GlobalConfig {
  // --------------------------------------------------------------------------

  constructor () {
    const repoFolderPath = process.env.XPACKS_STORE_FOLDER ||
      process.env.XPACKS_REPO_FOLDER
    const cacheFolderPath = process.env.XPACKS_CACHE_FOLDER
    const systemFolderPath = process.env.XPACKS_SYSTEM_FOLDER

    if (process.platform === 'darwin') {
      const home = process.env.HOME
      this.globalDefaultFolderPath = path.join(home, 'Library',
        'xPacks')
      this.globalFolderPath = repoFolderPath || this.globalDefaultFolderPath
      this.cacheDefaultFolderPath = path.join(home, 'Library',
        'Caches', 'xPacks')
      this.cacheFolderPath = cacheFolderPath || this.cacheDefaultFolderPath
      this.systemFolderPath = systemFolderPath || '/opt/xPacks'
      this.systemBinFolderPath = '/usr/local/bin'
    } else if (process.platform === 'linux') {
      const home = process.env.HOME
      this.globalDeprecatedFolderPaths = [path.join(home, 'opt',
        'xPacks')]
      this.globalDefaultFolderPath = path.join(home, '.local',
        'xPacks')
      this.globalFolderPath = repoFolderPath || this.globalDefaultFolderPath
      this.cacheDefaultFolderPath = path.join(home, '.cache',
        'xPacks')
      this.cacheFolderPath = cacheFolderPath || this.cacheDefaultFolderPath
      this.systemFolderPath = systemFolderPath || '/opt/xPacks'
      this.systemBinFolderPath = '/usr/local/bin'
    } else if (process.platform === 'win32') {
      this.globalDefaultFolderPath = path.join(process.env.APPDATA,
        'xPacks')
      this.globalFolderPath = repoFolderPath || this.globalDefaultFolderPath
      this.cacheDefaultFolderPath = path.join(process.env.LOCALAPPDATA,
        'Caches', 'xPacks')
      this.cacheFolderPath = cacheFolderPath || this.cacheDefaultFolderPath
      this.systemFolderPath = systemFolderPath ||
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
          throw new CliError(
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
                throw new CliError(
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
                throw new CliError(
                  `cannot symlink '${this.globalDefaultFolderPath}' ` +
                  `as '${folderPath}'`)
              }

              log.info(`Folder '${folderPath}' moved to ` +
                `'${this.globalDefaultFolderPath})'; link left behind`)
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
// module.exports.GlobalConfig = GlobalConfig

// In ES6, it would be:
// export class GlobalConfig { ... }
// ...
// import { GlobalConfig } from 'utils/global-config.js'

// ----------------------------------------------------------------------------
