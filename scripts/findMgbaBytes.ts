import * as path from "path";
import * as fsp from "fs/promises";

export function convertStringToBytes(bytesString: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < bytesString.length; i += 2) {
    const byteString = bytesString.substring(i, i + 2);
    const byte = parseInt(byteString, 16);

    bytes.push(byte);
  }

  return bytes;
}

function toHexByteString(b: number): string {
  const rawByteString = b.toString(16);

  if (rawByteString.length === 1) {
    return "0" + rawByteString;
  }

  if (rawByteString.length === 2) {
    return rawByteString;
  }

  throw new Error(`toHexByteString: number was not a byte: ${b}`);
}

function getIndicesOf(searchStr: string, str: string) {
  const searchStrLen = searchStr.length;
  if (searchStrLen == 0) {
    return [];
  }
  let startIndex = 0;
  let index;
  const indices: number[] = [];

  while ((index = str.indexOf(searchStr, startIndex)) > -1) {
    indices.push(index);
    startIndex = index + searchStrLen;
  }
  return indices;
}

async function main(binPath: string, mgbaBytesPath: string) {
  const bin = Array.from(Uint8Array.from(await fsp.readFile(binPath)));
  const binString = bin
    .map((b) => toHexByteString(b))
    .join("")
    .toLowerCase();

  const mgbaBytesString = (await fsp.readFile(mgbaBytesPath))
    .toString()
    .trim()
    .toLowerCase();

  const locations = getIndicesOf(mgbaBytesString, binString);

  console.log(
    "locations",
    locations.join(", "),
    "(",
    locations.map((l) => l.toString(16)).join(", "),
    ")"
  );
}

const [_tsNode, _findMgbaBytes, binPath, mgbaBytesPath] = process.argv;

function usage() {
  console.error("usage: ts-node findMgbaBytes.ts <bin-file> <mgba-bytes-file>");
  process.exit(1);
}

if (!binPath || !mgbaBytesPath) {
  usage();
}

if (require.main === module) {
  main(path.resolve(binPath), path.resolve(mgbaBytesPath))
    .then(() => console.log("done"))
    .catch((e) => console.error(e));
}
