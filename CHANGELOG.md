# Change log

Changes in reverse chronological order.
Don't forget to close GitHub [issues](https://github.com/xpack/xpm-js/issues/).

2023-09-26

* v0.17.0 released
* c1232cc package.json: update test scripts
* d94718c package.json: bump deps
* 1cc619c package.json: node >= 16.14.0
* e6485d9 ignore .tap

## 2023-09-22

* b548ef8 0.16.5
* 9137bfd prepare v0.16.5
* ace8f37 .npmignore /tmp/
* cc1c7b6 package-lock.json update
* 3ae2f65 .vscode/settings.json
* bf9753c tests/520-xpm-init.js: test init
* cadd61a #190: process gitConfig errors

## 2023-09-12

* 0bd9106 0.16.4
* 000f75b prepare v0.16.4
* daa46cf launch.json update
* 9fde607 #184: fix semver for registry references
* 0e18fbe launch.json: add xpm init --ignore-errors
* 01050aa .vscode/settings.json: ignoreWords
* 4720b5c cosmetise trailing dots in messages
* 8125608 #188: xpm init npm package
* d55af65 #189: get author.name & email from git config
* e1f8edd #187: xom init --ignore-errors
* 197fb9d README update
* 33f5024 package.json: revert arborist, cacache, pacote
* aa881c3 prepare v0.16.4
* 072de50 package.json: version 0.1.6.4-pre
* a9c7a59 #184: support 'git+' urls
* edcb59b .vscode/settings.json: ignoreWords
* d10bb2e package.json: bump deps

## 2023-09-01

* 6d0797a install.sh: rewrite gitLinkRegexp to pass standard
* 6bda979 Merge pull request #185 from JoeBenczarski/master

## 2023-08-31

* de30ea3 Support any git URL

## 2023-07-27

* 2c9167b lib/main-dev.js: use export

## 2023-07-23

* 7efa49d README update
* 0c8d8ab install.js: rename manifestFrom
* d0b0de8 0.16.3
* 49240bc prepare v0.16.3
* 4703f0d .vscode/launch.json update
* d140c26 package.json: bump deps
* 733633c #179: fix install copied deps
* 6f75c9e #178: local uninstall silently ignores version

## 2023-07-22

* 7bc00ea #177: fix uninstall local packages
* 31a9f9c #176: list no longer shows npm packages (policies)
* f0235f8 Revert "#176: list no longer shows npm packages"
* ad996ac #176: list no longer shows npm packages
* 92b9da3 #175: increase maxDepth: 2 for list

## 2023-07-02

* v0.16.2 released
* 81f2858 #174: fix enhanced dependencies (github:)

## 2023-06-03

* 64ca281 0.16.1
* c3eba0b prepare v0.16.1
* a978b7f xpack.js: fix ManifestIds undefined policies

## 2023-06-02

* 02e113a 0.16.0
* 4a11772 prepare v0.16.0
* 35eb013 #171: add support for xpm install (copy devDeps)
* 3a6202f install.js: rename downloadAndProcessDependencies
* f0ac19e #171: cleanups
* 273b3de #171: warn useless --copy for global installs
* 3e1c711 launch.json: add install --copy
* 2c8c9ec #171: implement --copy in install with package
* b249258 #171: add onlyStringDependencies to policies
* 7e6eb46 install.js: setReadOnly for pacoteExtractPackage
* 527b5b3 rename pacoteExtractPackage()
* fde91b8 rename temporary folder .tmp
* 972bd44 #170: revert to xpacks/@scope/name

## 2023-05-23

* v0.15.2 released
* 37d108c package.json: bump deps
* a497608 #166: create global store folder before list
* 793fa16 #167: Use a temporary folder to install

## 2023-05-18

* 6a27a97 package-lock.json: v1
* v0.15.1 released
* 9ba2445 #165: fix listing package in the root folder
* 53f32db #164: fix file:// for windows imports

## 2023-03-01

