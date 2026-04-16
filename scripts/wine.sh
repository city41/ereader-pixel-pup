#!/bin/bash -x

PARENTPATH=$( cd "$(dirname "${BASH_SOURCE[0]}")/.." ; pwd -P )

wine "${PARENTPATH}/bin/$@"