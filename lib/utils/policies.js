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

// https://nodejs.org/docs/latest-v12.x/api/index.html
import assert from 'assert'

// https://www.npmjs.com/package/semver
import semver from 'semver'

// ============================================================================

export class Policies {
  constructor (minVersion, context) {
    this.minVersion = minVersion || '0.0.0'
    assert(context, 'mandatory context')
    this.context = context
    this.log = context.log

    const log = this.log

    // log.trace(`minVersion: ${this.minVersion}`)
    this.shareNpmDependencies = semver.lt(this.minVersion, '0.14.0')
    this.nonHierarchicalLocalXpacksFolder = semver.lt(this.minVersion, '0.16.0')
    this.onlyStringDependencies = semver.lt(this.minVersion, '0.16.0')

    log.trace(
      `policies.shareNpmDependencies: ${this.shareNpmDependencies}`)
  }
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// The Policies class is added as a property of this object.
// module.exports.Policies = Policies

// In ES6, it would be:
// export class Policies { ... }
// ...
// import { Policies } from '../utils/Policies.js'

// ----------------------------------------------------------------------------
