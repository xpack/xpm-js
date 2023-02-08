#!/usr/bin/env node
// Mandatory shebang must point to `node` and this file must be executable.

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

/*
 * On POSIX platforms, when installing a global package,
 * a symbolic link named `xpm` is created
 * in the `/usr/local/bin` folder (on macOS), or
 * in the `/usr/bin` folder (on Ubuntu), pointing to this file.
 *
 * On Windows, where symbolic links are not available,
 * when installing a global package,
 * two forwarders are automatically created in the
 * user `\AppData\Roaming\npm\node_modules\xpm\bin` folder:
 * - `xpm.cmd`, for invocation from the Windows command line
 * - `xpm` (a shell script), for invokations from an optional
 * POSIX environments like minGW-w64, msys2, git shell, etc.
 *
 * On all platforms, `process.argv[1]` will be the full path of
 * this file, or the full path of the `xpm` link, so, in case
 * the program will need to be invoked with different names,
 * this is the method to differentiate between them.
 */

// ----------------------------------------------------------------------------

// ES6: `import { Xpm } from 'main.js'
import { Xpm } from '../lib/main.js'

// ----------------------------------------------------------------------------

// TODO: use instances, not static classes.
Xpm.start().then((code) => { process.exitCode = code })

// ----------------------------------------------------------------------------
