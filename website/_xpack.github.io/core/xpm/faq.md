---
title: FAQ
permalink: /xpm/faq/

comments: true
toc: false

date: 2019-06-28 11:03:00 +0300

---

### The `xpm` Frequently Asked Questions

{% capture question_60 %}
`zsh: command not found: xpm`
{% endcapture %}

{% capture answer_60 %}
The location where npm installs global modules got lost; most probably
you recently switched to `zsh` and forgot to migrate the shell startup
to `.zprofile`.

Copy the `PATH` setting from your previous shell startup file to
`.zprofile`.
{% endcapture %}

{% capture question_50 %}
Why xpm manages configurations, instead of limiting itself to manage
dependencies/packages, as the name implies?
{% endcapture %}

{% capture answer_50 %}
In the most generic use case, configurations can have specific dependencies,
for example different configurations can use different architecture
toolchains, or, in test cases, different versions of the same
toolchain.

Thus, defining configurations in `package.json` is probably the
best choice, otherwise both xpm and the build tools must handle
multiple files with partly redundant content.
{% endcapture %}

{% capture question_40 %}
`static async start () ... SyntaxError: Unexpected identifier`
{% endcapture %}

{% capture answer_40 %}
This problem occurs usually on GNU/Linux, and is caused by trying to use
the outdated version of Node available in the distribution, which
does not understand the `async` keyword.

Errors may look like:

```console
$ xpm -v
/home/ilg/opt/npm/lib/node_modules/xpm/node_modules/@ilg/cli-start-options/lib/cli-application.js:150
  static async start () {
               ^^^^^
SyntaxError: Unexpected identifier
    at exports.runInThisContext (vm.js:53:16)
    at Module._compile (module.js:374:25)
    at Object.Module._extensions..js (module.js:417:10)
    at Module.load (module.js:344:32)
    at Function.Module._load (module.js:301:12)
    at Module.require (module.js:354:17)
    at require (internal/module.js:12:17)
    at Object.<anonymous> (/home/ilg/opt/npm/lib/node_modules/xpm/node_modules/@ilg/cli-start-options/index.js:55:24)
    at Module._compile (module.js:410:26)
    at Object.Module._extensions..js (module.js:417:10)
```

The solution is to install the most recent LTS version of Node, as
described in the [prerequisites]({{ site.baseurl }}/install/) page.
{% endcapture %}

{% capture question_30 %}
`error: Cannot read property 'path' of null`
{% endcapture %}

{% capture answer_30 %}
This problem is specific to Windows and is caused by aggressive antivirus programs.

On Windows, binary xPacks are .zip archives containing .exe files;
some aggressive antivirus programs may quarantine those files, or
even modify the content of the archives, affecting the checksum and
thus preventing the packages to be installed.

Errors may look like:

```console
Downloading https://github.com/gnu-mcu-eclipse/qemu/releases/download/v2.8.0-4-20190211/gnu-mcu-eclipse-qemu-2.8.0-4-20190211-0633-win64.zip...
{ Error: sha256-p3CgzXJt4zi5g0kxQXlOpss3Xu5Yy+Zv8HXWXkUdg6g= integrity checksum failed when using sha256: wanted sha256-p3CgzXJt4zi5g0kxQXlOpss3Xu5Yy+Zv8HXWXkUdg6g= but got sha512-k1s9UW6Zb20llIuopUwbf3D38OP1F+Nkgf3wGWwsXPwoQfhuiR89+VF3Rrf7YF20fN3tG4/3jZSC3apiHbQ6NA== sha256-ABnfxLMtY8E5KqJkrtIlPB4ML7CSFvjizCabv7i7SbU=. (9 bytes)
...
Extracting 'gnu-mcu-eclipse-qemu-2.8.0-4-20190211-0633-win64.zip'...
error: Cannot read property 'path' of null
```

The solution is to configure the antivirus program to be less aggressive,
at least for files in the
`AppData\Roaming\xPacks` and `AppData\Local\Caches\xPacks` folders.

If this is not possible, temporarily disable the antivirus program. Or switch
to a better operating system.
{% endcapture %}

{% capture question_20 %}
Cannot find the `Library` folder (on macOS)
{% endcapture %}

{% capture answer_20 %}
Yes, due to an unfortunate Apple decision,
this folder is hidden for regular browsing in Finder.

To make it back visible, use:

```sh
/usr/bin/chflags nohidden ~/Library
xattr -d com.apple.FinderInfo ~/Library
```

{% endcapture %}

{% capture question_10 %}
Cannot find the `.content` folder (on macOS)
{% endcapture %}

{% capture answer_10 %}
Yes, due to an unfortunate Apple decision,
all folders starting with a dot are hidden for regular browsing in Finder.

Fortunately there is a workaround for this:

```console
cmd+shift+'.'
```

This keyboard shortcut works like a toggle, using it once makes files
starting with dot visible,
using it again reverts to hiding them.
{% endcapture %}

{% include div-panel-group.html %}
{% include faq-panel.html id="collapse-60" question=question_60 answer=answer_60 %}
{% include faq-panel.html id="collapse-50" question=question_50 answer=answer_50 %}
{% include faq-panel.html id="collapse-40" question=question_40 answer=answer_40 %}
{% include faq-panel.html id="collapse-30" question=question_30 answer=answer_30 %}
{% include faq-panel.html id="collapse-20" question=question_20 answer=answer_20 %}
{% include faq-panel.html id="collapse-10" question=question_10 answer=answer_10 %}
{% include div-end.html %}
