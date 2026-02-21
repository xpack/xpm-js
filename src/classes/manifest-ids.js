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

import assert from 'assert'
import path from 'path'

// ----------------------------------------------------------------------------

export class ManifestIds {
  constructor({ manifest, policies }) {
    this.policies = policies

    if (manifest._id) {
      // If pacote returns an ID, it is considered more trustworthy,
      // although it probably comes from the same name & version fields.
      if (manifest._id.startsWith('@')) {
        const parts = manifest._id.split('/')
        this.scope = parts[0]
        const parts2 = parts[1].split('@')
        this.name = parts2[0]
        this.version = parts2[1] || manifest.version
      } else {
        const parts = manifest._id.split('@')
        this.name = parts[0]
        this.version = parts[1] || manifest.version
      }
    } else {
      // Without ID, use the package.json name & version.
      assert(manifest.name)
      assert(manifest.version)
      if (manifest.name.startsWith('@')) {
        const arr = manifest.name.split('/')
        this.scope = arr[0]
        this.name = arr[1]
        this.version = manifest.version
      } else {
        this.name = manifest.name
        this.version = manifest.version
      }
    }
    this.from_ = manifest._from
    // TODO: validate scope, name & version.
  }

  getScopedName() {
    if (this.scope) {
      return `${this.scope}/${this.name}`
    } else {
      return `${this.name}`
    }
  }

  getPath() {
    if (this.scope) {
      return path.join(this.scope, this.name, this.version)
    } else {
      return path.join(this.name, this.version)
    }
  }

  getPosixPath() {
    if (this.scope) {
      return path.posix.join(this.scope, this.name, this.version)
    } else {
      return path.posix.join(this.name, this.version)
    }
  }

  getFullName() {
    if (this.scope) {
      return `${this.scope}/${this.name}@${this.version}`
    } else {
      return `${this.name}@${this.version}`
    }
  }

  getFolderName() {
    if (this.scope) {
      assert(this.policies, 'Policies must be set to get folder name')
      if (this.policies.nonHierarchicalLocalXpacksFolder) {
        // Linearise the name into a single folder.
        return `${this.scope.slice(1)}-${this.name}`
      } else {
        // Use the same hierarchical folders as npm.
        return path.join(this.scope, this.name)
      }
    } else {
      return `${this.name}`
    }
  }

  getPacoteFrom() {
    return this.from_ ? this.from_ : this.getFullName()
  }
}

// ----------------------------------------------------------------------------
