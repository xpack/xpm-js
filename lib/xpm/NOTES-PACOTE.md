The documentation for pacote is not very detailed on how the documentation
entries should be generated, so here are some examples:

## npm

```
  _resolved: 'https://registry.npmjs.org/npm/-/npm-6.13.1.tgz',
  _from: 'npm@',
```

## npm@16.3.0

```
  _resolved: 'https://registry.npmjs.org/npm/-/npm-6.13.0.tgz',
  _from: 'npm@6.13.0',
```

## @micro-os-plus/diag-trace

It gets the latest version from manifest.

```
  "@micro-os-plus/diag-trace": "^1.0.6"

  _resolved: 'https://registry.npmjs.org/@micro-os-plus/diag-trace/-/diag-trace-1.0.6.tgz',
  _from: '@micro-os-plus/diag-trace@',
```

## @micro-os-plus/diag-trace@1.0.5

It uses the explicit version.

```
  "@micro-os-plus/diag-trace": "^1.0.5"

  _resolved: 'https://registry.npmjs.org/@micro-os-plus/diag-trace/-/diag-trace-1.0.5.tgz',
  _from: '@micro-os-plus/diag-trace@1.0.5',
```

## micro-os-plus/diag-trace-xpack

Currently fails. :-(

```
  "@micro-os-plus/diag-trace": "github:micro-os-plus/diag-trace-xpack"

  error: failed '/usr/bin/git ls-remote git+ssh://git@github.com/micro-os-plus/diag-trace-xpack.git'
```

## https://github.com/micro-os-plus/diag-trace-xpack/archive/v1.0.6.tar.gz

```
  "@micro-os-plus/diag-trace": "https://github.com/micro-os-plus/diag-trace-xpack/archive/v1.0.6.tar.gz"

  _id: '@micro-os-plus/diag-trace@1.0.6',
  _resolved: 'https://github.com/micro-os-plus/diag-trace-xpack/archive/v1.0.6.tar.gz',
  _from: 'https://github.com/micro-os-plus/diag-trace-xpack/archive/v1.0.6.tar.gz'
```

## http://github.com/micro-os-plus/diag-trace-xpack/archive/v1.0.6.tar.gz

```
  "@micro-os-plus/diag-trace": "http://github.com/micro-os-plus/diag-trace-xpack/archive/v1.0.6.tar.gz"

  _id: '@micro-os-plus/diag-trace@1.0.6',
  _resolved: 'http://github.com/micro-os-plus/diag-trace-xpack/archive/v1.0.6.tar.gz',
  _from: 'http://github.com/micro-os-plus/diag-trace-xpack/archive/v1.0.6.tar.gz'
```

## http://github.com/micro-os-plus/diag-trace-xpack/archive/v1.0.6.zip

.zip not recognized

## /Users/ilg/My\ Files/WKS\ Projects/xpack.github/npm-modules/xpm-js.git/test/mock/afrom

Note the relative path.

```
  file:../../My Files/WKS Projects/xpack.github/npm-modules/xpm-js.git/test/mock/afrom

  _id: '@testscope/afrom@1.2.3',
  _integrity: 'null',
  _resolved: '/Users/ilg/My Files/WKS Projects/xpack.github/npm-modules/xpm-js.git/test/mock/afrom',
  _from: 'file:/Users/ilg/My Files/WKS Projects/xpack.github/npm-modules/xpm-js.git/test/mock/afrom'
```

## /Users/ilg/My\ Files/WKS\ Projects/xpack.github/npm-modules/xpm-js.git/test/mock/testscope-afrom-1.2.3.tgz

Note the relative path.

```
  "@testscope/afrom": "file:../../My Files/WKS Projects/xpack.github/npm-modules/xpm-js.git/test/mock/testscope-afrom-1.2.3.tgz"

  _id: '@testscope/afrom@1.2.3',
  _resolved: '/Users/ilg/My Files/WKS Projects/xpack.github/npm-modules/xpm-js.git/test/mock/testscope-afrom-1.2.3.tgz',
  _from: 'file:/Users/ilg/My Files/WKS Projects/xpack.github/npm-modules/xpm-js.git/test/mock/testscope-afrom-1.2.3.tgz'
```
