import * as path from "path";
import * as os from "os";
import * as fsp from "fs/promises";
import { mkdirp } from "mkdirp";
import execa from "execa";
import { extractVpks } from "./extractVpks";
import { decompressVpk } from "./decompressVpk";

type ParseRawOptions = {
  debugOutput: boolean;
  decompress: boolean;
};

type Region = "jpn-original" | "non-jpn" | "jpn-plus" | "unknown";
type CardType =
  | "pokemon"
  | "dotcode-app-17title-musica"
  | "dotcode-app-17title-musicb"
  | "p-letter-attacks"
  | "construction-escape"
  | "construction-action"
  | "construction-melody-box"
  | "dotcode-app-33title-musica"
  | "game-specific"
  | "p-letter-viewer";

type PayloadType = "gba" | "z80" | "nes" | "raw" | "not-first-strip";

type ParsedRaw = {
  region: Region;
  cardType: CardType;
  stripSize: "short" | "long" | "unknown";
  stripType: "short" | "long";
  stripNumber: number;
  totalStripCount: number;
  permissionToSave: boolean;
  hasSubTitle: boolean;
  payloadType: PayloadType;
  title: string;
  subtitle: string | null;
  vpkSize: number;
  vpkCount: number;
};

const idToRegion: Record<number, Region> = {
  0: "jpn-original",
  1: "non-jpn",
  2: "jpn-plus",
};

const idToCardType: Record<number, CardType> = {
  0: "pokemon",
  1: "pokemon",
  2: "dotcode-app-17title-musica",
  3: "dotcode-app-17title-musica",
  4: "dotcode-app-17title-musicb",
  5: "dotcode-app-17title-musicb",
  6: "p-letter-attacks",
  7: "p-letter-attacks",
  8: "construction-escape",
  9: "construction-escape",
  10: "construction-action",
  11: "construction-action",
  12: "construction-melody-box",
  13: "construction-melody-box",
  14: "dotcode-app-33title-musica",
  15: "game-specific",
  16: "p-letter-viewer",
  17: "p-letter-viewer",
  18: "p-letter-viewer",
  19: "p-letter-viewer",
  20: "p-letter-viewer",
  21: "p-letter-viewer",
  22: "p-letter-viewer",
  23: "p-letter-viewer",
  24: "p-letter-viewer",
  25: "p-letter-viewer",
  26: "p-letter-viewer",
  27: "p-letter-viewer",
  28: "p-letter-viewer",
  29: "p-letter-viewer",
  30: "dotcode-app-33title-musica",
  31: "game-specific",
};

function toBinary(v: number, byteCount: number): string {
  const rawBinary = v.toString(2);

  const expectedLength = byteCount * 8;

  const fillCount = expectedLength - rawBinary.length;

  if (fillCount === 0) {
    return rawBinary;
  } else {
    const filler = new Array(fillCount).fill("0").join("");

    return filler + rawBinary;
  }
}

function toHex(v: number, byteCount: number): string {
  const rawHex = v.toString(16);

  const expectedLength = byteCount * 2;

  const fillCount = expectedLength - rawHex.length;

  if (fillCount === 0) {
    return rawHex;
  } else {
    const filler = new Array(fillCount).fill("0").join("");

    return filler + rawHex;
  }
}

function getWord(data: number[], startIndex: number): number {
  // the gba is little endian, so the least significant byte comes first
  const highByte = data[startIndex + 1];
  const lowByte = data[startIndex];

  return (highByte << 8) | lowByte;
}

export function getDoubleWord(data: number[], startIndex: number): number {
  // the gba is little endian, so the least significant byte comes first
  const highByte = data[startIndex + 3];
  const secondHighByte = data[startIndex + 2];
  const midByte = data[startIndex + 1];
  const lowByte = data[startIndex];

  return (highByte << 24) | (secondHighByte << 16) | (midByte << 8) | lowByte;
}

