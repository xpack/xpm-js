/*
 * This file is part of the xPack distribution
 *   (http://xpack.github.io).
 * Copyright (c) 2018 Liviu Ionescu.
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
 * Test `xpm init`.
 */

// ----------------------------------------------------------------------------

const assert = require('assert')
const path = require('path')
const os = require('os')
// const fs = require('fs')

// The `[node-tap](http://www.node-tap.org)` framework.
const test = require('tap').test

const Common = require('../common.js').Common
const Promisifier = require('@xpack/es6-promisifier').Promisifier

// ES6: `import { CliExitCodes } from 'cli-start-options'
const CliExitCodes = require('@ilg/cli-start-options').CliExitCodes
const CliUtils = require('@ilg/cli-start-options').CliUtils

const rimrafPromise = Promisifier.promisify(require('rimraf'))

// https://www.npmjs.com/package/shelljs
const shell = require('shelljs')

assert(Common)
assert(Promisifier)
assert(CliExitCodes)
assert(CliUtils)

// ----------------------------------------------------------------------------

// const fixtures = path.resolve(__dirname, '../fixtures')
// const workFolder = path.resolve(os.tmpdir(), 'xtest-copy')
// const rimrafPromise = Promisifier.promisify(require('rimraf'))
// const mkdirpPromise = Promisifier.promisify(require('mkdirp'))

// Promisified functions from the Node.js callbacks library.
// Promisifier.promisifyInPlace(fs, 'chmod')

// ----------------------------------------------------------------------------

const testAbsolutePath = path.resolve(path.dirname(__dirname))
const repoAbsolutePath = path.join(os.tmpdir(), 'repo')

const opts = {}
opts.env = {
  ...process.env,
  XPACKS_REPO_FOLDER: repoAbsolutePath
}

// ----------------------------------------------------------------------------

/**
 * Test if help content includes convert options.
 */
test('xpm install -h',
  async (t) => {
    try {
      const { code, stdout, stderr } = await Common.xpmCli([
        'install',
        '-h'
      ])
      // Check exit code.
      t.equal(code, CliExitCodes.SUCCESS, 'exit code is success')
      const outLines = stdout.split(/\r?\n/)
      t.ok(outLines.length > 9, 'has enough output')
      // console.log(outLines)
      t.equals(outLines[0], '', 'has empty line')
      t.match(outLines[1], 'install package(s)', 'has title')
      t.match(outLines[2], 'Usage: xpm install [<options>...] ...')
      t.equals(outLines[3], '', 'has empty line')

      t.match(stdout, 'Install options:', 'has install options')
      t.match(stdout, '  -g|--global  ', 'has --global')
      t.match(stdout, '  -sy|--system  ', 'has --system')
      t.match(stdout, '  -f|--force  ', 'has --force')
      t.match(stdout, '  --copy  ', 'has --copy')
      t.match(stdout, '  -n|--dry-run  ', 'has --dry-run')
      // There should be no error messages.
      t.equal(stderr, '', 'stderr is empty')
    } catch (err) {
      t.fail(err.message)
    }
    t.end()
  })

