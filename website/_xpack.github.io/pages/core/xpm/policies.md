---
title: xpm Policies
permalink: /xpm/policies/

summary: Compatibility policies.
keywords:
  - xPack
  - package
  - manager
  - compatibility
  - policy

comments: true
toc: false

date: 2022-08-15 10:38:00 +0300

---

## Overview

Similarly to CMake, **xpm** policies are used to preserve backward compatible
behaviour across multiple releases.

Newer **xpm** releases are able to adjust some
functionality to match that of an older release, based on the
value of the `xpack.minimumXpmRequired` property in `package.json`.

When such policies are used, warnings are issued to inform the
developers about the deprecated features, and give them time to update
the packages.

The following policies are available (in reverse chronological order):

## Policies introduced by xpm 0.14

- [0001]({{ site.baseurl }}/xpm/policies/0001/) -
  share npm dependencies
