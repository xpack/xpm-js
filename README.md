[![npm (scoped)](https://img.shields.io/npm/v/xpm.svg)](https://www.npmjs.com/package/xpm/)
[![license](https://img.shields.io/github/license/xpack/xpm-js.svg)](https://github.com/xpack/xpm-js/blob/master/LICENSE)
[![Standard](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com/)

# xpm - the xPack project manager

This project implements `xpm` - the xPack project manager - as a Node.js CLI
application.

The main purpose of `xpm` is to help manage
projects during development.

More specificaly:

- to manage dependencies, like to install both source and binary packages,
and to easily update them when new versions are released
- to manage build configurations and to run actions
associated with various build steps.

The project is open-source and hosted on GitHub as
[xpack/xpm-js](https://github.com/xpack/xpm-js.git).

## Release info

For more details on the **xpm** releases, please check the
[releases](https://xpack.github.io/xpm/releases/) pages on the project web.

## Quicklinks

If you already know the general facts about `xpm`, you can directly skip to:

- [Project web site](https://xpack.github.io/xpm/)
- [GitHub](https://github.com/xpack/xpm-js.git)
- [How to install](https://xpack.github.io/xpm/install/)
- [How to get support](https://xpack.github.io/xpm/support/)
- [npmjs/xpm](https://www.npmjs.com/package/xpm/)
- [Published versions](https://www.npmjs.com/package/xpm?activeTab=versions)

## xPacks overview

**xPacks** are general purpose multi-version software packages,
much the same as the highly successful
[npm modules](https://docs.npmjs.com/getting-started/what-is-npm)
in the [Node.js](https://nodejs.org/en/) JavaScript ecosystem.

xPacks are usually Git repositories and can be published on
[npmjs.com](https://npmjs.com/) or any npm compatible server.

For more details, please read the [xPacks 101](https://xpack.github.io/intro/) page.

## Prequisites

The current version requires Node.js >= 10.x.

Since it is highly recommended to **not** use `sudo` during install,
and instead
use a version manager or to customize the **npm** install location,
please read the
[install](https://xpack.github.io/xpm/install/) page for more details.

## Install

The basic command is:

```sh
npm install --global xpm@latest
```

Note: In case `xpm` was already installed, in certain conditions
the update may not succeed and xpm may become unusable; if this happens,
uninstall xpm and retry the install:

```sh
npm uninstall --global xpm
npm install --global xpm@latest
```

For more details, please refer to the
[install](https://xpack.github.io/xpm/install/) page.

## User info

To get an initial glimpse on the program, ask for help:

```console
% xpm --help

The xPack project manager command line tool
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

npm xpm@0.12.10 '/Users/ilg/.nvm/versions/node/v14.16.0/lib/node_modules/xpm'
Home page: <https://xpack.github.io/xpm/>
Bug reports: <https://github.com/xpack/xpm-js/issues/>
```

## Template substitutions

To increase reusability, the actions strings allow substitutions, using the
[LiquidJS](https://liquidjs.com/) template engine syntax, with:

- variables, like `{{ configuration.name }}`
- filters, like `{{ configuration.name | downcase }}`
- tags, like `{% if os.platform != 'win32' %}xpm run execute --config synthetic-posix-cmake-debug{% endif %}`

The following predefined objects are available:

- `package`, with the entire `package.json` content
- `properties` with the xPack properties
- `os.platform` with the Node.js platform (possible values are 'aix',
  'darwin', 'freebsd', 'linux', 'openbsd', 'sunos', and 'win32')
- `os.arch` with the Node.js architecture (possible values are 'arm',
  'arm64', 'ia32', 'mips', 'mipsel', 'ppc', 'ppc64', 's390', 's390x',
  'x32', and 'x64')

If the xpm command was started with `--config`,
the following are also available:

- `configuration` with the current xPack build configuration;
  the configuration name is available as `configuration.name`
- `properties` with the configuration properties _preceding_ the xPack
  properties

For the full list of variables available for substitutions, please
read the separate [README](https://github.com/xpack/xpm-liquid-ts#readme).

## Multi-line actions

In order to acomodate more complex actions, it is possible to define
sequences of commands as arrays of strings, with each line executed as
a separate command.

If multiple commands are generated via loops, line terminators can be inserted
with `{{ os.EOL }}`), for example:

```liquid
{% for command in package.xpack.my_commands %}{{ command }}{{ os.EOL }}{% endfor %}
```

### The build folder path

The only required property is `buildFolderRelativePath`, which can be
defined either for each configuration, or for the entire project, using
a parametrised definition based on the configuration name, like:

```json
  "xpack": {
    "properties": {
      "buildFolderRelativePath": "{{ 'build' | path_join: configuration.name | to_filename | downcase }}"
    }
  }
```

## Compatibility notices

According to [semver](https://semver.org) requirements,
incompatible API changes require higher major numbers.

- none so far

## Maintainer info

This page documents how to use this module in an user application.
For developer and maintainer information, see the separate
[`README-DEVELOPER.md`](https://github.com/xpack/xpm-js/blob/master/README-DEVELOPER.md) and
[`README-MAINTAINER.md`](https://github.com/xpack/xpm-js/blob/master/README-MAINTAINER.md)
pages.

## License

The original content is released under the
[MIT License](https://opensource.org/licenses/MIT), with all rights
reserved to [Liviu Ionescu](https://github.com/ilg-ul/).

The design is heavily influenced by the `npm` application,
**Copyright (c) npm, Inc. and Contributors**, Licensed on the
terms of **The Artistic License 2.0**.

## Note

The **xpm** tool is currently work in progress and should be used with caution.