test('xpm install from folder standalone',
  async (t) => {
    const fromPath = path.join(testAbsolutePath, 'mock', 'afrom')
    const workFolderPath = path.resolve(os.tmpdir(), 'folder-sta')
    await rimrafPromise(workFolderPath)
    await rimrafPromise(repoAbsolutePath)

    await t.test('clean install', async (t) => {
      try {
        const { code, stdout, stderr } = await Common.xpmCli([
          'instal',
          fromPath,
          '-C',
          workFolderPath,
          '-dd'
        ], opts)
        // Check exit code.
        t.equal(code, CliExitCodes.SUCCESS, 'exit code is success')
        // console.log(stdout)
        const outLines = stdout.split(/\r?\n/)
        t.ok(outLines.length > 1, 'has enough output')
        t.match(stdout, 'Installing standalone package',
          'has installed standalone')

        // There should be no error messages.
        // console.log(stderr)
        t.equal(stderr, '', 'stderr is empty')
      } catch (err) {
        t.fail(err.message)
      }

      t.end()
    })

    await t.test('check repo package', async (t) => {
      const packageFolder = path.join(
        repoAbsolutePath, '@testscope', 'afrom', '1.2.3')
      try {
        await CliUtils.readPackageJson(packageFolder)
        t.fail('has json')
      } catch (err) {
        t.pass('has not json')
      }

      t.end()
    })

    await t.test('check package', async (t) => {
      const packageFolder = path.join(workFolderPath, 'testscope-afrom')
      const json = await CliUtils.readPackageJson(packageFolder)
      t.ok(json, 'has json')
      t.equal(json.name, '@testscope/afrom', 'has name')
      t.equal(json.version, '1.2.3', 'has version')

      t.end()
    })

    // Try again, it must fail.
    await t.test('already there', async (t) => {
      try {
        const { code, stdout, stderr } = await Common.xpmCli([
          'instal',
          fromPath,
          '-C',
          workFolderPath,
          '-dd'
        ], opts)
        // Check exit code.
        t.equal(code, CliExitCodes.ERROR.OUTPUT, 'exit code is OUTPUT')
        // console.log(stdout)
        const outLines = stdout.split(/\r?\n/)
        t.ok(outLines.length > 1, 'has enough output')

        // console.log(stderr)
        t.match(stderr, 'warning: Package already installed',
          'stderr has warning')
      } catch (err) {
        t.fail(err.message)
      }
      t.end()
    })

    // Try again with --force
    await t.test('use force', async (t) => {
      try {
        const { code, stdout, stderr } = await Common.xpmCli([
          'instal',
          fromPath,
          '-C',
          workFolderPath,
          '-dd',
          '--force'
        ], opts)
        // Check exit code.
        t.equal(code, CliExitCodes.SUCCESS, 'exit code is success')
        // console.log(stdout)
        const outLines = stdout.split(/\r?\n/)
        t.ok(outLines.length > 1, 'has enough output')
        t.match(stdout, 'Installing standalone package',
          'has installed standalone')

        // There should be no error messages.
        t.equal(stderr, '', 'stderr is empty')
      } catch (err) {
        t.fail(err.message)
      }
      t.end()
    })

    await t.test('check package again', async (t) => {
      const packageFolder = path.join(workFolderPath, 'testscope-afrom')
      const json = await CliUtils.readPackageJson(packageFolder)
      t.ok(json, 'has json')
      t.equal(json.name, '@testscope/afrom', 'has name')
      t.equal(json.version, '1.2.3', 'has version')

      t.end()
    })

    t.end()
  }
)

test('xpm install from folder globally',
  async (t) => {
    const fromPath = path.join(testAbsolutePath, 'mock', 'afrom')
    const workFolderPath = path.resolve(os.tmpdir(), 'folder-gbl')
    await rimrafPromise(workFolderPath)
    await rimrafPromise(repoAbsolutePath)

    shell.set('-e')

    shell.mkdir('-p', workFolderPath)

    await t.test('clean install', async (t) => {
      try {
        const { code, stdout, stderr } = await Common.xpmCli([
          'install',
          fromPath,
          '-C',
          workFolderPath,
          '-g',
          '-dd'
        ], opts)
        // Check exit code.
        t.equal(code, CliExitCodes.SUCCESS, 'exit code is success')
        // console.log(stdout)
        const outLines = stdout.split(/\r?\n/)
        t.ok(outLines.length > 1, 'has enough output')
        t.match(stdout, 'Installing globally in', 'has installed globally')
        t.match(stdout, 'Write protecting folder', 'has write protecting')

        // There should be no error messages.
        t.equal(stderr, '', 'stderr is empty')
      } catch (err) {
        t.fail(err.message)
      }

      t.end()
    })

    await t.test('check repo package', async (t) => {
      const packageFolder = path.join(
        repoAbsolutePath, '@testscope', 'afrom', '1.2.3')
      const json = await CliUtils.readPackageJson(packageFolder)
      t.ok(json, 'has json')
      t.equal(json.name, '@testscope/afrom', 'has name')
      t.equal(json.version, '1.2.3', 'has version')

      t.end()
    })

    // Try again, it must fail.
    await t.test('already there', async (t) => {
      try {
        const { code, stdout, stderr } = await Common.xpmCli([
          'install',
          fromPath,
          '-C',
          workFolderPath,
          '-g',
          '-dd'
        ], opts)
        // Check exit code.
        t.equal(code, CliExitCodes.ERROR.OUTPUT, 'exit code is OUTPUT')
        // console.log(stdout)
        const outLines = stdout.split(/\r?\n/)
        t.ok(outLines.length > 1, 'has enough output')

        // console.log(stderr)
        t.match(stderr, 'warning: Package already installed',
          'stderr has warning')
      } catch (err) {
        t.fail(err.message)
      }
      t.end()
    })

    await t.test('use force', async (t) => {
      try {
        const { code, stdout, stderr } = await Common.xpmCli([
          'install',
          fromPath,
          '-C',
          workFolderPath,
          '-g',
          '-dd',
          '--force'
        ], opts)
        // Check exit code.
        t.equal(code, CliExitCodes.SUCCESS, 'exit code is success')
        // console.log(stdout)
        const outLines = stdout.split(/\r?\n/)
        t.ok(outLines.length > 1, 'has enough output')
        t.match(stdout, 'Unprotecting folder', 'has unprotecting')
        t.match(stdout, 'Removing folder', 'has removing')
        t.match(stdout, 'Installing globally in', 'has installed globally')
        t.match(stdout, 'Write protecting folder', 'has write protecting')

        // There should be no error messages.
        t.equal(stderr, '', 'stderr is empty')
      } catch (err) {
        t.fail(err.message)
      }

      t.end()
    })

    shell.chmod('-R', 'a+w', repoAbsolutePath)

    t.end()
  }
)

