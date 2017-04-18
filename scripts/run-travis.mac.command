#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

script=$0
if [[ "${script}" != /* ]]
then
  # Make relative path absolute.
  script=$(pwd)/$0
fi

parent="$(dirname ${script})"
# echo ${parent}

# if [ ${USER} == "ilg" ]
# User specific inits.

# export DEBUG=-x
bash "${parent}/run-travis.sh"

# say "Wake up, the test completed successfully"
