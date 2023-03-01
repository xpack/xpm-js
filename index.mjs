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

/**
 * This is the module entry point, the file that is processed when
 * `import('<module>')` is used.
 *
 * For this to work, it must be linked from `package.json` as
 * `"exports": { "import": "./index.mjs" }`.
 *
 * To import classes from this module into Node.js applications, use:
 *
 * ```javascript
 * import { Main } from '<module>'
 * ```
 */

// ES6: `import { Main } from './lib/main.js'
import mainCsj from './lib/main.js'

export const { Main } = mainCsj

// ----------------------------------------------------------------------------
