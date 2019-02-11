

# Additions to package.json

Generally, for compatibility reasons, there should be no 
additions/changes in `package.json`, except the `xpack` object.

## `xpack`

Type: object.

Properties:

- `folderName`
- `directories`

## `folderName`

Type: string

By default, when xPacks are installed by `xpm`, a folder derived
from the package name is used. If the package is scoped, the scope is
used to prefix the name. For example, an xPack named `@micro-os-plus/startup`
will be installed in `micro-os-plus-startup`.

The optional `folderName` property can be used to configure a custom
name for the folder where the xPack is installed.

Example:

```json
{
  "...": "...",
  "xpack": {
    "folderName": "my-special-name"
  }
}
```

## `directories` 

Type: object.

This definition is similar to the one used by `npm`, but adds different
names and allows for arrays of folders.

Properties:

- `xpacks`: the location where `xpm` will install dependent xPacks; the 
default is `./xpacks`;
- `src`: the location of folders with source files; the default is `./src`;
- `include`: the location of folders with include files; the default 
is `./include`;

Example:

```json
{
  "...": "...",
  "xpack": {
    "directories": {
      "xpacks": "./my-packs",
      "src": [ "./src", "./libs/src" ],
      "include": [ "./include", "./libs/include" ]
    }
  }
}
```