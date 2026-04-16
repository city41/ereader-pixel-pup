import * as path from "path";
import * as fsp from "fs/promises";
import { parseRaw } from "./parseRaw";

type ZeroOrEight = "0" | "8";

function insertNops(
  data: readonly number[],
  zeroOrEight: ZeroOrEight,
  apiId: number
): number[] {
  const rstOpcode = zeroOrEight === "0" ? 0xc7 : 0xcf;

  const newData: number[] = [...data];

  let nops: number[] = [];

  for (let i = 0; i < newData.length - 1; ++i) {
    if (newData[i] === rstOpcode && newData[i + 1] === apiId) {
      nops.push(i);
      newData[i] = 0;
      newData[i + 1] = 0;
      i += 1;
    }
  }

  console.log(
    `Removed ${nops.length} rst call(s) at: ${nops
      .map((n) => n.toString(16))
      .join(",")}`
  );

  return newData;
}

async function main(
  rawFilePath: string,
  destBinPath: string,
  zeroOrEight: ZeroOrEight,
  apiId: number
) {
  const parseResult = await parseRaw(rawFilePath, { decompress: true });

  if (!parseResult) {
    throw new Error("Failed to convert the raw file to bin");
  }

  const noppedBin = insertNops(
    parseResult.decompressedData!,
    zeroOrEight,
    apiId
  );

  await fsp.writeFile(destBinPath, Uint8Array.from(noppedBin));

  console.log("wrote", destBinPath);
}

const [_tsNode, _nopRstCalls, rawFilePath, destBinPath, zeroOrEight, apiIdS] =
  process.argv;

function usage() {
  console.error(
    "usage: ts-node noRstCalls.ts <raw-file> <dest-bin-file> <0 or 8> <hex api id>"
  );
  console.error("hex api id should be a hex byte, ex: 1a");
  process.exit(1);
}

if (!rawFilePath || !zeroOrEight || !apiIdS) {
  usage();
}

if (zeroOrEight !== "0" && zeroOrEight !== "8") {
  usage();
}

const apiId = parseInt(apiIdS, 16);

if (isNaN(apiId) || apiId < 0 || apiId > 255) {
  usage();
}

if (require.main === module) {
  main(
    path.resolve(rawFilePath),
    path.resolve(destBinPath),
    zeroOrEight as ZeroOrEight,
    apiId
  )
    .then(() => console.log("done"))
    .catch((e) => console.error(e));
}
