## Change log

Changes in reverse chronological order.
Don't forget to close GitHub [issues](https://github.com/xpack/xpm-js/issues).

### v0.4.5 (2018-04-29)

- bump start options 0.4.10 this fixes the `sudo` recommendation for upgrades
- bump promisifier 0.2.1 to add support for fsPromises
- update code to use fsPromises

### v0.4.4 (2018-04-29)

- [#10] display shorter message for install error; after pacote.manifest, display error.message
- bump promisifier 0.1.10 to avoid hoek issue
- [#11]: README explain how to install in custom folder

### v0.4.3 (2018-04-23)

- deps: bump @ilg/cli-start-options@0.4.10; this includes the test for node 8.x

### v0.4.2 (2018-04-23)

- run-script: propagate error code

### v0.4.1 (2018-04-23)

- install: move some messages to verbose mode

### v0.4.0 (2018-04-23)

- copy shim locally
- install: shims add path to pick dlls

### v0.3.6 (2018-04-22)

- deps: @zkochan/cd-shim@2.2.4
- init: remove package if npm install fails
- utils/xpack.js: add getPosixPath()
- utils/spawn.js: overwrite Path with PATH only if different
- install: implement Windows complicated logic with shims
- add NOTES.md
- install: skip when posix bin file not found

### v0.3.5 (2018-04-20)

- utils/spawn: fix windows Path
- deps: cmd-shim@2.0.2
- install: use cmd-shim on windows

### v0.3.4 (2018-04-18)

- xpm init: fix parseGitConfig exception
- README: improve install section

### v0.3.3 (2018-04-17)

- xpm install: add 'checking...' messages
 
### v0.3.2 (2018-04-17)

- xpm install: try junctions and hard links on Windows

### v0.3.1 (2018-04-17)

- utils/spawn.js: fix code for windows
- package.json: bump cli-start-options to 0.4.9

### v0.3.0 (2018-04-17)

- [#8] xpm init: add support for --template
- [#9] xpm init: add support to create new xPacks
- xpm install: install dependencies
- xpm install: add links to binaries
- xpm run: add paths to local .bin

### v0.2.18 (2018-04-13)

- update cli-start-options to 0.4.8, with message on two lines

### v0.2.17 (2018-04-13)

- update cli-start-options to 0.4.6, to fix del message

### v0.2.16 (2018-04-07)

- update cli-start-options to 0.4.5

### v0.2.15 (2018-04-07)

- update cli-start-options to 0.4.4

### v0.2.14/v0.2.13 (2018-04-07)

- use integrated update notifier

### v0.2.12/v0.2.11 (2018-04-06)

- add update-notifier

### v0.2.10 (2018-04-02)

- update deps

### v0.2.9 (2018-04-02)

- removed dep from compress-tarxz, it fails to install on node 9.x

### v0.2.8 (2018-03-08)

- update deps to avoid ssri < 5.2.2.

### v0.2.7 (2018-02-20)

- [#5] xpm install: add support for xz archives

### v0.2.6 (2018-01-14)

- [#4] rework the unzip logic
  - no longer need the rename step
  - use decompress, which allows to strip

### v0.2.5 (2018-01-14)

- [#1] install: accept multiple packages
- [#2] install: accept platforms that do not have binaries
- [#3] install: no error for 'Package already installed'

### v0.2.4 (2017-11-14)

- README: fix  typos
- README: add 'experimental' notice

### v0.2.3 (2017-11-12)

- xpm/install: rework the download logic

### v0.2.2 (2017-11-12)

- fix Linux cache path

### v0.2.1 (2017-11-12)

- add 'request' to deps

### v0.2.0 (2017-11-12)

- install: download and extract binaries
- xpm/install: add --system (not yet implemented), add '-n' to --dry-run
- utils/global-config: prefer environment vars

### 2017-10-03

- run-script & build commands functional

### v0.1.1 (2017-04-18)

- update to use the CLI framework

### v0.1.0 (2017-03-21)

- initial version, incomplete