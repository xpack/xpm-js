[![npm (scoped)](https://img.shields.io/npm/v/xpm.svg)](https://www.npmjs.com/package/xpm)
[![license](https://img.shields.io/github/license/xpack/xpm-js.svg)](https://github.com/xpack/xpm-js/blob/master/LICENSE)
[![Standard](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com/)
[![GitHub Workflow](https:/github.com/xpack/xpm-js/workflows/Node.js%20CI%20on%20Push/badge.svg)](https://github.com/xpack/xpm-js/actions)
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
GitHub Actions.

The tests are currently performed with node 10, 12.

To preserve compatibility with Node 10, use the older
version of the documentation:

- [Node.js 10 documentation](https://nodejs.org/docs/latest-v10.x/api/)

### Standard compliance

The module uses ECMAScript 6 class definitions.

As style, it uses the [JavaScript Standard Style](https://standardjs.com/),
automatically checked at each commit via Travis CI.

Known and accepted exceptions:

- none

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

## Dependencies

There were some problems with cacache & pacote.

- cacache@15.0.3: fails to download binaries.
- pacote@11.1.10: apparently works, but passing the stream to cacache fails.

The previous known to work versions:

```js
    "cacache": "^12.0.2",
    "pacote": "^9.4.1",
```

Note: the cacache version should match the one used inside pacote.

- https://github.com/npm/cacache/issues/27
- https://github.com/npm/pacote/issues/21

TODO: investigate and update.

## How to publish

### Update help text

In `README.md`, update the `xpm --help` test.

## Prepare a new blog post with the pre-release

In the `xpack/web-jekyll` GitHub repo:

- select the `develop` branch
- add a new file to `_posts/releases/xpm`
- name the file like `2021-01-28-xpm-v0-8-1-released.md`
- name the post like: **xPack xpm v0.8.1 pre-release**
- update the `date:` field with the current date
- add a paragraph with _To install the pre-release version, use:_
  and give the command with the next tag
- update the **Changes** sections

If any, refer to closed
[issues](https://github.com/xpack/xpm-js/issues)
as:

```
- [#1] ...
```

- commit with a message like **xPack xpm v0.8.1 pre-release**
- push
- wait for CI job to complete

Check if the page shows at:

- https://xpack.github.io/web-preview/news/

### Publish to npmjs.com

- `npm run fix`
- commit all changes
- `npm run test-coverage`
- check the latest commits `npm run git-log`
- update `CHANGELOG.md`; commit with a message like _CHANGELOG: prepare v0.8.1_
- `npm version patch` (bug fixes), `npm version minor` (compatible API
  additions), `npm version major` (incompatible API changes)
- `npm pack` and check the content
- push all changes to GitHub; this should trigger CI
- **wait for CI tests to complete**
- `npm publish --tag next` (use `--access public` when publishing for the first time)

Check if the version is present at
[xpm Versions](https://www.npmjs.com/package/xpm?activeTab=versions).

Test it with:

```bash
npm install -global xpm@next
```

## Update the web repo

In the `xpack/web-jekyll` GitHub repo:

- select the `master` branch
- merge `develop`
- push
- wait for CI job to complete

Check if the page shows at:

- https://xpack.github.io/news/

### Change tag to latest

When stable:

- `npm dist-tag ls xpm`
- `npm dist-tag add xpm@0.8.0 latest`
- `npm dist-tag ls xpm`

### Update repo

Merge `develop` into `merge`.

### Update the blob post to release

In the `xpack/web-jekyll` GitHub repo:

- select the `develop` branch
- update the post title from **pre-release** to **release**
- remove the `@next` instructions
- commit with a message like **xPack xpm v0.8.1 release**
- push both branches
