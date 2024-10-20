#!/usr/bin/env bash

# -----------------------------------------------------------------------------
# Safety settings (see https://gist.github.com/ilg-ul/383869cbb01f61a51c4d).

if [[ ! -z ${DEBUG} ]]
then
  set ${DEBUG} # Activate the expand mode if DEBUG is anything but empty.
else
  DEBUG=""
fi

set -o errexit # Exit if command failed.
set -o pipefail # Exit if pipe failed.
set -o nounset # Exit if variable not set.

# Remove the initial space and instead use '\n'.
IFS=$'\n\t'

# -----------------------------------------------------------------------------
# Identify the script location, to reach, for example, the helper scripts.

script_path="$0"
if [[ "${script_path}" != /* ]]
then
  # Make relative path absolute.
  script_path="$(cd "$(dirname "$0")"; pwd -P)/$(basename "$0")"
fi

script_name="$(basename "${script_path}")"

script_folder_path="$(dirname "${script_path}")"
script_folder_name="$(basename "${script_folder_path}")"

# =============================================================================
# Inits and validations.

# echo $@
# set -x

# Explicit display of failures.
# Return 255, required by `xargs` to stop when invoked via `find`.
function trap_handler()
{
  local from_file="$1"
  shift
  local line_number="$1"
  shift
  local exit_code="$1"
  shift

  echo "FAIL ${from_file} line: ${line_number} exit: ${exit_code}"
  return 255
}

# $1: path of input file
# $2: path of destination folder

# The source file path.
from_path="${1}"

# The destination file name. Change `.md` to `.mdx`.
to_path="${2}/$(basename "${from_path}" | sed -e 's|-liquid||')x"

# Used to enforce an exit code of 255, required by xargs.
trap 'trap_handler ${from_path} $LINENO $?; return 255' ERR

if [ -f "${to_path}" ] && [ "${doForce}" == "n" ]
then
  echo "${to_path} already present"
  exit 0
fi

tmp_awk_path="$(mktemp) -t awk"

# -----------------------------------------------------------------------------

if ! grep 'redirect_to:' "${from_path}" 2<&1 >/dev/null
then

  redirected_permalink="$(echo "$(basename "${from_path}")" | sed -e 's|[.]md*||')"
  redirected_permalink="$(echo "${redirected_permalink}" | sed -e 's|^\([0-9][0-9][0-9][0-9]\)-\([0-9][0-9]\)-\([0-9][0-9]\)-|\1/\2/\3/|')"
  redirect_line="redirect_to: https://xpack.github.io/xpm/blog/${redirected_permalink}/"
  echo "${redirect_line}"

  # Add `redirect_to:` after `date:`.

  # Note: __EOF__ is not quoted to allow substitutions here.
  cat <<__EOF__ >> "${tmp_awk_path}"

/^date: / {
  print
  print ""
  print "${redirect_line}"

  next
}

1

__EOF__

  awk -f "${tmp_awk_path}" "${from_path}" >"${from_path}.new" && mv -f "${from_path}.new" "${from_path}"

fi

# -----------------------------------------------------------------------------

mkdir -p "$(dirname ${to_path})"

# Copy from Jekyll to local web.
cp -v "${from_path}" "${to_path}"

# -----------------------------------------------------------------------------
# Get variables from frontmatter.

# Get the value of `date:` to generate it in a higher position.
date="$(grep -e '^date: ' "${to_path}" | sed -e 's|^date:[[:space:]]*||')"

# Get the value of `summary` to generate the first short paragraph.
summary="$(grep -e '^summary: ' "${to_path}" | sed -e 's|^summary:[[:space:]]*||' || true)"
if [ ! -z "${summary}" ] && [ "${summary:0:1}" == "\"" ]
then
  summary="$(echo ${summary} | sed -e 's|^"||' -e 's|"$||')"
fi

description="$(echo ${summary} | sed -e 's| of .*|.|')"
description="$(echo ${description} | sed -e 's|;.*|.|')"
description="$(echo ${description} | sed -e 's|,.*|.|')"

description="$(echo ${description} | sed -e 's|\*\*||g' -e 's|DO NOT USE! ||' -e 's|DEPRECATED: ||' -e 's|  | |g')"

# Get the value of the title to generate seo_title
title=$(grep 'title: ' "${to_path}" | sed -e 's|^title:[ ]*||')

seo_title="${title}"
seo_title="$(echo "${seo_title}" | sed -e 's|The project has a new web site|New web site|')"
seo_title="$(echo "${seo_title}" | sed -e 's|xPack .* v|Version |')"

if false
then
  echo "<<s< $summary >>>"
  echo "<<d< $description >>>"
  echo "<<t< $title >>>"
  echo "<<o< $seo_title >>>"
fi

# -----------------------------------------------------------------------------
# Process the frontmatter.

# fix title: spaces
sed -i.bak -e 's|title:[ ][ ]*|title: |' "${to_path}"

# Remove `date:`, will be generated right after the title.
sed -i.bak -e '/^date:/d' "${to_path}"

# Add mandatory front matter properties (authors, tags, date) after title.

# Note: __EOF__ is not quoted to allow substitutions here.
cat <<__EOF__ > "${tmp_awk_path}"

/^title:/ {
  print

  print "seo_title: ${seo_title}"
  print "description: ${description}"
  print "keywords:"
  print "  - xpack"
  print "  - xpm"
  print "  - release"
  print ""
  print "date: ${date}"
  print ""
  print "authors: ilg-ul"
  print ""
  print "# To be listed in the Releases page."
  print "tags:";
  print "  - releases"
  print ""
  print "# ----- Custom properties -----------------------------------------------------"

  next
}

1

__EOF__

awk -f "${tmp_awk_path}" "${to_path}" >"${to_path}.new" && mv -f "${to_path}.new" "${to_path}"

# Remove `sidebar:`.
sed -i.bak -e '/^sidebar:/d' "${to_path}"

# Remove `summary:`.
sed -i.bak -e '/^summary:/d' "${to_path}"

# Add the yaml end tag after version: and a custom tag for the delete.
s="/version:/ { print; print \"\"; print \"---\"; print \"\"; print \"--e-n-d-f-\"; next } 1"
awk "$s" "${to_path}" >"${to_path}.new" && mv -f "${to_path}.new" "${to_path}"

# Add imports, summary paragraph, truncate and page title
# Note: __EOF__ is quoted to prevent substitutions here.
cat <<'__EOF__' > "${tmp_awk_path}"

BEGIN {
  count = 0
}

/^---$/ {
  count += 1

  print
  if (count == 2) {
    print ""
    print "import {PageMetadata} from '@docusaurus/theme-common';"
    print "import Image from '@theme/IdealImage';";
    print "import CodeBlock from '@theme/CodeBlock';"
__EOF__

if [ ! -z "${summary}" ]
then
# Add summary to post body.

# Note: __EOF__ is not quoted to allow substitutions here.
cat <<__EOF__ >> "${tmp_awk_path}"
    print ""
    print "${summary}"
__EOF__
fi

cat <<'__EOF__' >> "${tmp_awk_path}"
    print ""
    print "<!-- truncate -->"
    print ""
    print "<PageMetadata title={frontMatter.seo_title} />"
  }
  next
}

1

__EOF__

awk -f "${tmp_awk_path}" "${to_path}" >"${to_path}.new" && mv -f "${to_path}.new" "${to_path}"

# Remove extra frontmatter properties.
sed -i.bak -e '/^--e-n-d-f-$/,/^---$/d' "${to_path}"

# -----------------------------------------------------------------------------
# Process the post body.

# https://xpack.github.io/intro/#but-what-are-xpacks

# https://xpack.github.io/xpm/install/
s="s|(https://xpack.github.io/xpm/install/)|(/docs/install/)|"
sed -i.bak -e "${s}" "${to_path}"

# https://xpack.github.io/xpm/
s="s|(https://xpack.github.io/xpm/)|(/)|"
sed -i.bak -e "${s}" "${to_path}"


# Remove the `site.baseurl` from links.
sed -i.bak -e 's|{{ site.baseurl }}||g' "${to_path}"

# Replace `page.` with `frontMatter.` when using variables.
sed -i.bak -e 's|{{[ ]*page[.]\([a-z0-9_]*\)[ ]*}}|{frontMatter.\1}|g' "${to_path}"

# Fix admonition
# Note: __EOF__ is quoted to prevent substitutions here.
cat <<'__EOF__' > "${tmp_awk_path}"

/{% include important.html content="The \*\*xpm\*\* tool is currently _work in progress_ and should be used with caution." %}/ {
  print ":::caution"
  print ""
  print "The **xpm** tool is currently _work in progress_ and should be used with caution."
  print ""
  print ":::"

  next
}

1

__EOF__

awk -f "${tmp_awk_path}" "${to_path}" >"${to_path}.new" && mv -f "${to_path}.new" "${to_path}"

# Fix admonition
# Note: __EOF__ is quoted to prevent substitutions here.
cat <<'__EOF__' > "${tmp_awk_path}"

/{% include note.html content="In the current configuration,/ {
  print ":::note"
  print ""
  print "In the current configuration,"
  print ""
  print ":::"

  next
}

1

__EOF__

awk -f "${tmp_awk_path}" "${to_path}" >"${to_path}.new" && mv -f "${to_path}.new" "${to_path}"

# Fix admonition
# Note: __EOF__ is quoted to prevent substitutions here.
cat <<'__EOF__' > "${tmp_awk_path}"

/in v0.10.2 an workaround was added, by bundling the dependencies." %}/ {
  print "in v0.10.2 an workaround was added, by bundling the dependencies."
  print ""
  print ":::"

  next
}

1

__EOF__

awk -f "${tmp_awk_path}" "${to_path}" >"${to_path}.new" && mv -f "${to_path}.new" "${to_path}"

# Fix code blocks.
s='/```sh/{N;N;s|```sh\nxpm install --global xpm@{frontMatter.version}\n```|<CodeBlock language="sh"> {\n`xpm install --global xpm@${frontMatter.version}`\n} </CodeBlock>|;}'
sed -i.bak -e "$s" "${to_path}"

s='/```sh/{N;N;s|```sh\nxpm install --location=global xpm@{frontMatter.version}\n```|<CodeBlock language="sh"> {\n`xpm install --location=global xpm@${frontMatter.version}`\n} </CodeBlock>|;}'
sed -i.bak -e "$s" "${to_path}"

# -----------------------------------------------------------------------------

# Squeeze multiple adjacent empty lines.
cat -s "${to_path}" >"${to_path}.new" && rm -f "${to_path}" && mv -f "${to_path}.new" "${to_path}"

rm -f "${to_path}.bak"
rm -f "${tmp_awk_path}"

# -----------------------------------------------------------------------------
