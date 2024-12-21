---
title: xpm uninstall
permalink: /xpm/cli/uninstall/

comments: true

date: 2021-01-27 22:22:00 +0200

---

## Synopsis

```sh
xpm uninstall [<options> ...] [@scope/]name[@version]...
```

Aliases:

- `un`
- `uni`
- `unin`
- `unintsall`
- `unlink`
- `rm`
- `r`

## Description

This command uninstalls/removes one or more packages from the project
available in the current folder or from the global xPacks store.

Example:

```console
TBD
```

## Options

### Help (`--help`)

```sh
xpm uninstall --help

xPack manager - uninstall package(s)
Usage: xpm uninstall [options...] [--global] [--system]
                     [--config <config_name>] [--dry-run] [--no-save]
                     [[@<scope>/]<name>[@<version]...

Uninstall options:
  -g|--global                Uninstall the global package(s) (optional)
  -sy|--system               Uninstall the system package(s) (not impl) (optional)
  -c|--config <config_name>  Show the configuration specific dependencies (optional)
  -n|--dry-run               Pretend to uninstall the package (optional)
  --no-save                  Prevent saving to dependencies (optional)

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

### Global uninstall (`-g|--global`)

Remove package(s) from the global xPacks store.

### System install (`-sy|--system`)

Remove package(s) from the system xPacks store.

### Configuration (`-c|--config`)

Uninstall package(s) from an existing configuration build folder
instead of the top project folder.

### Dry-run (`-n|--dry-run`)

Do everything except to actually uninstall the package(s).

### Prevent saving to dependencies (`--no-save`)

Prevent removing the dependencies and updating the `package.json` file.
