---
title: package.json
permalink: /xpm/files/package.json/

comments: true

date: 2019-07-02 00:36:00 +0300

---

The [`package.json`](https://docs.npmjs.com/files/package.json) file is
basically the same as for npm, with some
extensions.

## The mandatory `xpack` property

To identify a npm package as an xPack, it must have an `xpack`
property, even empty:

```json
{
  "name": "my-awesome-project",
  "version": "1.0.0",
  "xpack": {}
}
```

Although not mandatory, it is also recommended to add an `xpack` keyword,
to help find the xPacks in the public repository.

```json
{
  "name": "my-awesome-project",
  "version": "1.0.0",
  "keywords": [
    "xpack",
    "..."
  ],
  "xpack": {}
}
```

## The `binaries` property

Binary xPacks do not include the binaries, they include only URLs where
to download the binaries from, and checksums to validate the downloads.

These information are stored in the `xpack` property of `package.json`.

```json
{
  "name": "@xpack-dev-tool/openocd",
  "version": "0.10.0-12.1",
  "description": "A binary xPack with OpenOCD",
  "...": "...",
  "xpack": {
    "binaries": {
      "destination": "./.content",
      "baseUrl": "https://github.com/xpack-dev-tools/openocd-xpack/releases/download/v0.10.0-14",
      "skip": 1,
      "platforms": {
        "darwin-x64": {
          "sha256": "30917a5c6f60fcd7df82b41dcec8ab7d86f0cea3caeaf98b965b901c10a60b39",
          "fileName": "xpack-openocd-0.10.0-14-darwin-x64.tar.gz"
        },
        "linux-arm64": {
          "sha256": "97a188ca8ba32498c80b1ca3c8831cbbaf01c6f935fb5bcb66144f1fbd432106",
          "fileName": "xpack-openocd-0.10.0-14-linux-arm64.tar.gz"
        },
        "linux-arm": {
          "sha256": "8a8025cfb07dbf203d9434179e84b748f8381213df6d53272e5c580fbe113896",
          "fileName": "xpack-openocd-0.10.0-14-linux-arm.tar.gz"
        },
        "linux-x32": {
          "sha256": "bd4a7e88d86d216b738a096ffa8bfe5ec4035ad17801d5595e45779363ff5974",
          "fileName": "xpack-openocd-0.10.0-14-linux-x32.tar.gz"
        },
        "linux-x64": {
          "sha256": "185c070f9729cf38dca08686c2905561c07a63c563e5bc7a70e045f2a1865c11",
          "fileName": "xpack-openocd-0.10.0-14-linux-x64.tar.gz"
        },
        "win32-x64": {
          "sha256": "1fb26bbcfd65dbabe747ce3c8467a1f1cece7253bde4a95de13c2267d422ed8b",
          "fileName": "xpack-openocd-0.10.0-14-win32-x64.zip"
        }
      }
    },
    "bin": {
      "openocd": "./.content/bin/openocd"
    }
  }
}
```

The supported platforms are:

- `linux-arm` - Arm GNU/Linux 32-bit (since 0.6.0)
- `linux-arm64` - Arm GNU/Linux 64-bit (since 0.6.0)
- `linux-x86` (deprecated)
- `linux-x32` (deprecated)
- `linux-ia32` - Intel GNU/Linux 32-bit (since 0.6.0; deprecated)
- `linux-x64` - Intel GNU/Linux 64-bit
- `darwin-x64` - macOS 64-bit
- `win32-x86` (deprecated)
- `win32-x32` (deprecated)
- `win32-ia32` - Windows 32-bit (since 0.6.0; deprecated)
- `win32-x64` - Windows 64-bit

{% include note.html content="The names are exactly the Node.js
`process.platform` and `process.arch`." %}

The files are downloaded from `<baseUrl>/<fileName>`. The common
use case is to have all files in the same folder, and in this case it is
enough to define `baseUrl` once, but it is also possible to define it
for each platform, allowing to download files from different folders/servers.

The archives are unpacked in the `destination` folder, defined as relative
to the package root folder (usually `./.content`).

To shorten the paths, a number of the initial levels are skipped (`skip`).

When installing packages as dependencies of an xPack,
after the archive is unpacked, links to each binaries defined
in the `bin` section are created in the `xpacks/.bin` folder.
On Windows, where soft links to files are problematic, `.cmd`
stubs are created.

{% include important.html content="To accommodate for the `.cmd` stubs,
programs launching the executables should do this via a `cmd.exe` shell." %}

## The `properties` property

TBD

## The `actions` property

TBD

## The `configurations` property

TBD
