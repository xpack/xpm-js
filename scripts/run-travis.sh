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

script=$0
if [[ "${script}" != /* ]]
then
  # Make relative path absolute.
  script=$(pwd)/$0
fi

parent="$(dirname ${script})"
# echo ${parent}

# -----------------------------------------------------------------------------

function do_run()
{
  echo "\$ $@"
  "$@"
}

# -----------------------------------------------------------------------------

# Prepare a minimum Travis like environment.
# https://docs.travis-ci.com/user/environment-variables/#Default-Environment-Variables

export TRAVIS=false

# "Darwin", "Linux"
host_uname="$(uname)"
if [ "${host_uname}" == "Darwin" ]
then
  export TRAVIS_OS_NAME=osx
elif [ "${host_uname}" == "Linux" ]
then
  export TRAVIS_OS_NAME=linux
elif [ "${host_uname:0:6}" == "MINGW64" ]
then
  # Extension, Travis does not support Windows.
  export TRAVIS_OS_NAME=mingw64
fi

cd "$(dirname ${parent})"

# bash "${parent}/travis.sh" before_install

# Install development dependencies
do_run npm install

# bash "${parent}/travis.sh" before_script
# Output useful info for debugging.
do_run node --version
do_run npm --version

# bash "${parent}/travis.sh" script
do_run npm test
echo
echo "PASSED"
exit 0