test('xpm install from folder locally copy',
  async (t) => {
    const fromPath = path.join(testAbsolutePath, 'mock', 'afrom')
    const destPath = path.join(testAbsolutePath, 'mock', 'adest')
    const workFolderPath = path.resolve(os.tmpdir(), 'folder-lcl-cpy')
    await rimrafPromise(workFolderPath)
    await rimrafPromise(repoAbsolutePath)

    shell.set('-e')

    shell.mkdir('-p', workFolderPath)
    shell.cp(path.join(destPath, 'package.json'), workFolderPath)

    await t.test('clean install', async (t) => {
      try {
        const { code, stdout, stderr } = await Common.xpmCli([
          'install',
          fromPath,
          '-C',
          workFolderPath,
          '-dd',
          '--copy'
        ], opts)
        // Check exit code.
        t.equal(code, CliExitCodes.SUCCESS, 'exit code is success')
        // console.log(stdout)
        const outLines = stdout.split(/\r?\n/)
        t.ok(outLines.length > 1, 'has enough output')
        t.match(stdout, 'Copying locally as \'xpacks/testscope-afrom\'',
          'has copying locally')
        t.match(stdout, 'Adding "@testscope/afrom":',
          'has adding dependencies')

        // There should be no error messages.
        t.equal(stderr, '', 'stderr is empty')
      } catch (err) {
        t.fail(err.message)
      }

      t.end()
    })

    await t.test('check repo package', async (t) => {
      const packageFolder = path.join(
        repoAbsolutePath, '@testscope', 'afrom', '1.2.3')
      try {
        await CliUtils.readPackageJson(packageFolder)
        t.fail('has json')
      } catch (err) {
        t.pass('has not json')
      }

      t.end()
    })

    await t.test('check deps', async (t) => {
      const json = await CliUtils.readPackageJson(workFolderPath)
      t.ok(json, 'has json')
      t.match(json.dependencies['@testscope/afrom'], 'test/mock/afrom',
        'has path')

      t.end()
    })

    // Try again, it must fail.
    await t.test('already there', async (t) => {
      try {
        const { code, stdout, stderr } = await Common.xpmCli([
          'install',
          fromPath,
          '-C',
          workFolderPath,
          '-dd',
          '--copy'
        ], opts)
        // Check exit code.
        t.equal(code, CliExitCodes.ERROR.OUTPUT, 'exit code is OUTPUT')
        // console.log(stdout)
        const outLines = stdout.split(/\r?\n/)
        t.ok(outLines.length > 1, 'has enough output')

        // console.log(stderr)
        t.match(stderr, 'warning: Package already installed',
          'stderr has warning')
      } catch (err) {
        t.fail(err.message)
      }
      t.end()
    })

    await t.test('use force', async (t) => {
      try {
        const { code, stdout, stderr } = await Common.xpmCli([
          'install',
          fromPath,
          '-C',
          workFolderPath,
          '-dd',
          '--force',
          '--copy'
        ], opts)
        // Check exit code.
        t.equal(code, CliExitCodes.SUCCESS, 'exit code is success')
        // console.log(stdout)
        const outLines = stdout.split(/\r?\n/)
        t.ok(outLines.length > 1, 'has enough output')
        t.match(stdout, 'Copying locally as \'xpacks/testscope-afrom\'',
          'has copying locally')
        t.match(stdout, 'Adding "@testscope/afrom":',
          'has adding dependencies')

        // There should be no error messages.
        t.equal(stderr, '', 'stderr is empty')
      } catch (err) {
        t.fail(err.message)
      }

      t.end()
    })

    t.end()
  }
)