* v0.15.0 released
* 5831f99 #80: add setup via HttpsProxyAgent
* e0b7064 install.js: cosmetic reorders
* 3115d39 node-ci.yml: explicit node versions
* 13b7b4e init.js cosmetics
* 099d711 main.js:
* 75db16c package.json: add npm-version script
* 95608c3 type module
* 67fbb5e package.json: use del-cli in deep-clean
* 07c37ac package.json: remove npm dep

## 2023-02-09

* 2563618 .vscode/settings.json: ignoreWords
* 28e5c56 add xpm.cmd
* c7380b5 package.json: bump deps
* d5102ce README updates
* eb1283c launch.json: test hello-world-template
* d3802ec bump pacote; add @npmcli/arborist

## 2023-02-08

* 431e3a5 bump most deps (except pacote)
* e9e320f README update
* 5cb7e78 #162: migrate form CommonJS to ES6 modules

## 2023-02-04

* b15e5dd 0.14.9
* 29cca3e prepare v0.14.9
* 3b2e941 #159: retry failed downloads
* 74ede8c .vscode/settings.json: ignoreWords
* c25958e consistent use of catch (err)
* d3c141d #160: log.trace the full error object

## 2023-01-31

* v0.14.8 released
* 6b9de01 #154: explicit exceptions for fetch & pipeline
* v0.14.7 released
* 8eed65e package.json: bump node-fetch to 2.6.9

## 2023-01-24

* v0.14.6 released
* b52d471 #154: rework cacheArchive with pipeline()
* dc49fda #154: add debug to download
* b427c37 package.json: bump deps
* v0.14.5 released
* f9c855c #154: switch cacache to stream

## 2023-01-23

* e9b57f6 node-ci.yml: document runners
* 376eefb node-ci.yml: bump versions, deprecate 12, add 18
* v0.14.4 released
* da68982 #154: await cacache.put()

## 2023-01-03

* 02f0bff #154: more verbosity for debug
* 0aacafe #157: update messages for central store

## 2022-12-28