function determinePayloadType(
  data: number[],
  hasSubTitles: boolean,
  stripNumber: number,
  totalStripCount: number,
  cardType: CardType
): PayloadType {
  if (stripNumber !== 1) {
    return "not-first-strip";
  }

  if (!cardType.startsWith("dotcode-app")) {
    return "raw";
  }

  const flagDoubleWord = getDoubleWord(data, 0x2a);
  const isNes = ((flagDoubleWord >> 2) & 1) === 1;

  if (isNes) {
    // nothing more to do
    return "nes";
  }

  // ok it is either gba or z80, need to go deeper
  const mainTitleLength =
    cardType === "dotcode-app-17title-musica" ||
    cardType === "dotcode-app-17title-musicb"
      ? 17
      : 33;

  const subtitlesLength = mainTitleLength === 17 ? 21 : 33;
  const totalSubtitlesLength = hasSubTitles
    ? totalStripCount * subtitlesLength
    : 0;

  // 48 = header length, 2 = VPK size
  const potentialNullIndex = 48 + mainTitleLength + totalSubtitlesLength + 2;

  // TODO: these 4 null bytes are only in the first strip
  if (
    data[potentialNullIndex] === 0 &&
    data[potentialNullIndex + 1] === 0 &&
    data[potentialNullIndex + 2] === 0 &&
    data[potentialNullIndex + 3] === 0
  ) {
    return "gba";
  } else {
    return "z80";
  }
}

// TODO: support Japanese, shift-jis
function determineTitles(
  data: number[],
  region: Region,
  cardType: CardType,
  hasSubTitles: boolean,
  stripNumber: number
): { title: string; subtitle: string | null } {
  let title = "";
  let titleLength = 33;
  let subtitleLength = 33;

  if (region !== "non-jpn") {
    title = "shift-js-todo";
  } else {
    if (cardType.startsWith("dotcode-app-17title")) {
      titleLength = 17;
      subtitleLength = 21;
    }

    const rawTitleBytes = data.slice(48, 48 + titleLength);

    for (let i = 0; i < titleLength; ++i) {
      if (rawTitleBytes[i] === 0) {
        break;
      }

      title += String.fromCharCode(rawTitleBytes[i]);
    }
  }

  if (!hasSubTitles) {
    return { title, subtitle: null };
  }

  let subtitle = "";

  if (region !== "non-jpn") {
    subtitle = "shift-js-todo";
  } else {
    const subtitleStart = 48 + titleLength + (stripNumber - 1) * subtitleLength;
    const subtitleEnd = subtitleStart + subtitleLength;
    const rawSubtitleBytes = data.slice(subtitleStart, subtitleEnd);

    for (let i = 0; i < subtitleLength; ++i) {
      if (rawSubtitleBytes[i] === 0) {
        break;
      }

      subtitle += String.fromCharCode(rawSubtitleBytes[i]);
    }
  }

  return { title, subtitle };
}

function determineVpkSize(
  data: number[],
  cardType: CardType,
  hasSubTitles: boolean,
  totalStripCount: number
): number {
  let titleLength = 33;
  let subtitleLength = 33;
  if (cardType.startsWith("dotcode-app-17title")) {
    titleLength = 17;
    subtitleLength = 21;
  }

  if (!hasSubTitles) {
    subtitleLength = 0;
  }

  const totalTitleLength = titleLength + subtitleLength * totalStripCount;
  const vpkSizeIndex = 48 + totalTitleLength;

  return getWord(data, vpkSizeIndex);
}

async function getBinData(rawFilePath: string): Promise<number[]> {
  const tmpDir = path.resolve(os.tmpdir(), `getBinData-${Date.now()}`);
  await mkdirp(tmpDir);

  const binOutputPath = path.resolve(tmpDir, "getBinData_nedcencResult.bin");

  // @ts-ignore
  const { stdout, stderr } = await execa(`${__dirname}/wine.sh`, [
    "nedcenc.exe",
    "-d",
    "-i",
    rawFilePath,
    "-o",
    binOutputPath,
  ]);

  // console.log("stdout");
  // console.log(stdout);
  // console.log("stderr");
  // console.log(stderr);

  const buffer = await fsp.readFile(binOutputPath);
  const byteArray = new Uint8Array(buffer);

  return Array.from(byteArray);
}

