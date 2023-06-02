[![npm (scoped)](https://img.shields.io/npm/v/xpm.svg)](https://www.npmjs.com/package/xpm/)
[![license](https://img.shields.io/github/license/xpack/xpm-js.svg)](https://github.com/xpack/xpm-js/blob/master/LICENSE)
[![Standard](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com/)
[![CI on Push](https://github.com/xpack/xpm-js/actions/workflows/node-ci.yml/badge.svg)](https://github.com/xpack/xpm-js/actions/)
[![GitHub issues](https://img.shields.io/github/issues/xpack/xpm-js.svg)](https://github.com/xpack/xpm-js/issues/)
[![GitHub pulls](https://img.shields.io/github/issues-pr/xpack/xpm-js.svg)](https://github.com/xpack/xpm-js/pulls/)

# Developer info

This page documents the prerequisites and procedures used during the
development of the `xpm` module.

This project is currently written in JavaScript, but a rewrite to
TypeScript is planned.

## Prerequisites

The prerequisites are:

- git
- node >= 14.13.1 (for stable modules)
- npm

## Clone the project repository

The project is hosted on GitHub:

- <https://github.com/xpack/xpm-js.git>

To clone the `master` branch, use:

```sh
mkdir "${HOME}/Work/node-modules" && cd "${HOME}/Work/node-modules"
git clone https://github.com/xpack/xpm-js.git xpm-js.git
```

For development, to clone the `develop` branch, use:

```sh
git clone --branch develop https://github.com/xpack/xpm-js.git xpm-js.git
```

## Satisfy dependencies

```sh
npm install
```

To later check for newer dependencies:

```sh
npm outdated
```

Details about dependencies:

- <https://www.npmjs.com/package/@ilg/cli-start-options>
- <https://www.npmjs.com/package/@xpack/xpm-liquid>
- <https://www.npmjs.com/package/cacache>
- <https://www.npmjs.com/package/cp-file>
- <https://www.npmjs.com/package/decompress>
- <https://www.npmjs.com/package/del>
- <https://www.npmjs.com/package/is-windows>
- <https://www.npmjs.com/package/liquidjs>
- <https://www.npmjs.com/package/mz>
- <https://www.npmjs.com/package/node-fetch>
- <https://www.npmjs.com/package/pacote>
- <https://www.npmjs.com/package/parse-git-config>
- <https://www.npmjs.com/package/semver>
- <https://www.npmjs.com/package/tar>
- <https://www.npmjs.com/package/user-home>

## Language standard compliance

The module uses ECMAScript 6 class definitions and modules.

## Standard style

As style, the project uses the
[JavaScript Standard Style](https://standardjs.com/),
automatically checked at each commit via CI.

Generally, to fit two editor windows side by side in a screen,
all files should limit the line length to 80.

```js
/* eslint max-len: [ "error", 80, { "ignoreUrls": true } ] */
```

Known and accepted exceptions:

- none

To manually fix compliance with the style guide (where possible):

```console
$ npm run fix

> xpm@0.16.0 fix
> standard --fix
```

## Tests

The tests use the [`node-tap`](http://www.node-tap.org) framework
(_A Test-Anything-Protocol library for Node.js_, written by Isaac Schlueter).

As for any `npm` package, the standard way to run the project tests is
via `npm test`:

```sh
cd xpm-js.git
npm install
npm run test
```

To run a specific test with more verbose output, use `npm run tap`:

```sh
npm run tap test/tap/...
```

### Coverage tests

Coverage tests are a good indication on how much of the source files is
exercised by the tests. Ideally all source files should be covered 100%,
for all 4 criteria (statements, branches, functions, lines).

To run the coverage tests, use `npm run test-coverage`:

```sh
npm run test-coverage
...
```

#### Coverage exceptions

Use `/* istanbul ignore next <something> */` before the code to be ignored
(<https://github.com/gotwarlost/istanbul/blob/master/ignoring-code-for-coverage.md>).

Fully excluded files:

- `lib/utils/cmd-shim.js`

### Continuous Integration (CI)

The continuous integration tests are performed via
GitHub Actions.

The tests are currently performed with node 14, 16, 18.

To preserve compatibility with Node 10, use the older
version of the documentation:

- [Node.js 14 documentation](https://nodejs.org/docs/latest-v14.x/api/)

### Documentation metadata

The documentation metadata follows the [JSdoc](http://usejsdoc.org) tags.

To enforce checking at file level, add the following comments right after
the `use strict`:

```js
'use strict'
/* eslint valid-jsdoc: "error" */
/* eslint max-len: [ "error", 80, { "ignoreUrls": true } ] */
```

Note: be sure C style comments are used, C++ styles are not parsed by
[ESLint](http://eslint.org).

## Dependencies issues

There were some problems with cacache & pacote.

- cacache@15.0.3: fails to download binaries.
- pacote@11.1.10: apparently works, but passing the stream to cacache fails.

The previous known to work versions:

```js
    "cacache": "^12.0.2",
    "pacote": "^9.4.1",
```

Note: the cacache version should match the one used inside pacote.

- <https://github.com/npm/cacache/issues/27>
- <https://github.com/npm/pacote/issues/21>

TODO: investigate and update.

## Project templates

**xpm** is able to create new projects based on templates.

To be accepted as a template, a project must:

- be an xPack (have a `package.json` which includes an `xpack` property
- have a property called `main` in `package.json`, pointing to a JavaScript
  file that can be consumed by `await import()` (formerly `require()`)
- the main file must export a class called `XpmInitTemplate`
- an instances of this class must have a `run()` method.
- have all dependencies bundled in (via `bundleDependencies`)

The steps invoked by **xpm** to initialise a project from a template are:

- call pacote to install the xPack in the global home folder
- identify the `main` property in `package.json`
- import the `XpmInitTemplate` class from the main JavaScript file by
  invoking _require()_
- instantiate the `XpmInitTemplate` class
- execute the `run()` method.

The full code is in `init.js`, but a simplified version looks like this:

```js
    await pacote.extract(config.template, globalPackagePath,
      { cache: cacheFolderPath })

    const mainTemplatePath = path.join(globalPackagePath, globalJson.main)

    context.CliError = CliError
    context.CliExitCodes = CliExitCodes

    const { XpmInitTemplate } = await import(mainTemplatePath)
    const xpmInitTemplate = new XpmInitTemplate(context)
    const code = await xpmInitTemplate.run()
```
