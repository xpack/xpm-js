[![npm (scoped)](https://img.shields.io/npm/v/xpm.svg)](https://www.npmjs.com/package/xpm)
[![license](https://img.shields.io/github/license/xpack/xpm-js.svg)](https://github.com/xpack/xpm-js/blob/master/LICENSE)
[![Standard](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com/)
[![Travis](https://img.shields.io/travis/xpack/xpm-js.svg?label=linux)](https://travis-ci.org/xpack/xpm-js)
[![AppVeyor](https://ci.appveyor.com/api/projects/status/lj735puc38idko6m?svg=true)](https://ci.appveyor.com/project/ilg-ul/xpm-js)
[![GitHub issues](https://img.shields.io/github/issues/xpack/xpm-js.svg)](https://github.com/xpack/xpm-js/issues)
[![GitHub pulls](https://img.shields.io/github/issues-pr/xpack/xpm-js.svg)](https://github.com/xpack/xpm-js/pulls)

## Quicklinks

If you already know the general facts about `xpm`, you can directly skip to:

- [`xpack.github.io/xpm`](https://xpack.github.io/xpm/) - documentation
- [`xpack/xpm-js`](https://github.com/xpack/xpm-js.git) - the GitHub location of the open source project
- [how to install?](https://xpack.github.io/xpm/install/)
- [how to get support?](https://xpack.github.io/xpm/support/)
- [`xpm`](https://www.npmjs.com/package/xpm) - the npm package at the public repository
- [versions](https://www.npmjs.com/package/xpm?activeTab=versions) - published versions

## xPacks overview

`xpm` stands for **x**Pack **p**ackage **m**anager and is a Node.js CLI
application to manage xPacks.

**xPacks** are general purpose multi-version software packages,
much the same as the highly successful
[npm modules](https://docs.npmjs.com/getting-started/what-is-npm)
in the [Node.js](https://nodejs.org/en/) JavaScript ecosystem.

## Purpose

The main purpose of the `xpm` tool is to install xPacks, including all
dependent xPacks, and to easily update them when new versions are released.

For developers, `xpm` provides a very convenient way of publishing the
software packages, using the same central repository as `npm`.

## Install

The basic command is `npm install --global xpm`, but since it is recommended
to customize the `npm` install location, please read the
[Install](https://xpack.github.io/xpm/install/) page.

## User info

To get an initial glimpse on the program, ask for help:

```console
$ xpm --help

The xPack package manager command line tool
Usage: xpm <command> [<subcommand>...] [<options> ...] [<args>...]

where <command> is one of:
  build, init, install, run-script

Common options:
  --loglevel <level>     Set log level (silent|warn|info|verbose|debug|trace)
  -s|--silent            Disable all messages (--loglevel silent)
  -q|--quiet             Mostly quiet, warnings and errors (--loglevel warn)
  --informative          Informative (--loglevel info)
  -v|--verbose           Verbose (--loglevel verbose)
  -d|--debug             Debug messages (--loglevel debug)
  -dd|--trace            Trace messages (--loglevel trace, -d -d)
  -C <folder>            Set current folder

xpm -h|--help            Quick help
xpm <command> -h|--help  Quick help on command
xpm --version            Show version
xpm -i|--interactive     Enter interactive mode

npm xpm@0.2.10 '/Users/ilg/My Files/MacBookPro Projects/xPack/npm-modules/xpm-js.git'
Home page: <https://github.com/xpack/xpm-js>
Bug reports: <https://github.com/xpack/xpm-js/issues>
$
```

## Maintainer info

This page documents how to use this module in an user application.
For maintainer information, see the separate
[`README-MAINTAINER.md`](https://github.com/xpack/xpm-js/blob/master/README-MAINTAINER.md)
page.

## License

The original content is released under the
[MIT License](https://opensource.org/licenses/MIT), with all rights
reserved to [Liviu Ionescu](https://github.com/ilg-ul).

The design is heavily influenced by the `npm` application,
**Copyright (c) npm, Inc. and Contributors**, Licensed on the
terms of **The Artistic License 2.0**.

## Note

The `xpm` tool is currently experimental and should not be used in
production environments.