test('xpm install from folder locally link',
  async (t) => {
    const fromPath = path.join(testAbsolutePath, 'mock', 'afrom')
    const destPath = path.join(testAbsolutePath, 'mock', 'adest')
    const workFolderPath = path.resolve(os.tmpdir(), 'folder-lcl-lnk')
    await rimrafPromise(workFolderPath)
    await rimrafPromise(repoAbsolutePath)

    shell.set('-e')

    shell.mkdir('-p', workFolderPath)
    shell.cp(path.join(destPath, 'package.json'), workFolderPath)

    await t.test('check deps before', async (t) => {
      const json = await CliUtils.readPackageJson(workFolderPath)
      t.ok(json, 'has json')
      t.notOk(json.dependencies, 'has no deps')

      t.end()
    })

    await t.test('clean install', async (t) => {
      try {
        const { code, stdout, stderr } = await Common.xpmCli([
          'install',
          fromPath,
          '-C',
          workFolderPath,
          '-dd'
        ], opts)
        // Check exit code.
        t.equal(code, CliExitCodes.SUCCESS, 'exit code is success')
        // console.log(stdout)
        const outLines = stdout.split(/\r?\n/)
        t.ok(outLines.length > 1, 'has enough output')
        t.match(stdout, 'Linking locally as \'xpacks/testscope-afrom\'',
          'has linking locally')
        t.match(stdout, 'Adding "@testscope/afrom":',
          'has adding dependencies')

        // There should be no error messages.
        t.equal(stderr, '', 'stderr is empty')
      } catch (err) {
        t.fail(err.message)
      }

      t.end()
    })

    await t.test('check repo package', async (t) => {
      const packageFolder = path.join(
        repoAbsolutePath, '@testscope', 'afrom', '1.2.3')
      const json = await CliUtils.readPackageJson(packageFolder)
      t.ok(json, 'has json')
      t.equal(json.name, '@testscope/afrom', 'has name')
      t.equal(json.version, '1.2.3', 'has version')

      t.end()
    })

    await t.test('check deps', async (t) => {
      const json = await CliUtils.readPackageJson(workFolderPath)
      t.ok(json, 'has json')
      t.match(json.dependencies['@testscope/afrom'], 'test/mock/afrom',
        'has path')

      t.end()
    })

    // Try again, it must fail.
    await t.test('already there', async (t) => {
      try {
        const { code, stdout, stderr } = await Common.xpmCli([
          'install',
          fromPath,
          '-C',
          workFolderPath,
          '-dd'
        ], opts)
        // Check exit code.
        t.equal(code, CliExitCodes.ERROR.OUTPUT, 'exit code is OUTPUT')
        // console.log(stdout)
        const outLines = stdout.split(/\r?\n/)
        t.ok(outLines.length > 1, 'has enough output')

        // console.log(stderr)
        t.match(stderr, 'warning: Package already installed',
          'stderr has warning')
      } catch (err) {
        t.fail(err.message)
      }
      t.end()
    })

    await t.test('use force', async (t) => {
      try {
        const { code, stdout, stderr } = await Common.xpmCli([
          'install',
          fromPath,
          '-C',
          workFolderPath,
          '-dd',
          '--force'
        ], opts)
        // Check exit code.
        t.equal(code, CliExitCodes.SUCCESS, 'exit code is success')
        // console.log(stdout)
        const outLines = stdout.split(/\r?\n/)
        t.ok(outLines.length > 1, 'has enough output')
        t.match(stdout, 'Linking locally as \'xpacks/testscope-afrom\'',
          'has linking locally')
        t.match(stdout, 'Adding "@testscope/afrom":',
          'has adding dependencies')

        // There should be no error messages.
        t.equal(stderr, '', 'stderr is empty')
      } catch (err) {
        t.fail(err.message)
      }

      t.end()
    })

    shell.chmod('-R', 'a+w', repoAbsolutePath)

    t.end()
  }
)

