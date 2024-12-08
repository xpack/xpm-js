---
title: xpm folders
permalink: /xpm/folders/

comments: true

date: 2017-10-09 14:14:00 +0300

redirect_from:
  - /xpm/files/folders/

---

The locations of folders used by xpm can be controlled by several environment
variables.

Please note that when the variables must be available in GUI applications,
setting them in shell init scripts is not effective, since the windows manager
usually is not started by a shell, but by other system mechanism, which has
its own configuration files.

## Environment variables

- `XPACKS_STORE_FOLDER` (was `XPACKS_REPO_FOLDER`)
- `XPACKS_CACHE_FOLDER`
- `XPACKS_SYSTEM_STORE_FOLDER` (not implemented yet; was `XPACKS_SYSTEM_FOLDER`)
- `XPACKS_SYSTEM_CACHE_FOLDER` (not implemented yet)

## macOS

Global (home) install:

- `${HOME}/Library/xPacks`
- `${HOME}/Library/Caches/xPacks`
- `${HOME}/Library/xPacks/.bin` (not in PATH)

System install (not implemented yet):

- `/Library/xPacks`
- `/Library/Caches/xPacks`
- `/Library/xPacks/.bin` (not in PATH)

## GNU/Linux

Global (home) install:

- `${HOME}/.local/xPacks` (was `${HOME}/opt/xPacks` in earlier versions)
- `${HOME}/.cache/xPacks`
- `${HOME}/.local/xPacks/.bin` (not in PATH)

System install (not implemented yet):

- `/opt/xPacks`
- `/opt/xPacks/.cache`
- `/opt/xPacks/.bin` (not in PATH)

## Windows

Global (home) install:

- `%APPDATA%\xPacks` (like `C:\Users\ilg\AppData\Roaming\xPacks`)
- `%LOCALAPPDATA%\Caches\xPacks` (like `C:\Users\ilg\AppData\Local\Caches\xPacks`)
- `%APPDATA%\xPacks\.bin` (not in `Path`)

System install (not implemented):

- `%ProgramFiles%\xPacks` (like `C:\Program Files\xPacks`)
- `%ProgramFiles%\xPacks\.cache`
- `%ProgramFiles%\xPacks\.bin` (not in `Path`)

## Links not created by default

Please note that since installing binaries globally is strongly
discouraged in favour of installing links in each project, the global
or system links are not installed by default, and require the user to
explicitly specify the desired folder.

The `.bin` folders mentioned before are only recommendations and
intentionally are not in the PATH. However, in special setups,
users can add links to binaries in any folder.

## The xPacks folder

Individual packages are stored as separate folders:

- `[@<scope>/]<name>/<version>`

The `xpm link` inside a local package produces a symbolic link from
the local package folder to something like:

- `[@<scope>/]<name>/.link`

## The cache folder

The cache folder is used to store downloaded archives, to avoid
downloading them again if referred in other packages.

Further downloads performed by the xPacks should also cache files
here (like toolchain binaries).

## Setting session wide environment variables

{% capture windows %}
To define session wide environment variables on Windows 10, use the
Control Panel and add the variables.

TODO: find out commands to do this in a terminal.

{% endcapture %}

{% capture macos %}
To define session wide environment variables on recent macOS systems,
define a User Agent that will issue the `launchctl setenv` command.

Create a special `environment.plist` file in the users home directory,
for example in `~/Library/LaunchAgents/`:

```xml
<?xml version="1.0" encoding="UTF-8"?>

<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">

<plist version="1.0">
<dict>
 <key>Label</key>
 <string>my.variables</string>
 <key>ProgramArguments</key>
 <array>
  <string>sh</string>
  <string>-c</string>
  <string>launchctl setenv XPACKS_STORE_FOLDER /Users/myself/location/xpacks</string>
 </array>
 <key>RunAtLoad</key>
 <true/>
</dict>
</plist>
```

To activate this, run

```console
launchctl load ~/Library/LaunchAgents/environment.plist
launchctl start ~/Library/LaunchAgents/environment.plist
```

Logout and login.

The new variable should be in the environment, and available to
all applications, all shells, etc.

TODO: check if this definition is limited to a user.

Links:

- [www.launchd.info](https://www.launchd.info)
- [support.apple.com](https://support.apple.com/en-in/guide/terminal/apdc6c1077b-5d5d-4d35-9c19-60f2397b2369/mac)

{% endcapture %}

{% capture linux %}
TODO: find out how this can be done on Linux.

{% endcapture %}

{% include platform-tabs.html %}

{% include tip.html content="To avoid the additional complexity, it is
recommended to use the default locations." %}
