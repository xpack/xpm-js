# Change log

Changes in reverse chronological order.
Don't forget to close GitHub [issues](https://github.com/xpack/xpm-js/issues/).

## 2022-04-01

- v0.12.10 published
- add explicit minimist 1.2.5 to fix security issue

## 2022-01-14

- v0.12.9 published
- [#129] - process spawn() exceptions

## 2022-01-06

- v0.12.6 published
- [#129] switch shims to absolute paths (arm-none-eabi-g++ fails)
- v0.12.5 published
- [#129] fix shims for --config
- v0.12.4 published
- [#129] more spawn() rework, add log, fix relative path on windows

## 2022-01-05

- v0.12.3 published
- [#129] rework spawn()
- v0.12.2 published
- [#128] fix windows paths to use the npm cmdShim pacakge

## 2021-12-30

- v0.12.1 published
- [#128] revert to public cmd-shim to also create .ps1 shim
- disable experimental Windows file symlinks, they are broken

## 2021-12-28

- experimental v0.12.0 prepared
- v0.11.2 released
- [#126] improve error processing for liquidjs substitutions

## 2021-12-26

- v0.11.1 released, but not tagged as `latest`
- [#125] fix `install --config` regression
- v0.11.0 released

## 2021-12-25

- [#124] fix list scoped npm
- [#122] update tests for --all-configs
- [#122] add --all-configs to install
- [#123] accept -32 as alias for --force-32bit

## 2021-12-23

- [#119] do not recurse npm dependencies
- [#121] use `npm install` for npm packages

## 2021-12-22

- [#120] xpm list fails with null exception
- prepare v0.10.9

## 2021-09-05

- v0.10.7 released
- [#116] - allow to install the 32-bit binaries on 64-bit architectures
- bump deps

## 2021-07-21

- v0.10.6 released
- [#112] - process errors while checking for updates
- bump deps

## 2021-06-16

- v0.10.5 released
- [#110] - xpm init should warn for extra args
- v0.10.4 released
- bump deps

## 2021-05-26

- v0.10.3 released
- update README; remove deprecation notice, mention uninstall

## 2021-05-19

- v0.10.2 released
- add `bundledDependencies` to `package.json`

## 2021-05-12

- v0.10.1 released
- [#108] - support multi-line properties
- [#107] - rename to project manager
- [#106] - xpm init --template checks minimumXpmRequired

## 2021-05-11

- [#101] - Pass CliExitCodes & CliError in the context
- [#105] - improve error messages
- [#104] - xpm install -g does not validate package.json

## 2021-05-10

- [#103] - no xpm install for templates with bundleDependencies
- [#99] use @xpack/xpm-liquid
- [#100] - remove tag endl
- [#102] - xpm init adds minimumXpmRequired
- replace user-home with os.homedir()

## 2021-03-28

- v0.9.1 released
- [#98] - fix xpm run -c path
- [#97] - prefer buildConfigurations

## 2021-03-27

- v0.9.0 released

## 2021-03-26

- install should set all installs as read-only

## 2021-03-25

- [#35] - add checkMinimumXpmRequired added
- bump dependencies versions
- [#94] - add --config to `xpm link`
- [#95] - add --config to `xpm uninstall`
- [#96] - update `xpm list` to show configurations dependencies

## 2021-03-24

- [#90] - add configuration specific install with package.json update

## 2021-03-23

- [#93] - install: process isDryRun
- [#90] - iterate all configurations on `xpm install`
- [#91] - fix use of properties in substitutions
- [#92] - Add os.platform and os.arch to substitution map

## 2021-03-22

- [#91] - add liquidMap.properties
- return CliExitCodes.ERROR.INPUT for package.json errors
- [#90] - add configuration specific install

## 2021-03-20

- [#89] - prefer run & run-action
- [#88] - add support for configurations & actions
- prepare v0.9.0-beta

## 2021-01-30

- v0.8.1 released
- [#66] - change match logic to `str.match(/^[a-zA-Z]+:/)`
- [#78] - download dependencies in parallel

## 2021-01-28

- [#66] - more fixes for installing github: & git: & file:
- reformat the `list` output

## 2021-01-26

- v0.8.0 released
- [#76] - implement list
- [#13] - implement uninstall
- [#60] - change the linux default path to .local
- [#75] - remove the build command
- [#73] - change mode to RO after install
- [#74] - xpm link: report broken link, not ENOENT
- [#70] - check for name & version before xpm link
- [#72] - link to global repo
- [#71] - rework :=
- [#66] - fix installing github: & git: & file:
- [#71] - reduce verbosity

## v0.7.1 (2020-11-25)

- lib/xpm/link: revert to long info lines

## v0.7.0 (2020-11-25)

- [#62] - add \n when writing package.json
- [#65] - Add the 'xpm link' command

## v0.6.10 (2020-10-18)

- [#58] Installing node modules should report linking to node_modules, not xpacks #58
- [#63] On Windows, cmdShim() fails to identify absolute paths
- [#64] Installing deps should report linking to global folder, not local

## v0.6.9 (2020-09-29)

- [#59] Add support for linux-ia32 architecture

## v0.6.8 (2020-09-22)

- [#51] Rename Linux .cache/xPack
- [#55] Do not display 'Adding symbolic links...' if there are no binaries
- [#56] Detect different versions of the same package

## v0.6.7 (2020-09-19)

- [#54] Display the package name when creating links

## v0.6.6 (2020-08-27)

- [#52] Add win32-ia32 architecture; impove aliases logic

## v0.6.5 (2020-08-12)

- [#47] Local installs should add links in .bin
- [#48] Show the .content folder after archive extraction
- [#49] Dependencies to pre-releases should be saved as exact
- [#50] Binary xPacks should be added to devDependencies by default
- Bump lodash from 4.17.15 to 4.17.19
- npm audit fix

## v0.6.4 (2020-07-08)

- revert Bump npm-registry-fetch from 8.1.0 to 8.1.1, tests fail

## v0.6.3 (2020-07-08)

- Bump npm-registry-fetch from 8.1.0 to 8.1.1
- README: fix actions badge url

## v0.6.2 (2020-06-30)

[#40] - update pacote to 11.1.10
[#39] - update to cacache 15.0.3 and internal buffer
[#42] - error on unsupported architecture

## v0.6.1 (2020-06-29)

- [#36] - Replace 'request' by 'node-fetch'
- [#38] replace mkdirp module with make-dir
- package.json: bump all deps, less cacache & pacote
- update usage of Liquid

## v0.6.0 (2020-06-28)

- [#26] - Add --save-* options to save dependencies in package.json
- [#25] - The package.json generated by 'xpm init' is not parseable
- [#20] - Do not override LICENSE in xpm init
- [#33] - Fix the architecture detection for Arm platforms
- [#22] - Fix architecture name string for binary xPacks
- [#21] - In xpm init, ignore .git in folder name
- [#34] - xpm init should start with version 0.1.0

## v0.5.0 (2019-02-22)

- [#12] xpack.js: Add baseUrl below platform for binaries
- [#17] xpack.js: Exit if download fails
- [#16] Warn about aggressive antivirus
- [#15] temporary log of system info
- [#18] Add 'git-log' script

## v0.4.6 (2019-02-11)

- bump all deps to latest versions

## v0.4.5 (2018-04-29)

- bump start options 0.4.10 this fixes the `sudo` recommendation for upgrades
- bump promisifier 0.2.1 to add support for fsPromises
- update code to use fsPromises

## v0.4.4 (2018-04-29)

- [#10] display shorter message for install error; after pacote.manifest, display error.message
- bump promisifier 0.1.10 to avoid hoek issue
- [#11]: README explain how to install in custom folder

## v0.4.3 (2018-04-23)

- deps: bump @ilg/cli-start-options@0.4.10; this includes the test for node 8.x

## v0.4.2 (2018-04-23)

- run-script: propagate error code

## v0.4.1 (2018-04-23)

- install: move some messages to verbose mode

## v0.4.0 (2018-04-23)

- copy shim locally
- install: shims add path to pick dlls

## v0.3.6 (2018-04-22)

- deps: @zkochan/cd-shim@2.2.4
- init: remove package if npm install fails
- utils/xpack.js: add getPosixPath()
- utils/spawn.js: overwrite Path with PATH only if different
- install: implement Windows complicated logic with shims
- add NOTES.md
- install: skip when posix bin file not found

## v0.3.5 (2018-04-20)

- utils/spawn: fix windows Path
- deps: cmd-shim@2.0.2
- install: use cmd-shim on windows

## v0.3.4 (2018-04-18)

- xpm init: fix parseGitConfig exception
- README: improve install section

## v0.3.3 (2018-04-17)

- xpm install: add 'checking...' messages

## v0.3.2 (2018-04-17)

- xpm install: try junctions and hard links on Windows

## v0.3.1 (2018-04-17)

- utils/spawn.js: fix code for windows
- package.json: bump cli-start-options to 0.4.9

## v0.3.0 (2018-04-17)

- [#8] xpm init: add support for --template
- [#9] xpm init: add support to create new xPacks
- xpm install: install dependencies
- xpm install: add links to binaries
- xpm run: add paths to local .bin

## v0.2.18 (2018-04-13)

- update cli-start-options to 0.4.8, with message on two lines

## v0.2.17 (2018-04-13)

- update cli-start-options to 0.4.6, to fix del message

## v0.2.16 (2018-04-07)

- update cli-start-options to 0.4.5

## v0.2.15 (2018-04-07)

- update cli-start-options to 0.4.4

## v0.2.14/v0.2.13 (2018-04-07)

- use integrated update notifier

## v0.2.12/v0.2.11 (2018-04-06)

- add update-notifier

## v0.2.10 (2018-04-02)

- update deps

## v0.2.9 (2018-04-02)

- removed dep from compress-tarxz, it fails to install on node 9.x

## v0.2.8 (2018-03-08)

- update deps to avoid ssri < 5.2.2.

## v0.2.7 (2018-02-20)

- [#5] xpm install: add support for xz archives

## v0.2.6 (2018-01-14)

- [#4] rework the unzip logic
  - no longer need the rename step
  - use decompress, which allows to strip

## v0.2.5 (2018-01-14)

- [#1] install: accept multiple packages
- [#2] install: accept platforms that do not have binaries
- [#3] install: no error for 'Package already installed'

## v0.2.4 (2017-11-14)

- README: fix  typos
- README: add 'experimental' notice

## v0.2.3 (2017-11-12)

- xpm/install: rework the download logic

## v0.2.2 (2017-11-12)

- fix Linux cache path

## v0.2.1 (2017-11-12)

- add 'request' to deps

## v0.2.0 (2017-11-12)

- install: download and extract binaries
- xpm/install: add --system (not yet implemented), add '-n' to --dry-run
- utils/global-config: prefer environment vars

## 2017-10-03

- run-script & build commands functional

## v0.1.1 (2017-04-18)

- update to use the CLI framework

## v0.1.0 (2017-03-21)

- initial version, incomplete
