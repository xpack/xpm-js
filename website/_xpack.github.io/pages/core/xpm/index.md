---
title: xpm - the xPack Project Manager
permalink: /xpm/

summary: A tool to automate builds and manage dependencies for language neutral, multi-version projects, inspired by npm.
keywords:
  - xPack
  - package
  - manager

comments: true
toc: false

date: 2017-10-09 14:14:00 +0300

---

## Quicklinks

If you already know the general facts about **xpm**, you can
directly skip to the desired pages.

User pages:

- [install]({{ site.baseurl }}/xpm/install/), [support]({{ site.baseurl }}/xpm/support/), [releases]({{ site.baseurl }}/xpm/releases/), [policies]({{ site.baseurl }}/xpm/policies/)
- [npmjs.com](https://www.npmjs.com/package/xpm) (published [versions](https://www.npmjs.com/package/xpm?activeTab=versions))

Developer & maintainer pages:

- [GitHub](https://github.com/xpack/xpm-js)
- [MAINTAINER](https://github.com/xpack/xpm-js/blob/master/README-MAINTAINER.md)

## Overview

**xpm** stands for **x**Pack **p**roject **m**anager and is a
[Node.js](https://nodejs.org/en/) CLI
application to manage xPack projects; it can:

- install source and binary packages
- manage multiple build configurations
- execute (multi-)command line actions
- manage properties and perform complex substitutions, using the
  [LiquidJS](https://liquidjs.com) engine

**xpm** complements **npm** and shares the same public
packages repository ([npmjs.com](https://www.npmjs.com)).

The open source project is hosted on GitHub as
[`xpack/xpm-js`](https://github.com/xpack/xpm-js.git).

It is available as [xpm](https://www.npmjs.com/package/xpm) from npmjs.com
public registry and can be installed via **npm**.

### Examples

An example of a representative project using **xpm** to manage multi-platform
test is
[@micro-os-plus/utils-lists](https://github.com/micro-os-plus/utils-lists-xpack);
please check the
[package.json](https://github.com/micro-os-plus/utils-lists-xpack/blob/xpack/package.json)
file.

For a hands-on experience, see the
[xpack/hello-world-template-xpack](https://github.com/xpack/hello-world-template-xpack/) project.

## xPacks overview

xPacks are general purpose multi-version software packages, built on top
of the highly successful npm packages in the Node.js JavaScript ecosystem.

Please read the [xPacks Overview]({{ site.baseurl }}/) the
[xPack 101]({{ site.baseurl }}/intro/) pages.

## Purpose

The main purpose of the `xpm` CLI tool is to automate builds, including
to install dependencies, and to easily update them when new versions are
released.

## xpm CLI commands

- [`xpm`]({{ site.baseurl }}/xpm/cli/)
- [`xpm init`]({{ site.baseurl }}/xpm/cli/init/)
- [`xpm install`]({{ site.baseurl }}/xpm/cli/install/)
- [`xpm link`]({{ site.baseurl }}/xpm/cli/link/)
- [`xpm list`]({{ site.baseurl }}/xpm/cli/list/)
- [`xpm run`]({{ site.baseurl }}/xpm/cli/run/)
- [`xpm uninstall`]({{ site.baseurl }}/xpm/cli/uninstall/)

Planned:

- `xpm outdated`
- `xpm update`
- `xpm cache`

For publishing and other common operation, use **npm**:

- [`npm version`](https://docs.npmjs.com/cli/v8/commands/npm-version/)
- [`npm publish`](https://docs.npmjs.com/cli/v8/commands/npm-publish/)
- [`npm pack`](https://docs.npmjs.com/cli/v8/commands/npm-pack/)
- [`npm deprecate`](https://docs.npmjs.com/cli/v8/commands/npm-deprecate/)
- [`npm publish`](https://docs.npmjs.com/cli/v8/commands/npm-unpublish/)
- etc...

## Configuring xpm

- [folders]({{ site.baseurl }}/xpm/folders/) - folder structures used by xpm
- files
  - [`package.json`]({{ site.baseurl }}/xpm/files/package.json/)

## License

The original content is released under the
[MIT License](https://opensource.org/licenses/MIT), with all rights reserved to
[Liviu Ionescu](https://github.com/ilg-ul).

The design is heavily influenced by the npm application,
**Copyright (c) npm, Inc. and Contributors**, Licensed on the terms of
**The Artistic License 2.0**.

## Note

The **xpm** tool is currently _work in
progress_ and should be used with caution.
