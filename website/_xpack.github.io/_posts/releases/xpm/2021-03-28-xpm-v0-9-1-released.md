---
title:  xPack xpm v0.9.1 released
sidebar: xpm

summary: "Version **0.9.1** is a new release of **xpm**; it adds support for configurations and configuration specific dependencies."

version: 0.9.1

date: 2021-03-28 23:15:00 +0300

# --e-n-d-f--

redirect_to: https://xpack.github.io/xpm/blog/2021/03/28/xpm-v0-9-1-released/

comments: true

categories:
  - releases
  - xpm

tags:
  - releases
  - xpm
  - package
  - manager

---

**xpm** is a
[Node.js](https://nodejs.org/en/) CLI
application to manage
[xPacks](https://xpack.github.io/intro/#but-what-are-xpacks) dependencies.

## Install

**xpm** is a Node.js module that can be installed with `npm`.

For the prerequisites, since it is recommended
to use a version manager or to customize the **npm** install location,
please read the
[Install](https://xpack.github.io/xpm/install/) page for more details.

To install the **latest stable** version available, use:

```sh
npm uninstall --global xpm
npm install --global xpm@latest
```

To install this specific version, use:

```sh
xpm install --global xpm@{{ page.version }}
```

{% include note.html content="In the current configuration,
**npm** complains about several deprecated packages;
until these third party packages will be updated,
in v0.10.2 an workaround was added, by bundling the
dependencies." %}

## Changes

The {{ page.version }} release
is generally compatible with previous releases.

The main change over the previous release is support for multiple
_configurations_, usually _build configurations_,
which are intended to support development for applications using multiple
build folders (like debug/release, but also multi-platform builds).

### Bug fixes

- [#98] when installing tools in the build configuration, the execution
  path was hardcoded to the `build/<configuration-name>` folder; fixed, now
  the execution path reflects the user setting;

### Enhancements

- [#97] the preferred property used to define configurations is now
  `buildConfigurations`, instead of `configurations`;

### Other changes

- none

### Known problems

- the warnings triggered by third party dependencies during install; fixed in v0.10.2
- [#57] when multiple versions of the same package are referenced
  via different dependencies paths, the program fails; version
  mitigation will be implemented in a future release.

## Documentation

The program interprets `--help` and displays a top help page:

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

npm xpm@0.9.1 '/Users/ilg/.nvm/versions/node/v14.16.0/lib/node_modules/xpm'
Home page: <https://xpack.github.io/xpm/>
Bug reports: <https://github.com/xpack/xpm-js/issues/>
```

Similar pages are available for each command.

For more details, the project documentation is available online from the
[web site](https://xpack.github.io/xpm/).

## Supported platforms

**npm** is a portable application that can run on
**Windows**, **macOS** and **GNU/Linux** (Intel and Arm).

## CI tests

Continuous integration tests are done via GitHub
[Actions](https://github.com/xpack/xpm-js/actions).

## Download analytics

- npmjs.com [xpm](https://www.npmjs.com/package/xpm)
  - last week [![npm](https://img.shields.io/npm/dw/xpm.svg)](https://www.npmjs.com/package/xpm/)
  - all time [![npm](https://img.shields.io/npm/dt/xpm.svg)](https://www.npmjs.com/package/xpm/)

Credit to [Shields IO](https://shields.io) for the badges.

{% include important.html content="The **xpm** tool is currently _work in progress_ and should be used with caution." %}
