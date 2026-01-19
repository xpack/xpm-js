// https://typescript-eslint.io/packages/typescript-eslint/
// https://eslint.org/docs/latest/use/configure/configuration-files

// @ts-check

import eslint from '@eslint/js'
import prettierConfig from 'eslint-config-prettier'
import tseslint from 'typescript-eslint'

export default tseslint.config({
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
      projectService:true,
      // tells our parser the absolute path of your project's root directory
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
