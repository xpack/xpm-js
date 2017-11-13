[![npm (scoped)](https://img.shields.io/npm/v/xpm.svg)](https://www.npmjs.com/package/xpm) 
[![license](https://img.shields.io/github/license/xpack/xpm-js.svg)](https://github.com/xpack/xpm-js/blob/master/LICENSE)
[![Standard](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com/)
[![Travis](https://img.shields.io/travis/xpack/xpm-js.svg?label=linux)](https://travis-ci.org/xpack/xpm-js)
[![AppVeyor](https://ci.appveyor.com/api/projects/status/lj735puc38idko6m?svg=true)](https://ci.appveyor.com/project/ilg-ul/xpm-js)

## The **x**Pack **p**ackage **m**anager command line tool.

A Node.js CLI application to manage xPacks.

## xPacks overview

**xPacks** are general purpose software C/C++ packages, intended to enhance code sharing and reusing during the development of C/C++ libraries and applications, much the same as **npm modules** do so nicely in the JavaScript ecosystem.

## Purpose

The main purpose of the `xpm` tool is to install xPacks, including all dependent xPacks, and to easily update them when new versions are released.

For developers, `xpm` provides a very convenient way of publishing the software packages, using the same central repository as `npm`.

## Prerequisites

If this is your first encounter with `npm`, you need to install the [node.js](https://nodejs.org/) JavScript run-time. The process is straighforward and does not polute the system locations significantly; just pick the current version, download the package suitable for your platform and install it as usual. The result is a binary program called `node` that can be used to execute JavaScript code from the terminal, and a link called `npm`, pointing to the `npm-cli.js` script, which is part of the node module that implements the npm functionality. On Windows, it is recommended to first install the [Git for Windows](https://git-scm.com/download/win) package.

## Easy install

The module is available as [**xpm**](https://www.npmjs.com/package/xpm) from the public repository; with `npm` already available, installing `xpm` is quite easy:

```console
$ sudo npm install xpm --global
```

On Windows, global packages are installed in the user home folder, and do not require `sudo`.

The module provides the `xpm` executable, which is a possible reason to install it globally.

The development repository is available from the GitHub [xpack/xpm-js](https://github.com/xpack/xpm-js) project.

To remove `xpm`, the command is similar:

```console
$ sudo npm uninstall xpm --global
```

(On Windows `sudo` is not required`).

## User info

To get an initial glimpse on the program, ask for help:

```console
$ xpm --help

The xPack package manager command line tool
Usage: xpm <command> [<subcommand>...] [<options> ...] [<args>...]

where <command> is one of:
  install

Common options:
  --loglevel <level>     Set log level (silent|warn|info|verbose|debug|trace) 
  -s|--silent            Disable all messages (--loglevel silent) 
  -q|--quiet             Mostly quiet (--loglevel warn) 
  -v|--verbose           Informative verbose (--loglevel info) 
  -vv                    Very verbose (--loglevel verbose, or -v -v) 
  -d|--debug             Debug messages (--loglevel debug) 
  -dd|--trace            Trace messages (--loglevel trace) 
  -C <folder>            Set current folder 

xpm -h|--help            Quick help
xpm <command> -h|--help  Quick help on command

xpm --version            Show version 
xpm -i|--interactive     Enter interactive mode 

npm xpm@0.1.0 '/Users/ilg/My Files/MacBookPro Projects/xPack/npm-modules/xpm-js.git'
Home page: <https://github.com/xpack/xpm-js>
Bug reports: <https://github.com/xpack/xpm-js/issues>
```

TBD

## Developer info

### Git repo

```console
$ git clone https://github.com/xpack/xpm-js.git xpm-js.git
$ cd xpm-js.git
$ npm install
$ sudo npm link 
$ ls -l /usr/local/lib/node_modules/
```

A link to the development folder should be present in the system `node_modules` folder, and also a link to the `xpm` executable should be available system wide.

### Tests

The tests use the [`node-tap`](http://www.node-tap.org) framework (_A Test-Anything-Protocol library for Node.js_, written by Isaac Schlueter).

As for any `npm` package, the standard way to run the project tests is via `npm test`:

```console
$ cd xpm-js.git
$ npm install
$ npm test
```

A typical test result looks like:

```console
$ npm run test
...
```

To run a specific test with more verbose output, use `npm run tap`:

```console
$ npm run tap test/tap/...
```

### Coverage tests

Coverage tests are a good indication on how much of the source files is exercised by the tests. Ideally all source files should be covered 100%, for all 4 criteria (statements, branches, functions, lines).

To run the coverage tests, use `npm run test-coverage`:

```console
$ npm run test-coverage
...
```

### Continuous Integration (CI)

The continuous integration tests are performed via [Travis CI](https://travis-ci.org/xpack/xpm-js) (for POSIX) and [AppVeyor](https://ci.appveyor.com/project/ilg-ul/xpm-js) (for Windows).

### Standard compliance

The module uses ECMAScript 6 class definitions.

As style, it uses the [JavaScript Standard Style](https://standardjs.com/), automatically checked at each commit via Travis CI.

Known and accepted exceptions:

- none.

To manually fix compliance with the style guide (where possible):

```console
$ npm run fix

> xpm@0.1.10 fix /Users/ilg/My Files/MacBookPro Projects/xPack/npm-modules/xpm-js.git
> standard --fix

```

### Documentation metadata

The documentation metadata follows the [JSdoc](http://usejsdoc.org) tags.

To enforce checking at file level, add the following comments right after the `use strict`:

```js
'use strict'
/* eslint valid-jsdoc: "error" */
/* eslint max-len: [ "error", 80, { "ignoreUrls": true } ] */
```

Note: be sure C style comments are used, C++ styles are not parsed by [ESLint](http://eslint.org).

### How to publish

* commit all changes
* `npm run test` (`fix` included)
* update `CHANGELOG.md`; commit with a message like _CHANGELOG: prepare v0.1.2_
* `npm version patch`
* push all changes to GitHub; this should trigger CI
* wait for CI tests to complete
* `npm publish`

## License

The original content is released under the [MIT License](https://opensource.org/licenses/MIT), with all rights reserved to [Liviu Ionescu](https://github.com/ilg-ul).

The design is heavily influenced by the `npm` application, **Copyright (c) npm, Inc. and Contributors**, Licensed on the terms of **The Artistic License 2.0**.

## Note

The `xpm` tool will be available soon.

