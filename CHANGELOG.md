## Change log

Changes in reverse chronological order.

### v0.2.6 2018-01-14

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