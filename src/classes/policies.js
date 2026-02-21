/*
 * This file is part of the xPack project (http://xpack.github.io).
 * Copyright (c) 2017-2026 Liviu Ionescu. All rights reserved.
 *
 * Permission to use, copy, modify, and/or distribute this software
 * for any purpose is hereby granted, under the terms of the MIT license.
 *
 * If a copy of the license was not distributed with this file, it can
 * be obtained from https://opensource.org/license/mit.
 */

'use strict'

// ----------------------------------------------------------------------------

// https://nodejs.org/docs/latest/api/
import assert from 'assert'

// https://www.npmjs.com/package/semver
import semver from 'semver'

// ============================================================================

export class XpmPolicies {
  constructor(minVersion, context) {
    this.minVersion = minVersion || '0.0.0'
    assert(context, 'mandatory context')
    this.context = context
    this.log = context.log

    const log = this.log

    // log.trace(`minVersion: ${this.minVersion}`)
    this.shareNpmDependencies = semver.lt(this.minVersion, '0.14.0')
    this.nonHierarchicalLocalXpacksFolder = semver.lt(this.minVersion, '0.16.0')
    this.onlyStringDependencies = semver.lt(this.minVersion, '0.16.0')

    log.trace(`policies.shareNpmDependencies: ${this.shareNpmDependencies}`)
  }
}

// ----------------------------------------------------------------------------