test('xpm install from npmjs locally link',
  async (t) => {
    const destPath = path.join(testAbsolutePath, 'mock', 'adest')
    const workFolderPath = path.resolve(os.tmpdir(), 'rem-npmjs-lcl-lnk')
    await rimrafPromise(workFolderPath)
    await rimrafPromise(repoAbsolutePath)

    shell.set('-e')

    shell.mkdir('-p', workFolderPath)
    shell.cp(path.join(destPath, 'package.json'), workFolderPath)

    await t.test('check deps before', async (t) => {
      const json = await CliUtils.readPackageJson(workFolderPath)
      t.ok(json, 'has json')
      t.notOk(json.dependencies, 'has no deps')

      t.end()
    })

    await t.test('npmjs install', async (t) => {
      try {
        const { code, stdout, stderr } = await Common.xpmCli([
          'install',
          '@xpack/xpm-develop-test',
          '-C',
          workFolderPath,
          '-dd'
        ], opts)
        // Check exit code.
        t.equal(code, CliExitCodes.SUCCESS, 'exit code is success')
        // console.log(stdout)
        const outLines = stdout.split(/\r?\n/)
        t.ok(outLines.length > 1, 'has enough output')
        t.match(stdout, 'Adding to repository', 'has adding to repo')
        t.match(stdout, 'Write protecting folder', 'has write protecting')
        t.match(stdout, 'Linking locally as \'xpacks/xpack-xpm-develop-test\'',
          'has linking locally')
        t.match(stdout, 'Adding "@xpack/xpm-develop-test": "^1.0.0"',
          'has adding dependencies')

        // There should be no error messages.
        t.equal(stderr, '', 'stderr is empty')
      } catch (err) {
        t.fail(err.message)
      }

      t.end()
    })

    await t.test('check repo package', async (t) => {
      const packageFolder = path.join(
        repoAbsolutePath, '@xpack', 'xpm-develop-test', '1.0.0')
      const json = await CliUtils.readPackageJson(packageFolder)
      t.ok(json, 'has json')
      t.equal(json.name, '@xpack/xpm-develop-test', 'has name')
      t.equal(json.version, '1.0.0', 'has version')

      t.end()
    })

    await t.test('check deps', async (t) => {
      const json = await CliUtils.readPackageJson(workFolderPath)
      t.ok(json, 'has json')
      t.match(json.dependencies['@xpack/xpm-develop-test'], '^1.0.0',
        'has version')

      t.end()
    })

    shell.chmod('-R', 'a+w', repoAbsolutePath)

    t.end()
  }
)

