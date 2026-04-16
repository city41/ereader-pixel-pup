import * as path from "node:path";
import * as fsp from "node:fs/promises";
import { EReaderRunner } from "../../../src/EReaderRunner/EReaderRunner";
import { parseSymbols } from "../../../scripts/z80js/parseSymbol";
import { ScannedInBin } from "../../../src/EReaderRunner/z80js/types";

const DEFAULT_DECODED_RAW_PATH = "puzzles/output/entomology.decoded.bin";
const DEFAULT_BIN_PATH = "puzzles/output/entomology.bin";

type AdditionalScan = {
  decodedRawPath?: string;
  binPath?: string;
  scanResult?: number;
};

async function createRunner(
  decodedRawPath = DEFAULT_DECODED_RAW_PATH,
  binPath = DEFAULT_BIN_PATH,
  // 6 is "non-standalone" card, ie what puzzle pack cards are
  scanResult = 6,
  moreScans?: AdditionalScan[],
) {
  const symbolTxt = (
    await fsp.readFile(path.resolve("src/main.sym"))
  ).toString();
  const symbols = parseSymbols(symbolTxt);

  const allPendingScans = [
    { decodedRawPath, binPath, scanResult },
    ...(moreScans ?? []),
  ];
  const scannedInCards: ScannedInBin[] = [];

  for (const pendingScan of allPendingScans) {
    const decodedRawBin = Array.from(
      new Uint8Array(
        await fsp.readFile(
          path.resolve(pendingScan.decodedRawPath ?? DEFAULT_DECODED_RAW_PATH),
        ),
      ),
    );
    const puzzleCardBin = Array.from(
      new Uint8Array(
        await fsp.readFile(
          path.resolve(pendingScan.binPath ?? DEFAULT_BIN_PATH),
        ),
      ),
    );

    scannedInCards.push({
      decodedRaw: decodedRawBin,
      decompressed: puzzleCardBin,
      scanResult: pendingScan.scanResult,
    });
  }

  const mainBin = Array.from(
    new Uint8Array(await fsp.readFile(path.resolve("src/main.bin"))),
  );

  const runner = new EReaderRunner(
    mainBin,
    scannedInCards,
    symbols.addressToSymbol,
  );

  return {
    runner,
    mainBin,
    puzzleCardBin: scannedInCards[0].decompressed,
    symbols,
    scannedInCards,
  };
}

export { createRunner };
