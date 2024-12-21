---
title: xpm list
permalink: /xpm/cli/list/

comments: true

date: 2021-01-27 22:32:00 +0200

---

## Synopsis

```sh
xpm list [<options> ...]
```

Aliases:

- `ls`
- `ll`

## Description

This command lists the packages installed in the project located
in the current folder or installed in the global xPacks store.

Example:

```console
TBD
```

## Options

### Help (`--help`)

```console
$ xpm list --help

xPack manager - list packages
Usage: xpm list [options...] [--global] [--system] [--config <config_name>]

List options:
  -g|--global                List the global package(s) (optional)
  -sy|--system               List the system package(s) (not impl) (optional)
  -c|--config <config_name>  Show the configuration specific dependencies (optional)

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

### List global packages (`-g|--global`)

List the packages installed in the central xPacks store.

### List system packages (`-sy|--system`)

List the packages installed in the system store.

### Configuration (`-c|--config`)

List the dependencies installed in an existing configuration build folder
instead of the dependencies installed in top project folder.
