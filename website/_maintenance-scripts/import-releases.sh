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

# set -x

doForce="y"
export doForce

# website/maintenance-scripts/import-releases.sh
project_folder_path="$(dirname $(dirname "${script_folder_path}"))"
website_folder_path="${project_folder_path}/website"

xpack_www_releases="$(dirname $(dirname "${project_folder_path}"))/www/web-jekyll-xpack.git/_posts/releases/xpm"

# which liquidjs
# liquidjs --help

echo
echo "Release posts..."

# find . -type f -print0 | \
#    xargs -0 -I '{}' bash "${script_folder_path}/website-convert-release-post.sh" '{}' "${project_folder_path}/website/blog"

for f in "${xpack_www_releases}"/*.md*
do
  # echo $f
  bash "${script_folder_path}/convert-release-post.sh" "${f}" "${website_folder_path}/blog"
done

echo
echo "Validating liquidjs..."

if grep -r -e '{{' "${project_folder_path}/website/blog"/*.md* | grep -v '/website/blog/_' || \
   grep -r -e '{%' "${project_folder_path}/website/blog"/*.md* | grep -v '/website/blog/_'
then
  exit 1
fi

echo
echo "Showing descriptions..."

egrep -h -e "(title:|description:)" "${project_folder_path}/website/blog"/*.md*

echo
echo "${script_name} done"

# -----------------------------------------------------------------------------
