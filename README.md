[![npm (scoped)](https://img.shields.io/npm/v/xpm.svg)](https://www.npmjs.com/package/xpm) 
[![license](https://img.shields.io/github/license/xpack/xpm-js.svg)](https://github.com/xpack/xpm-js/blob/master/LICENSE)
[![Standard](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com/)
[![Travis](https://img.shields.io/travis/xpack/xpm-js.svg?label=linux)](https://travis-ci.org/xpack/xpm-js)
[![AppVeyor](https://ci.appveyor.com/api/projects/status/lj735puc38idko6m?svg=true)](https://ci.appveyor.com/project/ilg-ul/xpm-js)

## The **x**Pack **p**ackage **m**anager command line tool

`xpm` is a Node.js CLI application to manage xPacks.

`xpm` is an open source project, hosted as
[xpack/xpm-js](https://github.com/xpack/xpm-js.git) on GitHub.

## xPacks overview

**xPacks** are general purpose software **C/C++ packages**, intended to
enhance code **sharing** and **reusin**g during the development of
C/C++ libraries and applications, much the same as **npm modules**
do so nicely in the JavaScript ecosystem.

## Purpose

The main purpose of the `xpm` tool is to install xPacks, including all 
dependent xPacks, and to easily update them when new versions are released.

For developers, `xpm` provides a very convenient way of publishing the 
software packages, using the same central repository as `npm`.

## Prerequisites

If this is your first encounter with `npm`, you need to install the 
[Node.js](https://nodejs.org/) JavaScript run-time. The process is 
is straightforward and does not pollute the system locations significantly; 
there are two `node` versions, **LTS** (**Long Term Service**) and 
**Current**; generally it is safer to use LTS, especially on Windows.

Download the package suitable for your platform and install it as usual.
The result is a binary program called `node` (that can be used to execute 
JavaScript code from the terminal), and a link called `npm`, pointing to 
the `npm-cli.js` script, which is part of the node module that implements 
the npm functionality. 

Although not mandatory for `xpm`, on Windows, it is recommended to 
also install the [Git for Windows](https://git-scm.com/download/win) package.

The official page explaining how to install `npm` in a custom
folder is [How to Prevent Permissions Errors](https://docs.npmjs.com/getting-started/fixing-npm-permissions#option-two-change-npms-default-directory)

For advanced users, see the page [Using a Version Manager to install Node.js and npm](https://docs.npmjs.com/getting-started/installing-node#using-a-version-manager-to-install-nodejs-and-npm).

## Easy install

The command line tool is implemented as a portable node module, available as 
[`xpm`](https://www.npmjs.com/package/xpm) from the public repository.

### Windows

On **Windows**, by default, global node packages are installed in the 
user home folder, in `%APPDATA%\npm` 
(like `C:\Users\ilg\AppData\Roaming\npm`), and managing packages 
does not require administrative rights.

```console
C:\>npm install --global xpm
```

The result is a pair of files in the `%APPDATA%\npm` folder:

```console
C:\>dir "%APPDATA%"\npm\xpm*
 Volume in drive C has no label.
 Volume Serial Number is 28CE-1C06

 Directory of C:\Users\Liviu Ionescu\AppData\Roaming\npm

18/04/2018  10:40               319 xpm
18/04/2018  10:40               196 xpm.cmd
               2 File(s)            515 bytes
               0 Dir(s)  51,207,155,712 bytes free
```

However, attempts to start the program fail:

```console
C:\>xpm --version
'xpm' is not recognized as an internal or external command,
operable program or batch file.
```

The reason is that this path is not in the default environment, 
and must be added manually.

```console
C:\>setx Path "%Path%;%APPDATA%\npm"
```

After this, the program starts normally:

```console
C:\>xpm --version
0.4.3
```

To remove `xpm`, the command is similar:

```console
C:\>npm uninstall --global xpm
```

### macOS 

On **macOS**, by default, global node packages are installed in 
`/usr/local`, and managing them requires administrative rights.

```console
$ sudo npm install --global xpm
```

The result is a link in `/usr/local/bin`:

```console
$ ls -l /usr/local/bin/xpm
lrwxr-xr-x  1 root  wheel  34 Nov 13 03:02 /usr/local/bin/xpm -> ../lib/node_modules/xpm/bin/xpm.js
```

However, the recommended install location is `${HOME}/Library/npm`.

For those who already performed the install in `/usr/local`, the 
command to remove it is:

```console
$ sudo npm uninstall --global xpm
```

The commands to set this custom location are:

```console
$ mkdir -p "${HOME}"/Library/npm
$ npm config set prefix "${HOME}"/Library/npm
$ echo 'export PATH="${HOME}"/Library/npm/bin:${PATH}' >> "${HOME}"/.profile
$ source "${HOME}"/.profile
```

With the environment properly set, the command to install `xpm` is:

```console
$ npm install --global xpm
```

To test if `xpm` starts:

```console
$ xpm --version
0.4.3
```

To remove `xpm`, the command is similar:

```console
$ npm uninstall --global xpm
```

### GNU/Linux

On **GNU/Linux**, by default, global node packages are installed in 
`/usr/local`, and managing them requires administrative rights.

```console
$ sudo npm install --global xpm
```

The result is a link in `/usr/local/bin`:

```console
$ ls -l /usr/local/bin/xpm
lrwxr-xr-x  1 root  wheel  34 Nov 13 03:02 /usr/local/bin/xpm -> ../lib/node_modules/xpm/bin/xpm.js
```

However, the recommended install location is `${HOME}/opt/npm`.

For those who already performed the install in `/usr/local`, the 
command to remove it is:

```console
$ sudo npm uninstall --global xpm
```

The commands to set this custom location are:

```console
$ mkdir -p "${HOME}"/opt/npm
$ npm config set prefix "${HOME}"/opt/npm
$ echo 'export PATH="${HOME}"/opt/npm/bin:${PATH}' >> "${HOME}"/.profile
$ source "${HOME}"/.profile
```

(Thse commands were tested with `bash`, for other shells may need small
adjustments).

With the environment properly set, the command to install `xpm` is:

```console
$ npm install --global xpm
```

To test if `xpm` starts:

```console
$ xpm --version
0.4.3
```

To remove `xpm`, the command is similar:

```console
$ npm uninstall --global xpm
```

## `npx`

If, for any reason, you decide not to install `xpm`, you can still 
benefit from it by using `npx`, as a trampoline to start `xpm`:

```console
$ npx xpm --version
0.4.3
```

However, for regular usage, this method is not efficient, since 
`npx` will need some time to prepare the node module
for each run, and this takes some time.

## `npm` folders

For more details on the folders used by `npm`, see 
[npm-folders](https://docs.npmjs.com/files/folders).

## `xpm` folders

To avoid security issues and the need to increase the user privilege level,
`xpm` does not use any system folders, and all activity happens
in the user home location.

There are two main folders:
- a cache folder, where all downloaded files are stored
- a central repository folder, where the xPacks are expanded

For more details see [xpm folders](https://xpack.github.io/xpm/files/folders/).

### macOS specifics

On macOS, the central xPack repository is located in `~/Library/xPacks`. 
By default, `~/Library` is hidden and does not show in folder selections.

To make it visible, use:

```console
$ /usr/bin/chflags nohidden ~/Library
$ xattr -d com.apple.FinderInfo ~/Library
```

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

## Developer info

### Git repo

```console
$ git clone https://github.com/xpack/xpm-js.git xpm-js.git
$ cd xpm-js.git
$ npm install
```

A link to the development folder should be made available in the system 
`node_modules` folder, and also a link to the `xpm` executable should 
be made available system wide.

```console
$ sudo npm link 
up to date in 4.992s
/usr/local/bin/xpm -> /usr/local/lib/node_modules/xpm/bin/xpm.js
/usr/local/lib/node_modules/xpm -> /Users/ilg/My Files/MacBookPro Projects/xPack/npm-modules/xpm-js.git
```

On Windows, or on machines where the install folder is in the user home,
the command does not require `sudo`, for example on macOS:

```console
$ npm link
up to date in 4.985s
/Users/ilg/Library/npm/bin/xpm -> /Users/ilg/Library/npm/lib/node_modules/xpm/bin/xpm.js
/Users/ilg/Library/npm/lib/node_modules/xpm -> /Users/ilg/My Files/MacBookPro Projects/xPack/npm-modules/xpm-js.git
```

### Tests

The tests use the [`node-tap`](http://www.node-tap.org) framework 
(_A Test-Anything-Protocol library for Node.js_, written by Isaac Schlueter).

As for any `npm` package, the standard way to run the project tests is 
via `npm test`:

```console
$ cd xpm-js.git
$ npm install
$ npm run test
```

To run a specific test with more verbose output, use `npm run tap`:

```console
$ npm run tap test/tap/...
```

### Coverage tests

Coverage tests are a good indication on how much of the source files is 
exercised by the tests. Ideally all source files should be covered 100%, 
for all 4 criteria (statements, branches, functions, lines).

To run the coverage tests, use `npm run test-coverage`:

```console
$ npm run test-coverage
...
```

### Continuous Integration (CI)

The continuous integration tests are performed via 
[Travis CI](https://travis-ci.org/xpack/xpm-js) (for POSIX) and 
[AppVeyor](https://ci.appveyor.com/project/ilg-ul/xpm-js) (for Windows).

### Standard compliance

The module uses ECMAScript 6 class definitions.

As style, it uses the [JavaScript Standard Style](https://standardjs.com/), 
automatically checked at each commit via Travis CI.

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

To enforce checking at file level, add the following comments right after 
the `use strict`:

```js
'use strict'
/* eslint valid-jsdoc: "error" */
/* eslint max-len: [ "error", 80, { "ignoreUrls": true } ] */
```

Note: be sure C style comments are used, C++ styles are not parsed by 
[ESLint](http://eslint.org).

## Maintainer info

### How to publish

To check the last commits:

```console
$ git log --pretty='%cd * %h %s' --date=short
```

* commit all changes
* `npm run test` (`fix` included)
* update `CHANGELOG.md`; commit with a message like _CHANGELOG: prepare v0.1.2_
* `npm version patch`
* push all changes to GitHub; this should trigger CI
* wait for CI tests to complete
* `npm publish`

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
