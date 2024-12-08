---
title: xpm install
permalink: /xpm/cli/install/

comments: true

date: 2017-10-09 12:56:00 +0300

---

## Synopsis

Invoked with arguments referring to packages:

```sh
xpm install [<options> ...] [<packs>...]
```

Invoked with no package arguments, and running in a package folder:

```sh
xpm install [<options> ...]
```

Aliases:

- `i`
- `intstall`

## Description

This command installs a package, and all packages that it depends on.

As for npm, a package is any of the following:

1. A folder containing a `package.json` file.
2. A gzipped tarball containing (1).
3. A URL that resolves to (2).
4. A `<name>@<version>` that is published on the registry with (3).
5. A `<name>@<tag>` that points to (4).
6. A `<name>` that has a `latest` tag satisfying (5).
7. A `git` url that, when cloned, results in (1).

Even if you never publish your package, you can still get a lot of
benefits of using xpm to conveniently install dependencies,
and perhaps
to automate path management for dependent tools.

### Install dependencies

When invoked without arguments in a package folder, `xpm install` installs
the dependencies listed in the `dependencies` and `devDependencies`
field in `package.json`.

If the dependencies are xPacks, they are installed in the local `xpacks`
folder. For binary xPacks, soft links to the executables are created
in the `xpacks/.bin` folder (on Windows `.cmd` stubs are created).

To maintain compatibility with npm, dependencies
must not necessarily be xPacks, they can also be npm modules,
and are installed as usual in `node_modules`.

Example:

```console
$ cd /tmp/hifive1-blinky-cpp
$ xpm install --verbose
xPack manager - install package(s)

Installing dependencies for 'hifive1-blinky-cpp'...
Folder 'micro-os-plus-diag-trace' linked to '@micro-os-plus/diag-trace/1.0.6'.
Folder 'sifive-hifive1-board' linked to '@sifive/hifive1-board/1.0.3'.
Folder 'sifive-devices' linked to '@sifive/devices/1.0.2'.
Folder 'micro-os-plus-riscv-arch' linked to '@micro-os-plus/riscv-arch/1.0.2'.
Folder 'micro-os-plus-startup' linked to '@micro-os-plus/startup/1.0.7'.
Folder 'micro-os-plus-c-libs' linked to '@micro-os-plus/c-libs/1.0.6'.
Folder 'micro-os-plus-cpp-libs' linked to '@micro-os-plus/cpp-libs/1.0.4'.
Folder 'xmake' linked to 'xmake/0.3.8'.
File 'xmake' linked to 'xmake/bin/xmake.js'
Folder 'gnu-mcu-eclipse-riscv-none-gcc' linked to '@gnu-mcu-eclipse/riscv-none-gcc/7.2.0-2.1'.
File 'riscv-none-embed-addr2line' linked to 'gnu-mcu-eclipse-riscv-none-gcc/.content/bin/riscv-none-embed-addr2line'
File 'riscv-none-embed-ar' linked to 'gnu-mcu-eclipse-riscv-none-gcc/.content/bin/riscv-none-embed-ar'
File 'riscv-none-embed-as' linked to 'gnu-mcu-eclipse-riscv-none-gcc/.content/bin/riscv-none-embed-as'
File 'riscv-none-embed-c++' linked to 'gnu-mcu-eclipse-riscv-none-gcc/.content/bin/riscv-none-embed-c++'
File 'riscv-none-embed-c++filt' linked to 'gnu-mcu-eclipse-riscv-none-gcc/.content/bin/riscv-none-embed-c++filt'
File 'riscv-none-embed-cpp' linked to 'gnu-mcu-eclipse-riscv-none-gcc/.content/bin/riscv-none-embed-cpp'
File 'riscv-none-embed-elfedit' linked to 'gnu-mcu-eclipse-riscv-none-gcc/.content/bin/riscv-none-embed-elfedit'
File 'riscv-none-embed-g++' linked to 'gnu-mcu-eclipse-riscv-none-gcc/.content/bin/riscv-none-embed-g++'
File 'riscv-none-embed-gcc' linked to 'gnu-mcu-eclipse-riscv-none-gcc/.content/bin/riscv-none-embed-gcc'
File 'riscv-none-embed-gcc-7.2.0' linked to 'gnu-mcu-eclipse-riscv-none-gcc/.content/bin/riscv-none-embed-gcc-7.2.0'
File 'riscv-none-embed-gcc-ar' linked to 'gnu-mcu-eclipse-riscv-none-gcc/.content/bin/riscv-none-embed-gcc-ar'
File 'riscv-none-embed-gcc-nm' linked to 'gnu-mcu-eclipse-riscv-none-gcc/.content/bin/riscv-none-embed-gcc-nm'
File 'riscv-none-embed-gcc-ranlib' linked to 'gnu-mcu-eclipse-riscv-none-gcc/.content/bin/riscv-none-embed-gcc-ranlib'
File 'riscv-none-embed-gcov' linked to 'gnu-mcu-eclipse-riscv-none-gcc/.content/bin/riscv-none-embed-gcov'
File 'riscv-none-embed-gcov-dump' linked to 'gnu-mcu-eclipse-riscv-none-gcc/.content/bin/riscv-none-embed-gcov-dump'
File 'riscv-none-embed-gcov-tool' linked to 'gnu-mcu-eclipse-riscv-none-gcc/.content/bin/riscv-none-embed-gcov-tool'
File 'riscv-none-embed-gdb' linked to 'gnu-mcu-eclipse-riscv-none-gcc/.content/bin/riscv-none-embed-gdb'
File 'riscv-none-embed-gprof' linked to 'gnu-mcu-eclipse-riscv-none-gcc/.content/bin/riscv-none-embed-gprof'
File 'riscv-none-embed-ld' linked to 'gnu-mcu-eclipse-riscv-none-gcc/.content/bin/riscv-none-embed-ld'
File 'riscv-none-embed-ld.bfd' linked to 'gnu-mcu-eclipse-riscv-none-gcc/.content/bin/riscv-none-embed-ld.bfd'
File 'riscv-none-embed-nm' linked to 'gnu-mcu-eclipse-riscv-none-gcc/.content/bin/riscv-none-embed-nm'
File 'riscv-none-embed-objcopy' linked to 'gnu-mcu-eclipse-riscv-none-gcc/.content/bin/riscv-none-embed-objcopy'
File 'riscv-none-embed-objdump' linked to 'gnu-mcu-eclipse-riscv-none-gcc/.content/bin/riscv-none-embed-objdump'
File 'riscv-none-embed-ranlib' linked to 'gnu-mcu-eclipse-riscv-none-gcc/.content/bin/riscv-none-embed-ranlib'
File 'riscv-none-embed-readelf' linked to 'gnu-mcu-eclipse-riscv-none-gcc/.content/bin/riscv-none-embed-readelf'
File 'riscv-none-embed-run' linked to 'gnu-mcu-eclipse-riscv-none-gcc/.content/bin/riscv-none-embed-run'
File 'riscv-none-embed-size' linked to 'gnu-mcu-eclipse-riscv-none-gcc/.content/bin/riscv-none-embed-size'
File 'riscv-none-embed-strings' linked to 'gnu-mcu-eclipse-riscv-none-gcc/.content/bin/riscv-none-embed-strings'
File 'riscv-none-embed-strip' linked to 'gnu-mcu-eclipse-riscv-none-gcc/.content/bin/riscv-none-embed-strip'
Folder 'gnu-mcu-eclipse-openocd' linked to '@gnu-mcu-eclipse/openocd/0.10.0-7.1'.
File 'openocd' linked to 'gnu-mcu-eclipse-openocd/.content/bin/openocd'
Folder 'gnu-mcu-eclipse-windows-build-tools' linked to '@gnu-mcu-eclipse/windows-build-tools/2.10.1'.

'xpm install' completed in 6.086 sec.
$
```

### Install packages

When invoked with arguments, they must refer to packages. The common
use case is to use names of packages stored on the public npm repository,
but since xpm uses the same library to manage downloads as npm,
all formats are accepted:

```sh
xpm install [<@scope>/]<name>
xpm install [<@scope>/]<name>@<tag>
xpm install [<@scope>/]<name>@<version>
xpm install [<@scope>/]<name>@<version range>
xpm install <github>:<organization>/<repo-name>[#commit-id]
xpm install <github>:<organization>/<repo-name>[#semver:X.Y.Z]
xpm install <gitlab>:<organization>/<repo-name>[#commit-id]
xpm install <gitlab>:<organization>/<repo-name>[#semver:X.Y.Z]
xpm install <git repo url>
xpm install <tarball file>
xpm install <tarball url>
xpm install <folder>
```

When referring to GitHub by semver, a tag named `vX.Y.Z` must be present.