// Inside a decoded raw file is potentially vpk0 compressed chunks.
// They always start with the string "vpk0". This function counts how
// many of those chunks there are
function determineVpkCount(data: number[]): number {
  const dataAsString = data.map((b) => String.fromCharCode(b)).join("");

  const split = dataAsString.split("vpk0");

  // the data is typically like this
  // [header][vpk0][a][vpk0][b]
  // after split, it becomes -> [header][a][b],
  // so minus 1 is due to the header
  return split.length - 1;
}

async function parseRaw(
  rawFilePath: string,
  options?: Partial<ParseRawOptions>
): Promise<{
  parsedBin: ParsedRaw;
  binData: number[];
  decompressedData?: number[][];
} | null> {
  const binData = await getBinData(rawFilePath);

  if (!binData || binData.length === 0) {
    return null;
  }

  const stripSizeWord = getWord(binData, 0x6);
  // the gbatek doc says 0x810 and 0x510, but I think they forgot the gba is little endian
  const stripSize =
    stripSizeWord === 0x1005
      ? "short"
      : stripSizeWord === 0x1008
        ? "long"
        : "unknown";
  const stripType = binData[0xe] == 2 ? "short" : "long";

  const primaryType = binData[0x3];
  const regionTypeWord = getWord(binData, 0xc);

  if (options?.debugOutput) {
    console.log("primaryType", toBinary(primaryType, 1), toHex(primaryType, 1));
    console.log(
      "regionTypeWord",
      regionTypeWord.toString(2),
      regionTypeWord.toString(16)
    );
  }

  const cardTypeUpperBit = primaryType & 1;
  const cardTypeLowerBits = (regionTypeWord >> 4) & 0xf;
  const cardTypeId = (cardTypeUpperBit << 4) | cardTypeLowerBits;

  if (options?.debugOutput) {
    console.log({ cardTypeId });
  }

  const cardType = idToCardType[cardTypeId];

  const regionId = (regionTypeWord >> 8) & 0xf;
  const region = idToRegion[regionId];

  const sizeDoubleWord = getDoubleWord(binData, 0x26);
  const stripNumber = (sizeDoubleWord >> 1) & 0xf;
  const totalStripCount = (sizeDoubleWord >> 5) & 0xf;

  const flagDoubleWord = getDoubleWord(binData, 0x2a);
  const permissionToSave = (flagDoubleWord & 1) === 1;
  const hasSubTitle = ((flagDoubleWord >> 1) & 1) === 0;
  const payloadType = determinePayloadType(
    binData,
    hasSubTitle,
    stripNumber,
    totalStripCount,
    cardType
  );

  const titles = determineTitles(
    binData,
    region,
    cardType,
    hasSubTitle,
    stripNumber
  );
  const vpkSize = determineVpkSize(
    binData,
    cardType,
    hasSubTitle,
    totalStripCount
  );

  const parsedBin: ParsedRaw = {
    stripType,
    stripSize,
    region,
    cardType,
    stripNumber,
    totalStripCount,
    permissionToSave,
    hasSubTitle,
    payloadType,
    ...titles,
    vpkSize,
    vpkCount: determineVpkCount(binData),
  };

  let decompressedData: undefined | number[][];

  if (options?.decompress) {
    decompressedData = [];

    const vpks = extractVpks(binData);
    for (const vpk of vpks) {
      const decompressedVpk = await decompressVpk(vpk);
      decompressedData.push(decompressedVpk);
    }
  }

  return { parsedBin, binData, decompressedData };
}

async function main(rawFilePath: string) {
  const result = await parseRaw(rawFilePath, { debugOutput: true });

  if (!result) {
    console.error("Failed to parse", rawFilePath);
  } else {
    console.log(JSON.stringify(result.parsedBin, null, 2));

    for (let i = 0; i < 0xc0; ++i) {
      console.log(
        `binData[${i.toString(16)}]: ${result.binData[i].toString(
          16
        )} | ${String.fromCharCode(result.binData[i])}`
      );
    }
  }
}

if (require.main === module) {
  const [_tsNode, _dumpHeader, rawFilePath] = process.argv;

  if (!rawFilePath) {
    console.error("usage: ts-node parseBin.ts <raw-file>");
    process.exit(1);
  }

  main(path.resolve(rawFilePath))
    .then(() => console.log("done"))
    .catch((e) => console.error(e));
}

export { parseRaw };
export type { ParsedRaw };
