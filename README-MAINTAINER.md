[![npm (scoped)](https://img.shields.io/npm/v/xpm.svg)](https://www.npmjs.com/package/xpm/)
[![license](https://img.shields.io/github/license/xpack/xpm-js.svg)](https://github.com/xpack/xpm-js/blob/master/LICENSE)
[![Standard](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com/)
[![CI on Push](https://github.com/xpack/xpm-js/actions/workflows/node-ci.yml/badge.svg)](https://github.com/xpack/xpm-js/actions/)
[![GitHub issues](https://img.shields.io/github/issues/xpack/xpm-js.svg)](https://github.com/xpack/xpm-js/issues/)
[![GitHub pulls](https://img.shields.io/github/issues-pr/xpack/xpm-js.svg)](https://github.com/xpack/xpm-js/pulls/)

# Maintainer info

This page complements the developer page and documents the
maintenance procedures related to making releases for the
`xpm` module.

## Prepare the release

Before making the release, perform some checks and tweaks.

### Switch to node 14

For backward compatibility with previous nodes, especially the
`package-lock.json`, build the release with **node 14.x**,
**npm 6.x** (`"lockfileVersion": 1`).

```sh
nvm use 14
```

Restart code in the new environment.

### Update npm packages

- `npm outdated`
- `npm update` or edit and `npm install`
- repeat and possibly manually edit `package.json` until everything is
  up to date

Notes:

- engine: Node.js >=14.13.1 || >=15.3.0 || >=16.0.0
- @nodecli/arborist: 6.3.0
- tap: 16.3.8
- pacote: 15.2.0
- cacache must be in sync with the one used by
  [pacote](https://github.com/npm/pacote/blob/main/package.json)

### Check Git

In this Git repo:

- in the `develop` branch
- push everything
- if needed, merge the `master` branch

### Determine the next version

Use the semantic versioning semantics.

Edit `package.json` to this version suffixed by `-pre` (like `0.16.5-pre`).

### Update versions in READMEs

- update version in `README.md`
- update version in `README-DEVELOPER.md`
- update version in `README-MAINTAINER.md`

### Update help text

In `README.md`, update the `xpm --help` text.

### Fix possible open issues

Check GitHub issues and pull requests:

- in <https://github.com/xpack/xpm-js/milestones>
add a new milestone like `0.16.5` (without `v`)
- <https://github.com/xpack/xpm-js/issues/>

## Update `CHANGELOG.md`

- check the latest commits `npm run git-log`
- open the `CHANGELOG.md` file
- check if all previous fixed issues are in
- add an entry with the new version _* v0.16.5 released_
- commit with a message like _prepare v0.16.5_

## Prepare a new blog post with the release

In the `xpack/web-jekyll` GitHub repo:

- select the `develop` branch
- add a new file to `_posts/releases/xpm`
- name the file like `2021-12-28-xpm-v0-11-2-released.md`
- name the post like: **xPack xpm v0.16.5 released**
- update the `date:` field with the current date
- update the **Changes** sections

If any, refer to closed
[issues](https://github.com/xpack/xpm-js/issues/)
as:

```console
- [#1] ...
```

- commit with a message like **xPack xpm v0.16.5 release**
- push
- wait for the CI job to complete (<https://github.com/xpack/web-jekyll/actions/>)

Check if the page shows at:

- <https://xpack.github.io/web-preview/news/>

### Publish to npmjs.com

- select the `develop` branch
- commit everything
- `npm run fix`
- commit all changes
- `npm run test`
- check the latest commits `npm run git-log`
- `npm run pack`; check the list of packaged files, possibly
  update `.npmignore`
- `npm version patch` (bug fixes), `npm version minor` (compatible API
  additions), `npm version major` (incompatible API changes)
- push all changes to GitHub; this should trigger CI
- **wait for CI tests to complete**
- check <https://github.com/xpack/xpm-js/actions/>
- `npm publish --tag next` (use `npm publish --access public` when publishing for the first time)

Check if the version is present at
[xpm Versions](https://www.npmjs.com/package/xpm?activeTab=versions).

Test it with:

```bash
npm install --location=global xpm@next
```

### Change tag to latest

When stable:

- `npm dist-tag ls xpm`
- `npm dist-tag add xpm@0.16.5 latest`
- `npm dist-tag ls xpm`

### Merge into `master`

In this Git repo:

- select the `master` branch
- merge `develop`
- push all branches

### Close milestone

In the issues milestones, close 0.16.5:

- <https://github.com/xpack/xpm-js/milestones>

### Update the blog post to release

In the `xpack/web-jekyll` GitHub repo:

- select the `master` branch
- merge `develop`
- push both branches
- wait for CI job to complete

Check if the page shows at:

- <https://xpack.github.io/news/>

## Share on Twitter

- in a separate browser windows, open [TweetDeck](https://tweetdeck.twitter.com/)
- using the `@xpack_project` account
- paste the release name like **xPack xpm v0.16.5 released**
- paste the link to the Web page
  [release](https://xpack.github.io/xpm/releases/)
- click the **Tweet** button
