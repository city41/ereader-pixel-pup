import * as path from "path";
import * as fsp from "fs/promises";

async function main(binPath: string, outputRootPath: string) {
  const bin = Array.from(new Uint8Array(await fsp.readFile(binPath)));

  const filenameRoot = path.basename(outputRootPath);

  const header = `#ifndef ${filenameRoot.toUpperCase()}_H
#define ${filenameRoot.toUpperCase()}_H
#include "def.h"
extern u8 ${filenameRoot}[${bin.length}];
#endif`;

  const entries = bin.map((b) => `0x${b.toString(16)}`);

  const src = `#include "${filenameRoot}.h"
u8 ${filenameRoot}[${bin.length}] = {
    ${entries.join(",\n")}
};
`;

  const headerPath = `${outputRootPath}.h`;
  await fsp.writeFile(headerPath, header);
  console.log("wrote", headerPath);

  const srcPath = `${outputRootPath}.c`;
  await fsp.writeFile(srcPath, src);
  console.log("wrote", srcPath);
}

const [_tsNode, _binToCArray, binPath, outputRootPath] = process.argv;

if (!binPath || !outputRootPath) {
  console.error("usage: ts-node binToCArray <bin-path> <output-root-path>");
  process.exit(1);
}

main(path.resolve(binPath), path.resolve(outputRootPath))
  .then(() => console.log("done"))
  .catch((e) => console.error(e));
