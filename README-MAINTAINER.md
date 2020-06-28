[![npm (scoped)](https://img.shields.io/npm/v/xpm.svg)](https://www.npmjs.com/package/xpm)
[![license](https://img.shields.io/github/license/xpack/xpm-js.svg)](https://github.com/xpack/xpm-js/blob/master/LICENSE)
[![Standard](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com/)
[![GitHub Workflow](https:/github.com/xpack/xpm-js/.github/workflows/nodejs.yml/badge.svg)](https://github.com/xpack/xpm-js/actions)
[![GitHub issues](https://img.shields.io/github/issues/xpack/xpm-js.svg)](https://github.com/xpack/xpm-js/issues)
[![GitHub pulls](https://img.shields.io/github/issues-pr/xpack/xpm-js.svg)](https://github.com/xpack/xpm-js/pulls)

## xpm-js - maintainer info

This page documents some of the operations required during module
development and maintenance.

For the user information, see the
[README](https://github.com/xpack/xpm-js/blob/master/README.md) file.

### Git repo

```console
$ git clone https://github.com/xpack/xpm-js.git xpm-js.git
$ cd xpm-js.git
$ npm install
$ npm link
$ ls -l ${HOME}/.nvm/versions/node/$(node --version)/lib/node_modules
```

A link to the development folder should be made available in the
`node_modules` folder, and also a link to the `xpm` executable should
be made available.

### Tests

The tests use the [`node-tap`](http://www.node-tap.org) framework
(_A Test-Anything-Protocol library for Node.js_, written by Isaac Schlueter).

As for any `npm` package, the standard way to run the project tests is
via `npm test`:

```console
$ cd xpm-js.git
$ npm install
$ npm run test
```

To run a specific test with more verbose output, use `npm run tap`:

```console
$ npm run tap test/tap/...
```

### Coverage tests

Coverage tests are a good indication on how much of the source files is
exercised by the tests. Ideally all source files should be covered 100%,
for all 4 criteria (statements, branches, functions, lines).

To run the coverage tests, use `npm run test-coverage`:

```console
$ npm run test-coverage
...
```

#### Coverage exceptions

Use `/* istanbul ignore next <something> */` before the code to be ignored
(https://github.com/gotwarlost/istanbul/blob/master/ignoring-code-for-coverage.md).

Fully excluded files:

- `lib/utils/cmd-shim.js`

### Continuous Integration (CI)

The continuous integration tests are performed via
[Travis CI](https://travis-ci.org/xpack/xpm-js) (for POSIX) and
[AppVeyor](https://ci.appveyor.com/project/ilg-ul/xpm-js) (for Windows).

The tests are currently performed with node 8, 10, 12.

### Standard compliance

The module uses ECMAScript 6 class definitions.

As style, it uses the [JavaScript Standard Style](https://standardjs.com/),
automatically checked at each commit via Travis CI.

Known and accepted exceptions:

- none.

To manually fix compliance with the style guide (where possible):

```console
$ npm run fix

> xpm@0.5.0 fix /Users/ilg/My Files/WKS Projects/xpack.github/npm-modules/xpm-js.git
> standard --fix

```

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

### How to publish

- `npm run fix`
- commit all changes
- `npm run test-coverage`
- check the latest commits `npm run git-log`
- update `CHANGELOG.md`; commit with a message like _CHANGELOG: prepare v0.1.2_
`npm version patch` (bug fixes), `npm version minor` (compatible API
  additions), `npm version major` (incompatible API changes)
- push all changes to GitHub; this should trigger CI
- wait for CI tests to complete
- `npm publish --tag next` (use `--access public` when publishing for the first time)

Optionally manage tags:

- `npm dist-tag ls xpm`
- `npm dist-tag add xpm@0.6.0 next`
- `npm dist-tag add xpm@0.5.0 latest`
- `npm dist-tag ls xpm`
