---
title: xpm - common options
permalink: /xpm/cli/

comments: true

date: 2017-10-09 12:50:00 +0300

---

## Synopsis

```sh
xpm <command> [<subcommand>...] [<options> ...] [<args>...]
```

## Description

`xpm` is the xPacks project manager. It manages dependencies
and puts xPacks in known places so that builds can find them.

{% include note.html content="`xpm` is an extension of
[npm](https://docs.npmjs.com/cli/npm.html) and
uses the same public registry at https://registry.npmjs.org." %}

The program accepts a command name, possibly one or more subcommand
names, options (that start with a dash) and possibly one or more
arguments, like names, files, etc.

The list of accepted options and arguments is specific to a given
command, or set of command and subcommands.

## Common options

### Help (`-h|--help`)

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

This works both at top level and with commands/subcommands.

### Log level (`--loglevel`)

The default behaviour of the program is to display only a minimum
amount of messages.

This can be changed, from not displaying any messages at all (`--silent`)
to displaying lots of debugging trace messages (`--trace`).

```console
  --loglevel <level>     Set log level (silent|warn|info|verbose|debug|trace)
  -s|--silent            Disable all messages (--loglevel silent)
  -q|--quiet             Mostly quiet, warnings and errors (--loglevel warn)
  --informative          Informative (--loglevel info)
  -v|--verbose           Verbose (--loglevel verbose)
  -d|--debug             Debug messages (--loglevel debug)
  -dd|--trace            Trace messages (--loglevel trace, -d -d)
```

### Current folder (`-C`)

By default the program is executed in the context of the current shell
folder, but it can be changed to any folder using `-C <folder>`.

### Program version (`--version`)

As for most command line tools, it is possible to ask for the current
version, with `--version`:

```console
$ xpm --version
0.9.0
```

The result is written to the standard output stream, and consists of the
semver string, without any `v` prefix, so it can be directly used in
automated scripts, without any post processing.

### Skip checks (`--no-update-notifier`)

By default, before exiting, `xpm` checks, once a day, if there is a
new version of the program available.

For environments where this check is not necessary, it can be disabled.

### Interactive mode (`-i|--interactive`)

The common use case is to start the program for each single command.

It is also possible to start the program with a prompt, and issue as many
commands as needed.

```console
$ xpm -i
xpm> version
0.9.0
xpm>
...
```

## Commands

- [`xpm init`]({{ site.baseurl }}/xpm/cli/init/)
- [`xpm install`]({{ site.baseurl }}/xpm/cli/install/)
- [`xpm link`]({{ site.baseurl }}/xpm/cli/link/)
- [`xpm list`]({{ site.baseurl }}/xpm/cli/list/)
- [`xpm run`]({{ site.baseurl }}/xpm/cli/run/)
- [`xpm uninstall`]({{ site.baseurl }}/xpm/cli/uninstall/)
