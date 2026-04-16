import { ParsedRaw, parseRaw } from "./parseRaw";

type ParsedResult = {
  parsedBin: ParsedRaw;
  binData: number[];
};

function parsedSorter(a: ParsedResult, b: ParsedResult): number {
  return a.parsedBin.stripNumber - b.parsedBin.stripNumber;
}

function extractFirstStripData(p: ParsedResult): number[] {
  let titleSize =
    p.parsedBin.cardType === "dotcode-app-33title-musica" ? 33 : 17;

  if (p.parsedBin.hasSubTitle) {
    titleSize += titleSize * p.parsedBin.totalStripCount;
  }

  // 48=header size
  // 2 = vpk size
  const offset = 48 + titleSize + 2;

  return p.binData.slice(offset);
}

function extractSubsequentStripData(p: ParsedResult): number[] {
  let titleSize =
    p.parsedBin.cardType === "dotcode-app-33title-musica" ? 33 : 17;

  if (p.parsedBin.hasSubTitle) {
    titleSize += titleSize * p.parsedBin.totalStripCount;
  }
  // 48=header size
  const offset = 48 + titleSize;

  return p.binData.slice(offset);
}

async function extractPayloadFromRaws(
  rawFilePaths: string[]
): Promise<number[]> {
  const parsed: ParsedResult[] = [];

  for (const rawFilePath of rawFilePaths) {
    const parseResult = await parseRaw(rawFilePath);
    if (parseResult === null) {
      throw new Error(`Failed to parse: ${rawFilePath}`);
    }
    parsed.push(parseResult);
  }

  parsed.sort(parsedSorter);

  if (parsed[0].parsedBin.totalStripCount !== parsed.length) {
    throw new Error(
      `Header indicates ${parsed[0].parsedBin.totalStripCount}, but only have ${parsed.length}`
    );
  }

  const firstStripData = extractFirstStripData(parsed[0]);
  const subsequentStripDatas = parsed.slice(1).flatMap((p) => {
    return extractSubsequentStripData(p);
  });

  const totalData = [...firstStripData, ...subsequentStripDatas];
  const totalDataTrimmed = totalData.slice(0, parsed[0].parsedBin.vpkSize);

  return totalDataTrimmed;
}

export { extractPayloadFromRaws };
