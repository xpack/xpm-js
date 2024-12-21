---
title: How to install xpm
permalink: /xpm/install/

keywords:
  - xpm
  - npm
  - xpack
  - install

comments: true
toc: false

xpm_version: 0.19.1

date: 2017-10-09 14:14:00 +0300

---

## Overview

**xpm** is a [Node.js](https://nodejs.org) CLI application available as the
npm package [xpm](https://www.npmjs.com/package/xpm) from the
[`npmjs.com`](https://www.npmjs.com) public repository.

## Prerequisites

- a recent [Node.js](https://nodejs.org) (>=**18.x**), since some dependencies
  require new features
- a recent [npm](https://docs.npmjs.com/cli/npm).

For details, please read (carefully!) the
[prerequisites]({{ site.baseurl }}/install/) page.

{% include important.html content="Please be sure you are installing **xpm** as the **xPack Project Manager**, since there are other projects that unfortunately use the same name (for example _uniX Package Manager_)." %}

{% capture uninstall %}

## Uninstall

To remove xpm, the command is:

```sh
npm uninstall --location=global xpm
```

{% endcapture %}

{% capture windows %}

## `xpm` install

On Windows, by default, global Node.js packages are installed in the
user home folder, in `%APPDATA%\npm`
(like `C:\Users\ilg\AppData\Roaming\npm`), and managing packages
does not require administrative rights.

```console
C:\>npm install --location=global xpm@latest

added 1 package in 7s

56 packages are looking for funding
  run `npm fund` for details
```

The result is a set of three files in the `%APPDATA%\npm` folder:

```txt
C:\>dir "%APPDATA%"\npm\xpm*
 Volume in drive C has no label.
 Volume Serial Number is B02D-925C

 Directory of C:\Users\ilg\AppData\Roaming\npm

29/07/2024  07:24               397 xpm
29/07/2024  07:24               329 xpm.cmd
29/07/2024  07:24               821 xpm.ps1
               3 File(s)          1,547 bytes
               0 Dir(s)  39,088,439,296 bytes free
```

If you followed the instructions in the
[prerequisites]({{ site.baseurl }}/install/) page, you should
already have this path configured and the program should start normally:

```console
C:\>xpm --version
{{ page.xpm_version }}
```

### Power Shell execution policy

By default, Power Shell restricts scripts, and **xpm** is not allowed to run:

```console
PS C:\Users\ilg> xpm --version
xpm : File C:\Users\ilg\AppData\Roaming\npm\xpm.ps1 cannot be loaded because running scripts is disabled on this
system. For more information, see about_Execution_Policies at https:/go.microsoft.com/fwlink/?LinkID=135170.
At line:1 char:1
+ xpm --version
+ ~~~
    + CategoryInfo          : SecurityError: (:) [], PSSecurityException
    + FullyQualifiedErrorId : UnauthorizedAccess
PS C:\Users\ilg>
```

In order to run **xpm** it is
necessary to change the execution policy:

```console
PS C:\Users\ilg> Set-ExecutionPolicy -ExecutionPolicy Unrestricted -Scope CurrentUser

Execution Policy Change
The execution policy helps protect you from scripts that you do not trust. Changing the execution policy might expose
you to the security risks described in the about_Execution_Policies help topic at
https:/go.microsoft.com/fwlink/?LinkID=135170. Do you want to change the execution policy?
[Y] Yes  [A] Yes to All  [N] No  [L] No to All  [S] Suspend  [?] Help (default is "N"): A
PS C:\Users\ilg> xpm --version
{{ page.xpm_version }}
PS C:\Users\ilg>
```

### Aggressive antivirus programs & xpm

On Windows, binary xPacks are `.zip` archives containing `.exe` files;
some aggressive antivirus programs may quarantine these files, or
even modify the content of the archives, affecting the checksum and
thus preventing the packages to be installed.

Errors may look like:

```console
Downloading https://github.com/gnu-mcu-eclipse/qemu/releases/download/v2.8.0-4-20190211/gnu-mcu-eclipse-qemu-2.8.0-4-20190211-0633-win64.zip...
{ Error: sha256-p3CgzXJt4zi5g0kxQXlOpss3Xu5Yy+Zv8HXWXkUdg6g= integrity checksum failed when using sha256: wanted sha256-p3CgzXJt4zi5g0kxQXlOpss3Xu5Yy+Zv8HXWXkUdg6g= but got sha512-k1s9UW6Zb20llIuopUwbf3D38OP1F+Nkgf3wGWwsXPwoQfhuiR89+VF3Rrf7YF20fN3tG4/3jZSC3apiHbQ6NA== sha256-ABnfxLMtY8E5KqJkrtIlPB4ML7CSFvjizCabv7i7SbU=. (9 bytes)
...
Extracting 'gnu-mcu-eclipse-qemu-2.8.0-4-20190211-0633-win64.zip'...
error: Cannot read property 'path' of null
```

The solution is to configure the antivirus program to be less aggressive,
at least for files in the
`AppData\Roaming\xPacks` and `AppData\Local\Caches\xPacks` folders.

If this is not possible, temporarily disable the antivirus program. Or switch
to a better operating system.

{{ uninstall | markdownify }}

### xpm clean-ups

For a thorough clean-up, please note that **xpm** uses only two folders:

- `%APPDATA%\Roaming\xPacks`
- `%APPDATA%\Local\Caches\xPacks`

They can be removed at any time, and **xpm** will recreate them on new installs.

{% endcapture %}

{% capture macos %}

## `xpm` install

On macOS, by default, global Node.js packages are installed in
`/usr/local`, and managing them requires administrative rights,
but if you followed the instructions in the
[prerequisites]({{ site.baseurl }}/install/) page, you should
already have configured npm to use a location in the home folder.

With the environment properly set, the command to install xpm is:

```sh
npm install --location=global xpm@latest
```

To test if xpm starts:

```console
$ which xpm
/Users/ilg/.nvm/versions/node/v18.18.2/bin/xpm
$ xpm --version
{{ page.xpm_version }}
```

{{ uninstall | markdownify }}

### xpm clean-ups

For a thorough clean-up, please note that **xpm** uses only two folders:

- `${HOME}/Library/xPacks`
- `${HOME}/Library/Caches/xPacks`

They can be removed at any time, and **xpm** will recreate them on new installs.

### Show macOS hidden files

The default location used to install the global packages is
in `~/Library`, a folder that, due to an unfortunate Apple decision,
is hidden for regular browsing in Finder.

To make it back visible, use:

```sh
/usr/bin/chflags nohidden ~/Library
xattr -d com.apple.FinderInfo ~/Library
```

A more general solution is to make all hidden files visible:

```sh
defaults write com.apple.Finder AppleShowAllFiles true
killall Finder
```

Another annoying behaviour of the file browser is to hide names starting
with `.` (dot), which is a real pity since the binary packages are
extracted in a folder named `.content`.

Fortunately there is a workaround for this too:

```console
cmd+shift+'.'
```

This keyboard shortcut works like a toggle, using it once makes files
starting with dot visible,
using it again reverts to hiding them.

### `zsh: command not found: xpm`

If you recently switched to `zsh`, or updated macOS to 11.x, which does
this automatically, you need to copy the `PATH` setting from your previous shell startup file to `.zprofile`, otherwise the location
where npm installs global modules is not in the path.

{% endcapture %}

{% capture linux %}

## `xpm` install

{% include note.html content="Support for Arm platforms was
added in the 0.6.2 release of xpm." %}

On GNU/Linux, by default, global Node.js packages are installed in
`/usr/local`, and managing them requires administrative rights,
but if you followed the instructions in the
[prerequisites]({{ site.baseurl }}/install/) page, you should
already have configured npm to use a location in the home folder.

With the environment properly set, the command to install xpm is:

```sh
npm install --location=global xpm@latest
```

To test if xpm starts:

```console
$ which xpm
/home/ilg/opt/npm/bin/xpm
$ xpm --version
{{ page.xpm_version }}
```

### Using an out of date Node.js

Ignoring the recommendation to use the LTS version of Node.js and
insisting on using the one provided by the distribution usually results in
errors like this:

```console
$ xpm -v
/home/ilg/opt/npm/lib/node_modules/xpm/node_modules/@ilg/cli-start-options/lib/cli-application.js:150
  static async start () {
               ^^^^^
SyntaxError: Unexpected identifier
    at exports.runInThisContext (vm.js:53:16)
    at Module._compile (module.js:374:25)
    at Object.Module._extensions..js (module.js:417:10)
    at Module.load (module.js:344:32)
    at Function.Module._load (module.js:301:12)
    at Module.require (module.js:354:17)
    at require (internal/module.js:12:17)
    at Object.<anonymous> (/home/ilg/opt/npm/lib/node_modules/xpm/node_modules/@ilg/cli-start-options/index.js:55:24)
    at Module._compile (module.js:410:26)
    at Object.Module._extensions..js (module.js:417:10)
```

This problem is caused by the old Node.js, unable to understand the
`async` keyword.

Follow the instructions in the
[prerequisites]({{ site.baseurl }}/install/) page and update your
`node` & `npm` programs.

{{ uninstall | markdownify }}

### xpm clean-ups

For a thorough clean-up, please note that **xpm** uses only two folders:

- `${HOME}/.local/xPacks`
- `${HOME}/.cache/xPacks`

They can be removed at any time, and **xpm** will recreate them on new installs.

{% endcapture %}

{% include platform-tabs.html %}

## Miscellaneous

The official page explaining how to install npm in a custom
folder is [Resolving EACCES permissions errors when installing packages globally](https://docs.npmjs.com/getting-started/fixing-npm-permissions).

## `npx`

If, for any reason, you decide not to install xpm, you can still
benefit from it by using the `npx` command, as a trampoline to start xpm:

```console
$ npx xpm --version
{{ page.xpm_version }}
```

However, for regular usage, this method is not efficient, since
npx will need to prepare the Node.js module
for each run, and this takes some time.

## npm folders

For more details on the folders used by npm, see
[npm-folders](https://docs.npmjs.com/files/folders).

## xpm folders

To avoid security issues and the need to increase the user privilege level,
xpm does not use any system folders, and all activity happens
in the user home.

There are two main folders:

- a cache folder, where all downloaded files are stored
- a global xPacks store folder, where the xPacks are expanded

For more details see [xpm folders]({{ site.baseurl }}/xpm/folders/).

## Proxy

If you are behind a firewall, you need to configure
a proxy.

xpm uses the same modules to fetch the package (`pacote`), so
setting a proxy for npm should also work for xpm.

In addition, xpm uses (`node-fetch`,
`https-proxy-agent`, `proxy-from-env`) to download the binary
archive. These packages require setting the `http_proxy` & `https_proxy`
variables in the environment.
See [proxy-from-env](https://www.npmjs.com/package/proxy-from-env) for
details.

## `Cannot find module '@ilg/cli-start-options'`

In certain conditions, npm may fail when installing
a new xpm over an existing one, and xpm becomes unusable,
complaining about missing modules.

```console
% xpm --version
internal/modules/cjs/loader.js:888
  throw err;
  ^

Error: Cannot find module '@ilg/cli-start-options'
Require stack:
- /home/ilg/.nvm/versions/node/v18.18.2/lib/node_modules/xpm/lib/main.js
- /home/ilg/.nvm/versions/node/v18.18.2/lib/node_modules/xpm/bin/xpm.js
    at Function.Module._resolveFilename (internal/modules/cjs/loader.js:885:15)
```

If this happens, a new install usually fixes the problem,
if not, the safe way is to first uninstall xpm and then re-install.

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

npm xpm@{{ page.xpm_version }} '/Users/ilg/.nvm/versions/node/v18.18.2/lib/node_modules/xpm'
Home page: <https://xpack.github.io/xpm/>
Bug reports: <https://github.com/xpack/xpm-js/issues/>
%
```
