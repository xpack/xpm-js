[![npm (scoped)](https://img.shields.io/npm/v/xpm.svg)](https://www.npmjs.com/package/xpm/)
[![license](https://img.shields.io/github/license/xpack/xpm-js.svg)](https://github.com/xpack/xpm-js/blob/master/LICENSE)
[![Standard](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com/)
[![Actions Status](https:/github.com/xpack/xpm-js/workflows/CI%20on%20Push/badge.svg)](https://github.com/xpack/xpm-js/actions/)
[![GitHub issues](https://img.shields.io/github/issues/xpack/xpm-js.svg)](https://github.com/xpack/xpm-js/issues/)
[![GitHub pulls](https://img.shields.io/github/issues-pr/xpack/xpm-js.svg)](https://github.com/xpack/xpm-js/pulls/)

# Maintainer info

This page complements the developer page and documents the
maintenance procedures related to making releases for the
`xpm` module.

## Prepare the release

Before making the release, perform some checks and tweaks.

### Update npm packages

- `npm outdated`
- `npm update` or edit and `npm install`
- repeat and possibly manually edit `package.json` until everything is
  up to date

### Check Git

In this Git repo:

- in the `develop` branch
- push everything
- if needed, merge the `master` branch

### Determine the next version

Use the semantic versioning semantics.

Edit `package.json` to this version suffixed by `-pre`.

### Fix possible open issues

Check GitHub issues and pull requests:

- in <https://github.com/xpack/xpm-js/milestones>
add a new milestone like `0.10.6` (without `v`)
- <https://github.com/xpack/xpm-js/issues/>

### Update versions in READMEs

- update version in `README.md`
- update version in `README-DEVELOPER.md`
- update version in `README-MAINTAINER.md`

### Update help text

In `README.md`, update the `xpm --help` text.

## Update `CHANGELOG.md`

- check the latest commits `npm run git-log`
- open the `CHANGELOG.md` file
- check if all previous fixed issues are in
- commit with a message like _prepare v0.10.6_

## Prepare a new blog post with the release

In the `xpack/web-jekyll` GitHub repo:

- select the `develop` branch
- add a new file to `_posts/releases/xpm`
- name the file like `2021-01-28-xpm-v0-10-0-released.md`
- name the post like: **xPack xpm v0.10.6 released**
- update the `date:` field with the current date
- update the **Changes** sections

If any, refer to closed
[issues](https://github.com/xpack/xpm-js/issues/)
as:

```console
- [#1] ...
```

- commit with a message like **xPack xpm v0.10.6 release**
- push
- wait for CI job to complete

Check if the page shows at:

- <https://xpack.github.io/web-preview/news/>

### Publish to npmjs.com

- select the `develop` branch
- commit everything
- `npm run fix`
- commit all changes
- `npm run test-coverage`
- check the latest commits `npm run git-log`
- `npm run pack`; check the list of packaged files, possibly
  update `.npmignore`
- `npm version patch` (bug fixes), `npm version minor` (compatible API
  additions), `npm version major` (incompatible API changes)
- push all changes to GitHub; this should trigger CI
- **wait for CI tests to complete**
- check <https://github.com/xpack/xpm-js/actions/>
- `npm publish --tag next` (use `--access public` when publishing for the first time)

Check if the version is present at
[xpm Versions](https://www.npmjs.com/package/xpm?activeTab=versions).

Test it with:

```bash
npm install --global xpm@next
```

### Change tag to latest

When stable:

- `npm dist-tag ls xpm`
- `npm dist-tag add xpm@0.10.6 latest`
- `npm dist-tag ls xpm`

### Merge into `master`

In this Git repo:

- select the `master` branch
- merge `develop`
- push all branches

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
- paste the release name like **xPack xpm v0.10.6 released**
- paste the link to the Web page
  [release](https://xpack.github.io/xpm/releases/)
- click the **Tweet** button
