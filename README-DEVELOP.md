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
$ sudo npm link   <-- DO NOT DO THAT
up to date in 4.992s
/usr/local/bin/xpm -> /usr/local/lib/node_modules/xpm/bin/xpm.js
/usr/local/lib/node_modules/xpm -> /Users/ilg/My Files/MacBookPro Projects/xPack/npm-modules/xpm-js.git
```

On Windows, or on machines where the install folder is in the user home,
the command does not require `sudo`, for example on macOS:

```console
$ npm link
up to date in 4.985s
/Users/ilg/Library/npm/bin/xpm -> ../lib/node_modules/xpm/bin/xpm.js
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

* `npm run fix`
* commit all changes
* `npm run test-coverage`
* check the latest commits `npm run git-log`
* update `CHANGELOG.md`; commit with a message like _CHANGELOG: prepare v0.1.2_
`npm version patch` (bug fixes), `npm version minor` (compatible API
  additions), `npm version major` (incompatible API changes)
* push all changes to GitHub; this should trigger CI
* wait for CI tests to complete
* `npm publish` (use `--access public` when publishing for the first time)
