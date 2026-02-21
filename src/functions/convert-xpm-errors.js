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

import cliStartOptionsCsj from '@ilg/cli-start-options'

// https://www.npmjs.com/package/@xpack/xpm-lib
import * as xpmLib from '@xpack/xpm-lib'

// ----------------------------------------------------------------------------

const { CliErrorPrerequisites, CliErrorInput, CliError } = cliStartOptionsCsj

export function convertXpmError(error) {
  if (error instanceof xpmLib.PrerequisitesError) {
    return new CliErrorPrerequisites(error.message)
  } else if (error instanceof xpmLib.InputError) {
    return new CliErrorInput(error.message)
  }
  return new CliError(error.message)
}

// ----------------------------------------------------------------------------
