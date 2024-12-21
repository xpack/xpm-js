---
title:  xPack xpm v0.8.1 released
sidebar: xpm

summary: "Version **0.8.1** is a new release of **xpm**; it allows to install xPacks from Git repositories and adds new commands (list, uninstall); it also changes the default global xPacks store location on Linux."

version: 0.8.1

# --e-n-d-f--

redirect_from:
  - /blog/2021/01/27/xpm-v0-8-0-released/

date: 2021-01-30 21:49:00 +0200

redirect_to: https://xpack.github.io/xpm/blog/2021/01/30/xpm-v0-8-1-released/

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

**xpm** stands for **x**Pack **p**roject **m**anager and is a
[Node.js](https://nodejs.org/en/) CLI
application to manage
[xPacks](https://xpack.github.io/intro/#but-what-are-xpacks).

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

Except the removed command (`build`), the {{ page.version }} release
is generally compatible with previous 0.7.x releases.

### Bug fixes

- [#66] due to a partial implementation,
  installing packages that were not published in the npmjs.com repository,
  directly from Git, GitHub, GitLab, archive or local files, failed; fixed
- [#72] installing standalone packages was done by directly copying
  the content locally; for consistency reasons,the behaviour was changed,
  the content is now also
  installed in the global xPacks store and links are added locally, as
  for any package
- [#70] in certain conditions, if the project `package.json` had no
  name/version properties defined, the program crashed with asserts; a better
  error processing was implemented

### Enhancements

- [#78] installing dependencies proved quite slow; to make things
  faster, dependencies are downloaded in parallel
- [#13] the command `uninstall` was added; it can remove packages
  from the local project or from the central xPacks store (`-g`)
- [#76] the command `list` was added; it can list packages
  installed in the local project or in the central xPacks store (`-g`)
- [#73] with folders from the central xPacks store linked to the local
  project, it was possible to change the content in the central xPacks store,
  thus damaging the packages; to prevent this, now all installed
  packages are changed to read-only, and changed back to read-write
  only before uninstall
- [#60] the default location for installing global packages on Linux
  was changed from `$HOME/opt` to `$HOME/.local`, to better match the
  recommended Linux file system hierarchy
- [#71] the general program verbosity was a bit too high; reduced; for
  first time users it is recommended to add `-v` to increase verbosity
- [#68] in certain conditions, after displaying errors, the program
  continued to output several more lines, making spotting errors more
  difficult; fixed
- [#74] in certain conditions, when the internal links were
  no longer available, the `link` command reported an
  internal error (`ENOENT`), instead of a more user friendly message
  informing about the broken link; fixed

### Other changes

- [#75] the `build` command was removed, its functionality is already
  provided by the more general `run` command

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
  init, install, link, list, run-script, uninstall

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

npm xpm@0.8.1 '/Users/ilg/.nvm/versions/node/v12.14.0/lib/node_modules/xpm'
Home page: <https://xpack.github.io/xpm/>
Bug reports: <https://github.com/xpack/xpm-js/issues/>
```

Similar pages are available for each command.

For more details, the project documentation is available online from the
[web site](https://xpack.github.io/xpm/).

## Supported platforms

**npm** is a portable application that can run on
**Windows**, **macOS** and **GNU/Linux**.

## CI tests

Continuous integration tests are done via GitHub
[Actions](https://github.com/xpack/xpm-js/actions).

## Download analytics

- npmjs.com [xpm](https://www.npmjs.com/package/xpm)
  - last week [![npm](https://img.shields.io/npm/dw/xpm.svg)](https://www.npmjs.com/package/xpm/)
  - all time [![npm](https://img.shields.io/npm/dt/xpm.svg)](https://www.npmjs.com/package/xpm/)

Credit to [Shields IO](https://shields.io) for the badges.

{% include important.html content="The **xpm** tool is currently _work in progress_ and should be used with caution." %}
