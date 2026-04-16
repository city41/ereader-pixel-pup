#!/bin/bash -x

SCRIPTSPATH=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )

yarn ts-node ${SCRIPTSPATH}/z80js/disasm/z80dismblr.ts $@
# node --loader ts-node/esm --inspect-brk ${SCRIPTSPATH}/z80js/disasm/z80dismblr.ts $@
