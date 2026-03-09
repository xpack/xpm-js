/*
 * DO NOT EDIT!
 * Automatically generated from npm-packages-helper/templates/*.
 *
 * This file is part of the xPack project (http://xpack.github.io).
 * Copyright (c) 2021-2026 Liviu Ionescu. All rights reserved.
 *
 * Permission to use, copy, modify, and/or distribute this software
 * for any purpose is hereby granted, under the terms of the MIT license.
 *
 * If a copy of the license was not distributed with this file, it can
 * be obtained from https://opensource.org/license/mit.
 */

// ----------------------------------------------------------------------------

// https://typescript-eslint.io/packages/typescript-eslint/
// https://eslint.org/docs/latest/use/configure/configuration-files

// @ts-check

import eslint from '@eslint/js'
import prettierConfig from 'eslint-config-prettier'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tseslint from 'typescript-eslint'

const configFilePath = fileURLToPath(import.meta.url)
const configFolderPath = path.dirname(configFilePath)

export default tseslint.config(
  {
    extends: [
      eslint.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      prettierConfig,
    ],
    ignores: [],
    rules: {
      'max-len': [
        'warn',
        80,
        {
          ignoreUrls: true,
          ignorePattern:
            '^\\s*// eslint-disable-next-line|^\\s*// console\\.log|^\\s*//\\s*<xsd:|^\\s*import\\s+\\{[^}]+\\}\\s+from\\s+[\'"][^\'"]+[\'"]|^\\s*import\\s+type\\s+\\{[^}]+\\}\\s+from\\s+[\'"][^\'"]+[\'"]|^export class .+ extends .+\\{$',
        },
      ],
    },
    languageOptions: {
      parserOptions: {
        // ask TypeScript's type checking service for each source file's type information
        projectService: true,
        // tells our parser the absolute path of your project's root directory
        tsconfigRootDir: path.resolve(configFolderPath, '..'),
      },
    },
  },
  {
    // Override for test files - disable TypeScript type checking
    files: ['tests/**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: {
        process: 'readonly',
      },
    },
  }
)
