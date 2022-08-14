/*
 * This file is part of the xPack project (http://xpack.github.io).
 * Copyright (c) 2018 Liviu Ionescu. All rights reserved.
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

/**
 * Test global configuration definitions.
 */

// ----------------------------------------------------------------------------

// The `[node-tap](http://www.node-tap.org)` framework.
const test = require('tap').test

const { ManifestIds } = require('../../lib/utils/xpack.js')
const { Xpack } = require('../../lib/utils/xpack.js')

// const Common = require('../common.js').Common
const { CliLogger } = require('@ilg/cli-start-options')

// ----------------------------------------------------------------------------

// let pack = null
// const rootPath = path.dirname(path.dirname(__dirname))

test('utils/xpack', (t) => {
  const context = {}
  context.log = new CliLogger(console)

  const xpack = new Xpack('x', context)
  t.ok(xpack, 'spawn set')
  const mid = new ManifestIds({ _id: 'xx' })
  t.ok(mid, 'mid set')

  t.end()
})
// ----------------------------------------------------------------------------
