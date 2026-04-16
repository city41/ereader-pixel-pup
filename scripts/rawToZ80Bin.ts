import * as path from "path";
import * as fsp from "fs/promises";
import { extractPayloadFromRaws } from "./extractPayloadFromRaws";
import { extractVpks } from "./extractVpks";
import { decompressVpk } from "./decompressVpk";

async function main(rawFilePaths: string[], destZ80BinRoot: string) {
  const fullPayload = await extractPayloadFromRaws(rawFilePaths);

  const vpks = extractVpks(fullPayload);

  for (let i = 0; i < vpks.length; ++i) {
    const decompressedVpk = await decompressVpk(vpks[i]);
    const destPath = `${destZ80BinRoot}-${i}.bin`;
    await fsp.writeFile(destPath, Uint8Array.from(decompressedVpk));
    console.log("wrote", destPath);
  }
}

const [_tsNode, _nopRstCalls, destBinRoot, ...rawFilePaths] = process.argv;

function usage() {
  console.error("usage: ts-node rawToZ80Bin.ts <dest-bin-root> <raw-files...>");
  process.exit(1);
}

if (!rawFilePaths || rawFilePaths.length === 0 || !destBinRoot) {
  usage();
}

if (require.main === module) {
  const resolvedRawFilePaths = rawFilePaths.map((rfp) => path.resolve(rfp));
  main(resolvedRawFilePaths, path.resolve(destBinRoot))
    .then(() => console.log("done"))
    .catch((e) => console.error(e));
}
