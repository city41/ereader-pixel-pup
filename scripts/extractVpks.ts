import * as path from "path";
import * as fsp from "fs/promises";
import { parseRaw } from "./parseRaw";

function getVpkStartIndex(data: number[], startingIndex: number): number {
  for (let i = startingIndex; i < data.length - 4; ++i) {
    if (
      data[i] === "v".charCodeAt(0) &&
      data[i + 1] === "p".charCodeAt(0) &&
      data[i + 2] === "k".charCodeAt(0) &&
      data[i + 3] === "0".charCodeAt(0)
    ) {
      return i;
    }
  }

  return -1;
}

function extractVpks(binData: number[]): number[][] {
  const vpks: number[][] = [];

  let i = 0;

  while (true) {
    const vpkStartIndex = getVpkStartIndex(binData, i);
    const vpkEndIndex = getVpkStartIndex(binData, vpkStartIndex + 1);

    if (vpkStartIndex < 0) {
      break;
    }

    // if this is the last vpk in the binary, then vpkEndIndex will be -1
    // so this ternary accounts for that case
    const vpk = binData.slice(
      vpkStartIndex,
      vpkEndIndex < 0 ? binData.length : vpkEndIndex
    );
    vpks.push(vpk);

    // but if this was the last vpk, we need to break here, otherwise
    // we get stuck in an infinite loop
    if (vpkEndIndex < 0) {
      break;
    }

    i = vpkEndIndex;
  }

  return vpks;
}

async function main(rawFilePath: string, vpkOutputRoot: string) {
  const parseResult = await parseRaw(rawFilePath);
  if (!parseResult) {
    throw new Error("Failed to parse");
  }

  if (
    parseResult.parsedBin.payloadType !== "z80" ||
    !parseResult.parsedBin.cardType.startsWith("dotcode-app")
  ) {
    throw new Error("extractVpk only works on standalone z80 cards");
  }

  if (parseResult.parsedBin.vpkCount === 0) {
    throw new Error("No vpk payloads found");
  }

  const vpks = extractVpks(parseResult.binData);

  if (vpks.length === 0) {
    throw new Error("failed to find any vpks in this binary");
  }

  for (let i = 0; i < vpks.length; ++i) {
    const vpk = vpks[i];
    const vpkBin = Uint8Array.from(vpk);

    const vpkOutputPath = `${vpkOutputRoot}-${i}.vpk`;
    await fsp.writeFile(vpkOutputPath, vpkBin);
    console.log("wrote to", vpkOutputPath);
  }
}

if (require.main === module) {
  const [_tsNode, _extractVpk, rawFilePath, vpkOutputPath] = process.argv;

  if (!rawFilePath || !vpkOutputPath) {
    console.error(
      "usage: ts-node extractVpk.ts <raw-file-path> <vpk-output-root>"
    );
    process.exit(1);
  }

  main(path.resolve(rawFilePath), path.resolve(vpkOutputPath))
    .then(() => console.log("done"))
    .catch((e) => console.error(e));
}

export { extractVpks };
