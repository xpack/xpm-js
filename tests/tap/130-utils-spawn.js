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
import { test } from 'tap'

import { Spawn } from '../../lib/utils/spawn.js'

// ----------------------------------------------------------------------------

// let pack = null
// const rootPath = path.dirname(path.dirname(__dirname))

test('utils/spawn', (t) => {
  const spawn = new Spawn()
  t.ok(spawn, 'spawn set')
  t.end()
})
// ----------------------------------------------------------------------------
