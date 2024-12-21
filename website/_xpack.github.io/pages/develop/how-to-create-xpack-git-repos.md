---
title: How to create a new xPack Git repository
permalink: /develop/how-to-new-git/

comments: true

date: 2019-07-09 17:48:00 +0300

---

## Overview

The technical definition of an xPack is _a folder which includes a
package.json file with some minimal content_
([full definition]({{ site.baseurl }}/intro/));
it does not require
any special structure for the folders or for the version-control system,
if any.

### Projects with 3rd party content

The first thought is that xPacks, as a new technology,
will be used for new projects,
with original content, so, in principle, these projects can be created
to have any structure.

In reality there are lots of existing 3rd party
software projects, each using its specific structure, and migrating them to
xPacks may add some maintenance burden to keep them in sync with the
originals.

### The `xpack` branch and three-way merging

One way to reduce the maintenance burden of source xPacks is to use the
[three-way merge](https://en.wikipedia.org/wiki/Merge_(version_control)#Three-way_merge)
feature of Git and a separate branch to accommodate the xPack specific changes.

This method does not require any changes to the original project, which can
keep its original structure, with its original branches, regardless
their names.

The only requirement is to create a new branch (preferably named `xpack`)
and to keep the changes on it; thus the main branch (probably `master`) can
easily track the upstream repository, while the xPack specific changes
continue to be developed using the `xpack` branch; from time to time the
main branch can be merged into the `xpack` branch and things kept in sync.

{% include note.html content="The xPack tools do not require and
do not enforce the use of a branch named `xpack`, this is only
a recommendation." %}

## Create a source library xPacks with 3rd party content

### Projects without a public repository

If the 3rd party project does not use a public repository,
it is necessary to create one.

For projects distributed as archives, to simplify maintenance,
it is recommended to reconstruct the history in a separate branch
(like `originals`) by adding commits with the content of each released
archive.

Follow the steps to create a new repository, and watch for the extra steps to
create the `originals` branch.

### Projects with existing Git

If the 3rd party project uses a public Git:

#### Fork

With the GitHub web interface:

- select the upstream project
- fork it, for example in the
  [3rd party xPacks](https://github.com/xpack-3rd-party) organization)
- preferably rename it:
  - add a prefix with the name of the original organization
  - add the `-xpack` suffix
  - click the **Rename** button
- select the **Settings** tab
  - in the **Features** section
    - disable **Wikis**
    - enable **Issues**
    - enable **Sponsorship** (if needed)
    - disable **Projects**
    - enable **Discussions**, Set up discussions
  - quit the **Settings** tab (there is no Save)

#### Clone locally

Clone the project locally on the development machine:

With the GitHub web interface:

- open the forked project
- select the **Code** tab
- click the **Clone or download** button
- click Open with GitHub Desktop; save to a folder like
  `xpack-3rd-party/<project>-xpack.git`

#### Identify the latest release

With VS Code, Fork or Git:

- identify the stable branch
- identify the latest release tag
- reset the current branch to the tagged commit

#### Create the `xpack` branch

With VS Code, Fork or Git:

- select the tagged commit
- create new branch `xpack`
- switch to it

Continue from the **Common steps** section below.

## Create a new xPack repository

If the project does not already have a forked repository, create a new
Git project.

{% include note.html content="For consistency reasons, it is
recommended for the new xPacks, even if
they do not include 3rd party content, to use the `xpack` branch instead
of the `master` branch." %}

{% include warning.html content="Do not use a GitHub Template project!
The easiest way to create new projects would be to use an existing
GitHub Template project. Unfortunately, at the time of testing,
the repositories resulted
by using this method had weird histories,
like disconnected commits; until this will be fixed,
this method is not recommended." %}

### Create the Git project

The following steps apply to GitHub. Adjust them for other Git hosting sites.

The editor of choice is Visual Studio Code (VS Code), but you can use
any editor you like; just be sure that on Windows it does not mess the
line terminators.

{% include tip.html content="To easily identify the project as
an xPack, it is recommended to suffix the project name with '-xpack'." %}

With a browser, at GitHub, select your account or organisation.
(for the purposes of this project, here are some organisations that use xPacks:
[xPacks Dev Tools](https://github.com/xpack-dev-tools/),
[µOS++](https://github.com/micro-os-plus/),
[3rd party source xPacks](https://github.com/xpack-3rd-party/)).

- click the green **New** button to create a new repository
  - enter **Repository name**; use all lowercase and hyphens to
    separate words (not underscores!); preferably suffix the name with `-xpack`
  - enter **Description** (like _A source xPack with ..._ or _A binary xPack with ..._; no ending dot!)
  - select **Public**
  - enable **Initialize this repository with a README**
  - select **Add .gitignore: Node**
  - select **Add a license: MIT License**; this is the license of
    choice for xPacks, but any other license of your choice is also ok
  - click the **Create Repository** button
- select the **Settings** tab
  - in the **Features** section
    - disable **Wikis**
    - enable **Sponsorship** (if needed)
    - disable **Projects**
    - enable **Discussions**
  - quit the **Settings** tab (there is no Save)

### Clone the repository to a local folder

With the GitHub web interface:

- open the project
- select the **Code** tab
- click the **Clone or download** button; this will open a
  small **Clone to HTTPS** window
- click the **Copy** icon, or explicitly copy the URL
- in a terminal window, in a place of our choice, create a folder
  to store all xPacks (for example it can be named `xPacks`):

```sh
mkdir -p xPacks
cd xPacks
git clone https://github.com/<user>/<project>.git <project>.git
```

### Edit the master `README.md` file

As mentioned in the introduction,
although for original xPacks there are no constraints on how to
organise the branches, for consistency with xPacks that use 3rd
party content, it is recommended to use an `xpack` branch.

In this case, to warn users about this configuration, edit
the `README.md` file; keep the header line and replace the content with:

```text
This project does not use the `master` branch, please
switch to the `xpack` branch to get the project files.
```

With VS Code, Fork or Git:

- stage the `README.md` file
- commit with the following message: **README: 'no master' notice**

### Edit the `LICENSE[-XPACK]` file

The automatically generated `LICENSE` file already includes the
user name as the copyright owner. When the project is owned by
an organisation, the name refers to the organisation. Probably
this is not exactly what you need, and you might prefer to have
your name in the copyright notice.

Check and possibly adjust to match your `LICENSE` requirements.

```text
MIT License

Copyright (c) 2022 Liviu Ionescu

Permission is hereby granted, free of charge, to any person obtaining a copy
...
```

With VS Code, Fork or Git:

- for 3rd party content, rename it to `LICENSE-XPACK`
- stage the file
- commit with the following message: **LICENSE: update copyright owner**

### Create the `originals` branch

For a 3rd party project that does not use a
public Git project, but is distributed only as release archives, to
keep track of the changes it is recommended to
recreate the Git with the original
code on a separate branch, like `originals`, and later treat it
as the `master` branch.

With each upstream release, while on the `originals` branch,
fully remove the content and extract the newly released archive.

Then merge the update `originals` branch into the `xpack` branch.

In case the archive contains binary files, or other large files considered
not essential for the xPack distribution, add them to `.gitignore`.

Add/Edit the README file to add:

```text
This branch is used to recreate the 3rd party project history
from release archives.
```

Commit with the following message: **README: notice for 3rd party content**

### Create the `xpack` branch

With VS Code, Fork or Git:

- select the `master` branch
- create new branch `xpack`
- switch to it

## Common steps

### Edit the `.gitignore` file

With VS Code:

- add the following to `.gitignore`:

```text

# added for xPack

.vscode/c_cpp_properties.json

# xpm
xpacks/
build*/

/*.tgz

# Windows
Thumbs.db

# macOS
.DS_Store

# end
```

- for Eclipse C/C++ projects you can include:

```text
# Eclipse
.settings/
Debug/
Release/
```

With VS Code, Fork or Git:

- stage the `.gitignore` file
- commit with the following message: **.gitignore: add xPack specifics**

### Add the `.npmignore` file

With VS Code, create a new file with:

```text

.DS_Store
.git/
.github/
.gitignore
.gitmodules
.clang-*
.cmake-format

.vscode/

patches/
pkgconfig/
scripts/
test*/
build*/
ci/
docs/
example*/

xpacks/
node_modules/

/*.tgz

README-*
LICENSE-*
CONTRIBUTING**
```

- update the content until `npm pack` shows only the desired content
- stage the `.npmignore` file
- commit with the following message: **.npmignore preliminary content**

### Publish all branches

With VS Code, Fork or Git:

- push all local branches (`master`, `xpack` and maybe the `originals`)

### Change the default branch to `xpack`

With the GitHub web interface:

- open the project
- select the **Settings** tab
- select the **Branches** grouping
- change the **Default branch** to `xpack`
- click the **Update** button
- click the **I understand, update the default branch** confirmation window

### Create the npm/xpm `package.json`

Select the `xpack` branch.

Use `xpm init` and later edit the `package.json`.

```console
$ cd <project>.git
$ xpm init --verbose
$ cat package.json
{
  "name": "@<scope>/<project-name>",
  "version": "0.1.0",
  "description": "A source/binary xPack with <your-description-here>",
  "main": "",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/<user-id>/<project-name>-xpack.git"
  },
  "bugs": {
    "url": "https://github.com/<user-id>/<project-name>-xpack/issues"
  },
  "homepage": "https://github.com/<user-id>/<project-name>-xpack",
  "keywords": [
    "xpack"
  ],
  "author": {
    "name": "<author-name>",
    "email": "<author-email>",
    "url": "<author-url>"
  },
  "license": "MIT",
  "config": {},
  "dependencies": {},
  "devDependencies": {},
  "xpack": {}
}
$
```

Open `package.json` with VS Code:

- as **name** enter the scope (your npm account name or one of
  your npm organisations) and the project name, without `-xpack.git`
  (like `@micro-os-plus/diag-trace`, `@xpack-dev-tools/ninja-build`,
  `@xpack-3rd-party/arm-cmsis-core`)
- as **version**, enter `0.1.0` if the project is in early development,
  or accept 1.0.0 for the first stable release; generally use the
  [semver](https://semver.org) conventions
- as **description**, use the same string as the GitHub project description
- in **scripts**, check and possibly remove a trailing comma,
- as **url** and **homepage**, use the actual project Git URL
- as **author**, enter full data, like

```json
{
  "author": {
    "name": "Liviu Ionescu",
    "email": "ilg@livius.net",
    "url": "https://github.com/ilg-ul/"
  }
}
```

- as **license**, enter the [SPDX](https://spdx.org/licenses/) license
  identifier (like `MIT`); if the license is not a standard one, provide
  the text in a `LICENSE` file and update the JSON to read:

```json
{ "license": "SEE LICENSE IN <filename>" }
```

- if the package is inspired by other existing code, enter the author
  as the first contributor, for example:

```json
{
  "contributors": [
    {
      "name": "SEGGER Microcontroller GmbH & Co. KG",
      "email": "support@segger.com",
      "url": "https://www.segger.com/",
      "git": "https://github.com/boost-ext/ut.git",
      "license": "..."
    }
  ],
  "...": "..."
}
```

Update the list of npm scripts:

```json
{
  "scripts": {
    "npm-install": "npm install",
    "pack": "npm pack",
    "version-patch": "npm version patch",
    "version-minor": "npm version minor",
    "postversion": "git push origin --all && git push origin --tags",
    "git-log": "git log --pretty='%cd * %h %s' --date=short"
  },
  "...": "..."
}
```

### Commit the initial package file

With VS Code, Fork or Git:

- stage the `package.json`
- commit with the following message: **package.json: v0.1.0**

### Edit the `README.md` file with actual content

With the editor of your choice:

- start with some badges
- as headers, you can start with H1, the npmjs server now shows it
- after the main title, copy the project description
- explain how to install the xPack
  (like `xpm install --global @scope/name`)
- in the License section, use something like

```markdown
### License

The original content is released under the
[MIT License](https://opensource.org/licenses/MIT), with all rights reserved to
[Liviu Ionescu](https://github.com/ilg-ul/).
```

With VS Code, Fork or Git:

- stage the `README*.md` files
- commit with the following message: **README: preliminary content**

### Add README-MAINTAINER[-XPACK].md

Create or copy/paste from a similar project, or from the template available
in the `build-helper-xpack` project.

For 3rd party projects, suffix the name with `-XPACK`.

With VS Code, Fork or Git:

- stage the `README-MAINTAINER.md` files
- commit with the following message: **README-MAINTAINER: preliminary content**

### Add a CHANGELOG[-XPACK].md file

A possible content:

```md
# Change & release log

Releases in reverse chronological order.

Please check
[GitHub](https://github.com/micro-os-plus/micro-test-plus-xpack/issues/)
and close existing issues and pull requests.

## 2022-01-03

* v2.0.5
```

With VS Code, Fork or Git:

- stage the `CHANGELOG.md` files
- commit with the following message: **CHANGELOG: preliminary content**

### Add .github/workflows/*

Copy/paste files like:

- `CI.yml`
- `test-all.yml`

- commit with the following message: **.github/workflows preliminary content**

For projects with an upstream Git, disable existing workflows.

### Publish the initial version to GitHub

With VS Code, Fork or Git:

- click the **Push** button (to push the `xpack` branch to the server)

### Add more content

- add project files
- copy/paste the `tests[-xpack]` folder

### Commit the initial content

With VS Code, Fork or Git:

- stage the new files
- commit with the following message: **add initial content**

### Create the `xpack-develop` branch

With VS Code, Fork or Git:

- select the `xpack` branch
- create the `xpack-develop` branch

Generally work in the `xpack-develop` branch and only when ready merge it
to `master`.

### Publish the branches to GitHub

With VS Code, Fork or Git:

- **Push** all branches (or at least `xpack` and `xpack-develop`)

### Publish the initial version to the npmjs public registry

- check the latest commits `npm run git-log`
- update `CHANGELOG.md`; commit with a message like
  _CHANGELOG: prepare npm v1.10.0-1.1_
- `npm version v1.10.0-1.1`; the first 4 numbers are the same as the
  GitHub release; the fifth number is the npm specific version
- `npm pack` and check the content of the archive, which should list
only the desired content and
the `package.json`, the `README.md`, `LICENSE` and `CHANGELOG.md` files
- push all changes to GitHub
- `npm publish --access public --tag next`

When the release is considered stable, promote it as `latest`. For example:

- `npm dist-tag ls @xpack-dev-tools/ninja-build`
- `npm dist-tag add @xpack-dev-tools/ninja-build@1.10.0-1.1 latest`
- `npm dist-tag ls @xpack-dev-tools/ninja-build`

### Bump version

In general, depending on the _disruption_ degree, chose one of the following:

```sh
cd <project>.git
npm version patch
npm version minor
npm version major
```

With VS Code, Fork or Git:

- **Push** the commits