* 62313db cosmetics: rename central storage
* a09dab2 [#154]: log.trace pacote.extract result

## 2022-10-16

* v0.14.2
* 04616bc #153: remove purgeNodeModules

## 2022-08-15

* v0.14.0
* da79a0d #143: issue policy warning

## 2022-08-14

* 4f9d89c package.json: 0.14.0-pre
* 9adce11 #143: install separate dependencies
* 8c20f6c package-liquid.json: reorder properties
* 5541e1a #143: uninstall separate xpack dependencies
* 9bb1029 policies.js: log cosmetics
* 941e034 xpack.js:  checkMinimumXpmRequired returns minimumXpmRequired
* b2fda36 #149: Fix xpm list which does not show local packages
* 240e431 #148: Filter out pre-release in generated minimumXpmRequired
* 723a3e0 #147: Add default empty properties in package.json for init
* 16c81f9 #143: add policies.js
* cba9ead xpack.js: checkMinimumXpmRequired returns version
* c21b718 update link to latest-v12.x
* 878cf27 update/shorten copyright notices

## 2022-07-27

* 6d37824 ISSUE_TEMPLATE updates
* 9401d98 ISSUE_TEMPLATE updates

## 2022-07-13

* v0.13.7
* 95e79ea #142: purge node_modules
* c4e439e #142: npm install --quiet
* be2b25c fix typos

## 2022-06-15

* v0.13.6 published
* d295c94 #141: fix passing args to actions

## 2022-05-26

* v0.13.5 published
* 6aa5189 #139: filter out hidden configs

## 2022-05-18

* v0.13.4 published
* 049053f #138 avoid warnings when setting links to RO

## 2022-05-03

* v0.13.3 published
* 874aafb package.json: bump cli-start-options to 0.6.6

## 2022-04-30

* v0.13.2 published
* 874aafb package.json: bump cli-start-options to 0.6.5

## 2022-04-18

* v0.13.1 published
* 773475b re-generate dependencies

## 2022-04-17

* v0.13.0 published
* 8d0473c #134 fix install updates

## 2022-04-16

* 8807aff #134 add processInheritance
* 252f8c7 functions.js: add isBoolean()

## 2022-04-14

* 38692a1 #109 prefer XPACKS_STORE_FOLDER
* cf30b77 engines: node >= 12
* 96ec107 bump cli-start-options 0.6.4
* c68dce5 #131 recommend --global for binary xpacks
* cb13042 #133 validate chmod
* c033a1e #133 fs.constants.S_IWUSR hack on windows

## 2022-04-13

* 9a79f25 #136 --ignore-errors for run & uninstall
* 673e44f #136 prepareMap with no stack trace

## 2022-04-11

* v0.13.0 prepared
* bump Node.js 12.x

## 2022-04-01

* v0.12.10 published
* add explicit minimist 1.2.5 to fix security issue

## 2022-01-14

* v0.12.9 published
* [#129] - process spawn() exceptions

## 2022-01-06

* v0.12.6 published
* [#129] switch shims to absolute paths (arm-none-eabi-g++ fails)
* v0.12.5 published
* [#129] fix shims for --config
* v0.12.4 published
* [#129] more spawn() rework, add log, fix relative path on windows

## 2022-01-05

* v0.12.3 published
* [#129] rework spawn()
* v0.12.2 published
* [#128] fix windows paths to use the npm cmdShim package

## 2021-12-30

* v0.12.1 published
* [#128] revert to public cmd-shim to also create .ps1 shim
* disable experimental Windows file symlinks, they are broken

## 2021-12-28

* experimental v0.12.0 prepared
* v0.11.2 released
* [#126] improve error processing for liquidjs substitutions

## 2021-12-26

* v0.11.1 released, but not tagged as `latest`
* [#125] fix `install --config` regression
* v0.11.0 released

## 2021-12-25

* [#124] fix list scoped npm
* [#122] update tests for --all-configs
* [#122] add --all-configs to install
* [#123] accept -32 as alias for --force-32bit

## 2021-12-23

* [#119] do not recurse npm dependencies
* [#121] use `npm install` for npm packages

## 2021-12-22

* [#120] xpm list fails with null exception
* prepare v0.10.9

## 2021-09-05

* v0.10.7 released
* [#116] - allow to install the 32-bit binaries on 64-bit architectures
* bump deps

## 2021-07-21

* v0.10.6 released
* [#112] - process errors while checking for updates
* bump deps

## 2021-06-16

* v0.10.5 released
* [#110] - xpm init should warn for extra args
* v0.10.4 released
* bump deps

## 2021-05-26

* v0.10.3 released
* update README; remove deprecation notice, mention uninstall

## 2021-05-19

* v0.10.2 released
* add `bundledDependencies` to `package.json`

## 2021-05-12

* v0.10.1 released
* [#108] - support multi-line properties
* [#107] - rename to project manager
* [#106] - xpm init --template checks minimumXpmRequired

## 2021-05-11

* [#101] - Pass CliExitCodes & CliError in the context
* [#105] - improve error messages
* [#104] - xpm install -g does not validate package.json

## 2021-05-10

* [#103] - no xpm install for templates with bundleDependencies
* [#99] use @xpack/xpm-liquid
* [#100] - remove tag endl
* [#102] - xpm init adds minimumXpmRequired
* replace user-home with os.homedir()

## 2021-03-28

* v0.9.1 released
* [#98] - fix xpm run -c path
* [#97] - prefer buildConfigurations

## 2021-03-27

* v0.9.0 released

## 2021-03-26

* install should set all installs as read-only

## 2021-03-25

* [#35] - add checkMinimumXpmRequired added
* bump dependencies versions
* [#94] - add --config to `xpm link`
* [#95] - add --config to `xpm uninstall`
* [#96] - update `xpm list` to show configurations dependencies

## 2021-03-24

* [#90] - add configuration specific install with package.json update

## 2021-03-23

* [#93] - install: process isDryRun
* [#90] - iterate all configurations on `xpm install`
* [#91] - fix use of properties in substitutions
* [#92] - Add os.platform and os.arch to substitution map

## 2021-03-22

* [#91] - add liquidMap.properties
* return CliExitCodes.ERROR.INPUT for package.json errors
* [#90] - add configuration specific install

## 2021-03-20

* [#89] - prefer run & run-action
* [#88] - add support for configurations & actions
* prepare v0.9.0-beta

## 2021-01-30

* v0.8.1 released
* [#66] - change match logic to `str.match(/^[a-zA-Z]+:/)`
* [#78] - download dependencies in parallel

## 2021-01-28

* [#66] - more fixes for installing github: & git: & file:
* reformat the `list` output

## 2021-01-26

* v0.8.0 released
* [#76] - implement list
* [#13] - implement uninstall
* [#60] - change the linux default path to .local
* [#75] - remove the build command
* [#73] - change mode to RO after install
* [#74] - xpm link: report broken link, not ENOENT
* [#70] - check for name & version before xpm link
* [#72] - link to global repo
* [#71] - rework :=
* [#66] - fix installing github: & git: & file:
* [#71] - reduce verbosity

## v0.7.1 (2020-11-25)

* lib/xpm/link: revert to long info lines

## v0.7.0 (2020-11-25)

* [#62] - add \n when writing package.json
* [#65] - Add the 'xpm link' command

## v0.6.10 (2020-10-18)

* [#58] Installing node modules should report linking to node_modules, not xpacks #58
* [#63] On Windows, cmdShim() fails to identify absolute paths
* [#64] Installing deps should report linking to global folder, not local

## v0.6.9 (2020-09-29)

* [#59] Add support for linux-ia32 architecture

## v0.6.8 (2020-09-22)

* [#51] Rename Linux .cache/xPack
* [#55] Do not display 'Adding symbolic links...' if there are no binaries
* [#56] Detect different versions of the same package

## v0.6.7 (2020-09-19)

* [#54] Display the package name when creating links

## v0.6.6 (2020-08-27)

* [#52] Add win32-ia32 architecture; impove aliases logic

## v0.6.5 (2020-08-12)

* [#47] Local installs should add links in .bin
* [#48] Show the .content folder after archive extraction
* [#49] Dependencies to pre-releases should be saved as exact
* [#50] Binary xPacks should be added to devDependencies by default
* Bump lodash from 4.17.15 to 4.17.19
* npm audit fix

## v0.6.4 (2020-07-08)

* revert Bump npm-registry-fetch from 8.1.0 to 8.1.1, tests fail

## v0.6.3 (2020-07-08)

* Bump npm-registry-fetch from 8.1.0 to 8.1.1
* README: fix actions badge url

## v0.6.2 (2020-06-30)

[#40] - update pacote to 11.1.10
[#39] - update to cacache 15.0.3 and internal buffer
[#42] - error on unsupported architecture

## v0.6.1 (2020-06-29)

* [#36] - Replace 'request' by 'node-fetch'
* [#38] replace mkdirp module with make-dir
* package.json: bump all deps, less cacache & pacote
* update usage of Liquid

## v0.6.0 (2020-06-28)

* [#26] - Add --save-* options to save dependencies in package.json
* [#25] - The package.json generated by 'xpm init' is not parseable
* [#20] - Do not override LICENSE in xpm init
* [#33] - Fix the architecture detection for Arm platforms
* [#22] - Fix architecture name string for binary xPacks
* [#21] - In xpm init, ignore .git in folder name
* [#34] - xpm init should start with version 0.1.0

## v0.5.0 (2019-02-22)

* [#12] xpack.js: Add baseUrl below platform for binaries
* [#17] xpack.js: Exit if download fails
* [#16] Warn about aggressive antivirus
* [#15] temporary log of system info
* [#18] Add 'git-log' script

## v0.4.6 (2019-02-11)

* bump all deps to latest versions

## v0.4.5 (2018-04-29)

* bump start options 0.4.10 this fixes the `sudo` recommendation for upgrades
* bump promisifier 0.2.1 to add support for fsPromises
* update code to use fsPromises

## v0.4.4 (2018-04-29)

* [#10] display shorter message for install error; after pacote.manifest, display error.message
* bump promisifier 0.1.10 to avoid hoek issue
* [#11]: README explain how to install in custom folder

## v0.4.3 (2018-04-23)

* deps: bump @ilg/cli-start-options@0.4.10; this includes the test for node 8.x

## v0.4.2 (2018-04-23)

* run-script: propagate error code

## v0.4.1 (2018-04-23)

* install: move some messages to verbose mode

## v0.4.0 (2018-04-23)

* copy shim locally
* install: shims add path to pick dlls

## v0.3.6 (2018-04-22)

* deps: @zkochan/cd-shim@2.2.4
* init: remove package if npm install fails
* utils/xpack.js: add getPosixPath()
* utils/spawn.js: overwrite Path with PATH only if different
* install: implement Windows complicated logic with shims
* add NOTES.md
* install: skip when posix bin file not found

## v0.3.5 (2018-04-20)

* utils/spawn: fix windows Path
* deps: cmd-shim@2.0.2
* install: use cmd-shim on windows

## v0.3.4 (2018-04-18)

* xpm init: fix parseGitConfig exception
* README: improve install section

## v0.3.3 (2018-04-17)

* xpm install: add 'checking...' messages

## v0.3.2 (2018-04-17)

* xpm install: try junctions and hard links on Windows

## v0.3.1 (2018-04-17)

* utils/spawn.js: fix code for windows
* package.json: bump cli-start-options to 0.4.9

## v0.3.0 (2018-04-17)

* [#8] xpm init: add support for --template
* [#9] xpm init: add support to create new xPacks
* xpm install: install dependencies
* xpm install: add links to binaries
* xpm run: add paths to local .bin

## v0.2.18 (2018-04-13)

* update cli-start-options to 0.4.8, with message on two lines

## v0.2.17 (2018-04-13)

* update cli-start-options to 0.4.6, to fix del message

## v0.2.16 (2018-04-07)

* update cli-start-options to 0.4.5

## v0.2.15 (2018-04-07)

* update cli-start-options to 0.4.4

## v0.2.14/v0.2.13 (2018-04-07)

* use integrated update notifier

## v0.2.12/v0.2.11 (2018-04-06)

* add update-notifier

## v0.2.10 (2018-04-02)

* update deps

## v0.2.9 (2018-04-02)

* removed dep from compress-tarxz, it fails to install on node 9.x

## v0.2.8 (2018-03-08)

* update deps to avoid ssri < 5.2.2.

## v0.2.7 (2018-02-20)

* [#5] xpm install: add support for xz archives

## v0.2.6 (2018-01-14)

* [#4] rework the unzip logic
  - no longer need the rename step
  - use decompress, which allows to strip

## v0.2.5 (2018-01-14)

* [#1] install: accept multiple packages
* [#2] install: accept platforms that do not have binaries
* [#3] install: no error for 'Package already installed'

## v0.2.4 (2017-11-14)

* README: fix  typos
* README: add 'experimental' notice

## v0.2.3 (2017-11-12)

* xpm/install: rework the download logic

## v0.2.2 (2017-11-12)

* fix Linux cache path

## v0.2.1 (2017-11-12)

* add 'request' to deps

## v0.2.0 (2017-11-12)

* install: download and extract binaries
* xpm/install: add --system (not yet implemented), add '-n' to --dry-run
* utils/global-config: prefer environment vars

## 2017-10-03

* run-script & build commands functional

## v0.1.1 (2017-04-18)

* update to use the CLI framework

## v0.1.0 (2017-03-21)

* initial version, incomplete
