---
permalink: /xpm/cli/init/
title: xpm init

comments: true

date: 2017-10-09 12:55:00 +0300

---

## Synopsis

```sh
xpm init [options...] [--template <xpack>] [--name <string>]
                [--property <string>]*
```

Aliases:

- `ini`

## Description

Initialise the current folder as an xPack, by creating a skeleton
`package.json` file. This file needs further editing to update most
of the objects.

If called with a template, use the template and create a custom
project with as many files and folders as necessary.

{% include note.html content="The current behaviour may change,
the template API is not yet final." %}

## Options

### Help (`--help`)

```console
$ xpm init --help

xPack manager - create an xPack, empty or from a template
Usage: xpm init [options...] [--template <xpack>] [--name <string>]
                [--property <string>]*

Init options:
  -t|--template <xpack>   The xPack implementing the template (optional)
  -n|--name <string>      Project name (optional)
  -p|--property <string>  Substitution variables (optional, multiple)

Common options:
  --loglevel <level>      Set log level (silent|warn|info|verbose|debug|trace)
  -s|--silent             Disable all messages (--loglevel silent)
  -q|--quiet              Mostly quiet, warnings and errors (--loglevel warn)
  --informative           Informative (--loglevel info)
  -v|--verbose            Verbose (--loglevel verbose)
  -d|--debug              Debug messages (--loglevel debug)
  -dd|--trace             Trace messages (--loglevel trace, -d -d)
  --no-update-notifier    Skip check for a more recent version
  -C <folder>             Set current folder

xpm -h|--help             Quick help
xpm --version             Show version
xpm -i|--interactive      Enter interactive mode

npm xpm@0.9.0 '/Users/ilg/.nvm/versions/node/v14.16.0/lib/node_modules/xpm'
Home page: <https://xpack.github.io/xpm/>
Bug reports: <https://github.com/xpack/xpm-js/issues/>
$
```

### Template (`-t|--template <xpack>`)

Create the xPack using a template. The template itself is an xPack
with a specific code that implements a template API.

Example: Create a project in an interactive session by answering
lots of questions:

```console
$ xpm init --template @sifive/templates --verbose
xPack manager - create an xPack, empty or from a template

Processing @sifive/templates@1.0.4...

Programming language? (c, cpp, ?) [cpp]:
Board? (hifive1, e31arty, e51arty, ?) [hifive1]:
Content? (empty, blinky, ?) [blinky]:
Use system calls? (none, retarget, semihosting, ?) [retarget]:
Trace output? (none, uart0ftdi, stdout, debug, ?) [uart0ftdi]:
Check some warnings? (true, false, ?) [true]:
Check most warnings? (true, false, ?) [false]:
Enable -Werror? (true, false, ?) [false]:
Use -Og on debug? (true, false, ?) [false]:
Use newlib nano? (true, false, ?) [true]:

Creating the C++ project 'hifive1-blinky-cpp'...
File 'LICENSE' generated.
File 'oocd.launch' generated.
File 'jlink.launch' generated.
File 'package.json' generated.
File 'README.md' generated.
File 'xmake.json' generated.
File 'include/led.h' generated.
File 'include/sysclock.h' copied.
File 'ldscripts/libs.ld' copied.
File 'ldscripts/mem.ld' copied.
File 'ldscripts/sections.ld' copied.
File 'src/initialize-hardware.cpp' generated.
File 'src/interrupts-handlers.cpp' generated.
File 'src/led.cpp' copied.
File 'src/main.cpp' generated.
File 'src/newlib-syscalls.c' copied.
File 'src/sysclock.cpp' copied.

'xpm init' completed in 77 ms.
$
```

### Name (`--name <string>`)

Define a name for the new xPack. If missing, the xPack name is
derived from the current folder name.

### Properties (`-p|--property <string>`)

Pass pairs of `name=value` properties to the template engine. Multiple
properties can be defined.

The names, values and behaviours are all specific to each template engine.

Example: the same template as before, if it receives a mandatory
`boardName` property,
can create the new xPack without further questions, by using defaults:

```console
$ xpm init --template @sifive/templates --property boardName=hifive1
xPack manager - create an xPack, empty or from a template

Processing @sifive/templates@1.0.4...

Creating the C++ project 'hifive1-blinky-cpp'...
- boardName=hifive1
- content=blinky
- syscalls=retarget
- trace=uart0ftdi
- useSomeWarnings=true
- useMostWarnings=false
- useWerror=false
- useOg=false
- useNano=true

File 'LICENSE' generated.
File 'oocd.launch' generated.
File 'jlink.launch' generated.
File 'package.json' generated.
File 'README.md' generated.
File 'xmake.json' generated.
File 'include/led.h' generated.
File 'include/sysclock.h' copied.
File 'ldscripts/libs.ld' copied.
File 'ldscripts/mem.ld' copied.
File 'ldscripts/sections.ld' copied.
File 'src/initialize-hardware.cpp' generated.
File 'src/interrupts-handlers.cpp' generated.
File 'src/led.cpp' copied.
File 'src/main.cpp' generated.
File 'src/newlib-syscalls.c' copied.
File 'src/sysclock.cpp' copied.

'xpm init' completed in 1.144 sec.
$
```
