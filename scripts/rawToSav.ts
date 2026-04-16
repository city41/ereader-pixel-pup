import * as os from "os";
import * as path from "path";
import * as fsp from "fs/promises";
import { parseRaw } from "./parseRaw";
import { mkdirp } from "mkdirp";
import execa from "execa";
import { extractVpk } from "./extractVpk";

async function binToSav(binData: number[]): Promise<number[]> {
  const tmpDir = path.resolve(os.tmpdir(), `binToSav-${Date.now()}`);
  await mkdirp(tmpDir);

  const binPath = path.resolve(tmpDir, "binToSav.bin");
  const savPath = path.resolve(tmpDir, "binToSav.sav");
  await fsp.writeFile(binPath, Uint8Array.from(extractVpk(binData)));

  // @ts-ignore
  const { stdout, stderr } = await execa(path.resolve(__dirname, '../bin/neflmake'), [
    "-i",
    binPath,
    "-o",
    savPath,
    "-type",
    "1",
    "-name",
    "binToSav",
    "-region",
    "1"
  ]);

  // console.log("stdout");
  // console.log(stdout);
  // console.log("stderr");
  // console.log(stderr);

  const buffer = await fsp.readFile(savPath);
  const byteArray = new Uint8Array(buffer);

  return Array.from(byteArray);
}

async function main(rawFilePath: string, destSavPath: string) {
  const parseResult = await parseRaw(rawFilePath, { decompress: true });

  if (!parseResult) {
    throw new Error("Failed to convert the raw file to bin");
  }

  if (!parseResult.decompressedData) {
    throw new Error("Failed to decompress?");
  }

  const savData = await binToSav(parseResult.binData);

  await fsp.writeFile(
    destSavPath,
    Uint8Array.from(savData)
  );

  console.log("wrote", destSavPath);
}

const [_tsNode, _nopRstCalls, rawFilePath, destBinPath] = process.argv;

function usage() {
  console.error("usage: ts-node rawToSav.ts <raw-file> <dest-sav-file>");
  process.exit(1);
}

if (!rawFilePath || !destBinPath) {
  usage();
}

if (require.main === module) {
  main(path.resolve(rawFilePath), path.resolve(destBinPath))
    .then(() => console.log("done"))
    .catch((e) => console.error(e));
}
