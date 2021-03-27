[![npm (scoped)](https://img.shields.io/npm/v/xpm.svg)](https://www.npmjs.com/package/xpm)
[![license](https://img.shields.io/github/license/xpack/xpm-js.svg)](https://github.com/xpack/xpm-js/blob/master/LICENSE)
[![Standard](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com/)
[![GitHub Workflow](https://github.com/xpack/xpm-js/workflows/Node.js%20CI%20on%20Push/badge.svg)](https://github.com/xpack/xpm-js/actions)

## Release info

For more details on the **xpm** releases, please check the
[releases](https://xpack.github.io/xpm/releases/) pages on the project web.

## Quicklinks

If you already know the general facts about `xpm`, you can directly skip to:

- [Documentation](https://xpack.github.io/xpm/)
- [GitHub](https://github.com/xpack/xpm-js.git)
- [How to install](https://xpack.github.io/xpm/install/)
- [How to get support](https://xpack.github.io/xpm/support/)
- [npmjs/xpm](https://www.npmjs.com/package/xpm/)
- [Pubished versions](https://www.npmjs.com/package/xpm?activeTab=versions)

## xPacks overview

`xpm` is a Node.js CLI
application to manage xPacks dependencies.

**xPacks** are general purpose multi-version software packages,
much the same as the highly successful
[npm modules](https://docs.npmjs.com/getting-started/what-is-npm)
in the [Node.js](https://nodejs.org/en/) JavaScript ecosystem.

xPacks are generally Git repositories and can be published on
[npmjs.com](https://npmjs.com/) or any npm compatible server.

## Purpose

The main purpose of the `xpm` command line tool is to install
both source and binary xPacks,
and to easily update them when new versions are released.

## Prequisites

The current version requires Node.js >= 10.x.

Since it is recommended
to use a version manager or to customize the **npm** install location,
please read the
[Install](https://xpack.github.io/xpm/install/) page for more details.

## Install

The basic command is:

```sh
npm install --global xpm@latest
```

Note: In the current configuration, **npm** complains about several deprecated
packages; these packages are used by some third party packages, and until
those packages will update their dependencies, there is not much we can
do to prevent these warnings.

For more details, please refer to the
[Install](https://xpack.github.io/xpm/install/) page.

## User info

To get an initial glimpse on the program, ask for help:

```console
$ xpm --help

The xPack package manager command line tool
Usage: xpm <command> [<subcommand>...] [<options> ...] [<args>...]

where <command> is one of:
  init, install, link, list, run, uninstall

Common options:
  --loglevel <level>     Set log level (silent|warn|info|verbose|debug|trace) 
  -s|--silent            Disable all messages (--loglevel silent) 
  -q|--quiet             Mostly quiet, warnings and errors (--loglevel warn) 
  --informative          Informative (--loglevel info) 
  -v|--verbose           Verbose (--loglevel verbose) 
  -d|--debug             Debug messages (--loglevel debug) 
  -dd|--trace            Trace messages (--loglevel trace, -d -d) 
  --no-update-notifier   Skip check for a more recent version 
  -C <folder>            Set current folder 

xpm -h|--help            Quick help 
xpm <command> -h|--help  Quick help on command 
xpm --version            Show version 
xpm -i|--interactive     Enter interactive mode 

npm xpm@0.9.0 '/Users/ilg/.nvm/versions/node/v14.16.0/lib/node_modules/xpm'
Home page: <https://xpack.github.io/xpm/>
Bug reports: <https://github.com/xpack/xpm-js/issues/>
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

The **xpm** tool is currently work in progress and should be used with caution.