test('xpm install from github tgz locally link',
  async (t) => {
    const destPath = path.join(testAbsolutePath, 'mock', 'adest')
    const workFolderPath = path.resolve(os.tmpdir(), 'rem-gh-tgz-lcl-lnk')
    await rimrafPromise(workFolderPath)
    await rimrafPromise(repoAbsolutePath)

    shell.set('-e')

    shell.mkdir('-p', workFolderPath)
    shell.cp(path.join(destPath, 'package.json'), workFolderPath)

    await t.test('check deps before', async (t) => {
      const json = await CliUtils.readPackageJson(workFolderPath)
      t.ok(json, 'has json')
      t.notOk(json.dependencies, 'has no deps')

      t.end()
    })

    await t.test('npmjs install', async (t) => {
      try {
        const { code, stdout, stderr } = await Common.xpmCli([
          'install',
          'https://github.com/xpack/xpm-develop-test-xpack/archive/v1.0.0.tar.gz',
          '-C',
          workFolderPath,
          '-dd'
        ], opts)
        // Check exit code.
        t.equal(code, CliExitCodes.SUCCESS, 'exit code is success')
        // console.log(stdout)
        const outLines = stdout.split(/\r?\n/)
        t.ok(outLines.length > 1, 'has enough output')
        t.match(stdout, 'Adding to repository', 'has adding to repo')
        t.match(stdout, 'Write protecting folder', 'has write protecting')
        t.match(stdout, 'Linking locally as \'xpacks/xpack-xpm-develop-test\'',
          'has linking locally')
        t.match(stdout, 'Adding "@xpack/xpm-develop-test": "https:',
          'has adding dependencies')

        // There should be no error messages.
        t.equal(stderr, '', 'stderr is empty')
      } catch (err) {
        t.fail(err.message)
      }

      t.end()
    })

    await t.test('check repo package', async (t) => {
      const packageFolder = path.join(
        repoAbsolutePath, '@xpack', 'xpm-develop-test', '1.0.0')
      const json = await CliUtils.readPackageJson(packageFolder)
      t.ok(json, 'has json')
      t.equal(json.name, '@xpack/xpm-develop-test', 'has name')
      t.equal(json.version, '1.0.0', 'has version')

      t.end()
    })

    await t.test('check deps', async (t) => {
      const json = await CliUtils.readPackageJson(workFolderPath)
      t.ok(json, 'has json')
      t.match(json.dependencies['@xpack/xpm-develop-test'], 'https:',
        'has version')

      t.end()
    })

    shell.chmod('-R', 'a+w', repoAbsolutePath)

    t.end()
  }
)

test('xpm install from github locally link',
  async (t) => {
    const destPath = path.join(testAbsolutePath, 'mock', 'adest')
    const workFolderPath = path.resolve(os.tmpdir(), 'rem-gh-lcl-lnk')
    await rimrafPromise(workFolderPath)
    await rimrafPromise(repoAbsolutePath)

    shell.set('-e')

    shell.mkdir('-p', workFolderPath)
    shell.cp(path.join(destPath, 'package.json'), workFolderPath)

    await t.test('check deps before', async (t) => {
      const json = await CliUtils.readPackageJson(workFolderPath)
      t.ok(json, 'has json')
      t.notOk(json.dependencies, 'has no deps')

      t.end()
    })

    await t.test('npmjs install', async (t) => {
      try {
        const { code, stdout, stderr } = await Common.xpmCli([
          'install',
          'xpack/xpm-develop-test-xpack',
          '-C',
          workFolderPath,
          '-dd'
        ], opts)
        // Check exit code.
        t.equal(code, CliExitCodes.SUCCESS, 'exit code is success')
        // console.log(stdout)
        const outLines = stdout.split(/\r?\n/)
        t.ok(outLines.length > 1, 'has enough output')
        t.match(stdout, 'Adding to repository', 'has adding to repo')
        t.match(stdout, 'Write protecting folder', 'has write protecting')
        t.match(stdout, 'Linking locally as \'xpacks/xpack-xpm-develop-test\'',
          'has linking locally')
        t.match(stdout, 'Adding "@xpack/xpm-develop-test": "github:',
          'has adding dependencies')

        // There should be no error messages.
        t.equal(stderr, '', 'stderr is empty')
      } catch (err) {
        t.fail(err.message)
      }

      t.end()
    })

    await t.test('check repo package', async (t) => {
      const packageFolder = path.join(
        repoAbsolutePath, '@xpack', 'xpm-develop-test', '1.0.0')
      const json = await CliUtils.readPackageJson(packageFolder)
      t.ok(json, 'has json')
      t.equal(json.name, '@xpack/xpm-develop-test', 'has name')
      t.equal(json.version, '1.0.0', 'has version')

      t.end()
    })

    await t.test('check deps', async (t) => {
      const json = await CliUtils.readPackageJson(workFolderPath)
      t.ok(json, 'has json')
      t.match(json.dependencies['@xpack/xpm-develop-test'],
        'github:xpack/xpm-develop-test-xpack',
        'has github')

      t.end()
    })

    shell.chmod('-R', 'a+w', repoAbsolutePath)

    t.end()
  }
)

// ----------------------------------------------------------------------------
