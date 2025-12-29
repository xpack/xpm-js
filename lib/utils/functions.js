/*
 * This file is part of the xPack project (http://xpack.github.io).
 * Copyright (c) 2017 Liviu Ionescu. All rights reserved.
 *
 * Permission to use, copy, modify, and/or distribute this software
 * for any purpose is hereby granted, under the terms of the MIT license.
 *
 * If a copy of the license was not distributed with this file, it can
 * be obtained from https://opensource.org/license/mit.
 */

'use strict'

import cliStartOptionsCsj from '@ilg/cli-start-options'

// https://www.npmjs.com/package/@xpack/xpm-lib
import { XpmPrerequisitesError, XpmInputError, XpmError } from '@xpack/xpm-lib'

/* eslint valid-jsdoc: "error" */
/* eslint max-len: [ "error", 80, { "ignoreUrls": true } ] */

// ----------------------------------------------------------------------------

const {
  CliErrorPrerequisites,
  CliErrorInput,
  CliError
} = cliStartOptionsCsj

export function isString (x) {
  return Object.prototype.toString.call(x) === '[object String]'
}

export function isObject (x) {
  return typeof x === 'object' && !Array.isArray(x)
}

export function isBoolean (x) {
  return typeof x === 'boolean'
}

export function convertXpmError (err) {
  if (err instanceof XpmPrerequisitesError) {
    return new CliErrorPrerequisites(err.message)
  } else if (err instanceof XpmInputError) {
    return new CliErrorInput(err.message)
  } else if (err instanceof XpmError) {
    return new CliError(err.message)
  }
  return err
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// Each function is added as a property of this object.
// module.exports.isString = isString
// module.exports.isObject = isObject
// module.exports.isBoolean = isBoolean

// In ES6, it would be:
// import { isString, isObject, isBoolean } from 'functions.js'

// ----------------------------------------------------------------------------