For detail please see [`npm install`](https://docs.npmjs.com/cli/install).

Examples:

```console
$ xpm install --global @gnu-mcu-eclipse/arm-none-eabi-gcc --verbose
xPack manager - install package(s)

Processing @gnu-mcu-eclipse/arm-none-eabi-gcc@8.2.1-1.7.1...
Installing globally in '/Users/ilg/Library/xPacks/@gnu-mcu-eclipse/arm-none-eabi-gcc/8.2.1-1.7.1'...
Extracting 'gnu-mcu-eclipse-arm-none-eabi-gcc-8.2.1-1.7-20190524-0603-macos.tgz'...
3248 files extracted.

'xpm install' completed in 9.958 sec.
$
```

## Options

### Help (`--help`)

```console
$ xpm install --help

xPack manager - install package(s)
Usage: xpm install [options...] [--global] [--system] [--force]
                   [--config <config_name>] [--dry-run] [--save-prod]
                   [--no-save] [--save-dev] [--save-optional] [--save-bundle]
                   [--save-exact]
                   [[@<scope>/]<name>[@<version]|<github_name>/<repo>]...

Install options:
  -g|--global                Install the package globally in the home folder (optional)
  -sy|--system               Install the package in a system folder (optional)
  -f|--force                 Force install over existing package (optional)
  -c|--config <config_name>  Install configuration specific dependencies (optional)
  -n|--dry-run               Pretend to install the package(s) (optional)
  -P|--save-prod             Save to dependencies; default unless -D or -O (optional)
  --no-save                  Prevent saving to dependencies (optional)
  -D|--save-dev              Save to devDependencies (optional)
  -O|--save-optional         Save to optionalDependencies (optional)
  -B|--save-bundle           Save to bundleDependencies (optional)
  -E|--save-exact            Save deps with exact version (optional)

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

### Global install (`-g|--global`)

Install package(s) in the global xPacks store (in the user home folder).

### System install (`-sy|--system`)

Install package(s) in the system repository.

### Force install (`-f|--force`)

Normally if a package is already installed, xpm exits with a message.

Use this option to force xpm to reinstall a package.

### Configuration (`-c|--config`)

Install dependencies into an existing configuration build
folder instead of the top project folder.

```sh
xpm install --config stm32f4discovery-cmake-gcc10-debug @xpack-dev-tools/arm-none-eabi-gcc@10.2.1-1.1.2
xpm install --config stm32f4discovery-cmake-gcc9-debug @xpack-dev-tools/arm-none-eabi-gcc@9.3.1-1.4.1
```

The `xpacks` folders are not stored in the project folder, but in the
configuration build folder, configured via the `buildFolderRelativePath`
property.

Similarly, the dependencies are stored in the configuration, for
example:

```json
{
  "...": "...",
  "xpack": {
    "configurations": {
      "stm32f4discovery-cmake-gcc10-debug": {
        "devDependencies": {
          "@xpack-dev-tools/arm-none-eabi-gcc": "10.2.1-1.1.2"
        }
      },
      "stm32f4discovery-cmake-gcc9-debug": {
        "devDependencies": {
          "@xpack-dev-tools/arm-none-eabi-gcc": "9.3.1-1.4.1"
        }
      }
    }
  }
}
```

### Dry-run (`-n|--dry-run`)

Do everything except to actually install the packages(s).

### Save to dependencies (`-P|--save-prod`)

Add the installed packages to the `dependencies` array and
update the `package.json`;

Unless an explicit `-D` or `-O`, source xPacks are stored to
`dependencies` by default.

### Prevent saving to dependencies (`--no-save`)

Prevent saving to dependencies and updating the `package.json` file.

### Save to devDependencies (`-D|--save-dev`)

Add the installed packages to the `devDependencies` array and
update the `package.json`.

Unless an explicit `-P`, binary xPacks and npm modules are stored to
`devDependencies` by default.

### Save to optionalDependencies (`-O|--save-optional`)

Add the installed packages to the `optionalDependencies` array and
update the `package.json`.

{% include note.html content="Currently xpm does not use the
optional dependencies, but npm may do so." %}

### Save to bundleDependencies (`-B|--save-bundle`)

Add the installed packages to the `bundleDependencies` array and
update the `package.json`.

{% include note.html content="Currently xpm does not use the
bundle dependencies, but npm may do so." %}

### Save with exact version (`-E|--save-exact`)

By default, the stored reference to the installed package
uses the `^` syntax,
which is the npm/semver convention that means _compatible_,
in other words the
highest version that does not change the major number, if available.

For example:

```json
{
  "...": "...",
  "devDependencies": {
    "liquidjs": "^9.23.3"
  },
  "xpack": {}
}
```

This option changes the behaviour by storing the version without `^`,
which means the exact version is required.

Unless an explicit `-D`, binary xPacks with longer version
strings (that do not comply to
semver) are stored without `^` by default, for example:

```json
{
  "...": "...",
  "devDependencies": {
    "@xpack-dev-tools/arm-none-eabi-gcc": "10.2.1-1.1.2"
  },
  "xpack": {}
}
```
