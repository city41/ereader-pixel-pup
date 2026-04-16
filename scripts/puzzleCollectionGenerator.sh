#!/bin/bash -x

PARENTPATH=$( cd "$(dirname "${BASH_SOURCE[0]}")/.." ; pwd -P )

yarn ts-node ${PARENTPATH}/src/puzzleCollectionGenerator/main.ts ${@}