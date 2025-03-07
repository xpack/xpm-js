#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# This file is part of the xPack project (https://xpack.github.io).
# Copyright (c) 2020 Liviu Ionescu. All rights reserved.
#
# Permission to use, copy, modify, and/or distribute this software
# for any purpose is hereby granted, under the terms of the MIT license.
#
# If a copy of the license was not distributed with this file, it can
# be obtained from https://opensource.org/license/mit.
# -----------------------------------------------------------------------------

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

tests_folder_path="$(dirname "${script_folder_path}")"

# -----------------------------------------------------------------------------

function run_verbose()
{
  # Does not include the .exe extension.
  local app_path=$1
  shift

  echo
  echo "[${app_path} $@]"
  "${app_path}" "$@" 2>&1
}

# -----------------------------------------------------------------------------

force_32_bit=""
image_name=""
RELEASE_VERSION="${RELEASE_VERSION:-latest}"

while [ $# -gt 0 ]
do
  case "$1" in

    --32)
      force_32_bit="y"
      shift
      ;;

    --image)
      image_name="$2"
      shift 2
      ;;

    --version)
      RELEASE_VERSION="$2"
      shift 2
      ;;

    --*)
      echo "Unsupported option $1."
      exit 1
      ;;

    *)
      echo "Unsupported arg $1."
      exit 1
      ;;

  esac
done

# -----------------------------------------------------------------------------

if [ -f "/.dockerenv" ]
then
  if [ -n "${image_name}" ]
  then
    # When running in a Docker container, update it.
    : # update_image "${image_name}"
  else
    echo "No image defined, quit."
    exit 1
  fi

  # The Debian npm docker images have nvm installed in the /root folder.
  if [ -d "/root/.nvm" ]
  then
    export NVM_DIR="/root/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

    hash -r
  fi
fi

# -----------------------------------------------------------------------------

run_verbose npm install --global xpm@${RELEASE_VERSION}

mkdir -p hello-world
cd hello-world

# https://github.com/xpack/hello-world-template-xpack
run_verbose xpm init --template @xpack/hello-world-template --property language=cpp
run_verbose xpm install
run_verbose xpm run test

# Completed successfully.
exit 0

# -----------------------------------------------------------------------------
