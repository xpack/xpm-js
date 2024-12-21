---
title: xpm link
permalink: /xpm/cli/link/

comments: true

date: 2021-03-27 16:16:00 +0200

---

## Synopsis

Invoked with no package arguments in a writeable dependency folder:

```sh
xpm link [<options> ...]
```

Invoked with arguments referring to writeable dependencies:

```sh
xpm link [<options> ...] [<packs>...]
```

Aliases:

- `lnk`

## Description

By default, dependencies are installed in read-only folders, to avoid
inadvertently damaging their contents.

This command provides a unified solution for continuing
development of source xPacks while being used as dependencies in
an application.

It does this by replacing the links to the read-only folders in the
global xPacks store by links to writeable folders.

This is done in two steps:

- create a special link (called `.link`) from the global xPacks store
to the writeable folder; this is done by invoking `xpm link` in the
writeable folder
- replace the link in the application with a link to the above `.link`;
this is done by invoking `xpm link <package>` in the application folder.

Example:

```console
TBD
```

## Options

### Help (`--help`)

```console
$ xpm link --help

xPack manager - create links to packages under development
Usage: xpm link [options...] [--config <config_name>] [[@<scope>/]<name>]

Link options:
  -c|--config <config_name>  Link to the configuration build folder (optional)

Common options:
  --loglevel <level>         Set log level (silent|warn|info|verbose|debug|trace)
  -s|--silent                Disable all messages (--loglevel silent)
  -q|--quiet                 Mostly quiet, warnings and errors (--loglevel warn)
  --informative              Informative (--loglevel info)
  -v|--verbose               Verbose (--loglevel verbose)
  -d|--debug                 Debug messages (--loglevel debug)
  -dd|--trace                Trace messages (--loglevel trace, -d -d)
  --no-update-notifier       Skip check for a more recent version
  -C <folder>                Set current folder

xpm -h|--help                Quick help
xpm --version                Show version
xpm -i|--interactive         Enter interactive mode

npm xpm@0.9.0 '/Users/ilg/.nvm/versions/node/v14.16.0/lib/node_modules/xpm'
Home page: <https://xpack.github.io/xpm/>
Bug reports: <https://github.com/xpack/xpm-js/issues/>
```

### Configuration (`-c|--config`)

Link the development package into an existing configuration build folder
instead of the top project folder.
