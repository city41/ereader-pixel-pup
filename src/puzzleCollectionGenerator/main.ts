import assert from "node:assert";
import * as path from "node:path";
import * as fsp from "node:fs/promises";
import * as os from "node:os";
import {
  JsonSpec,
  PuzzleCollectionSpec,
  PuzzlePaintingSpec,
  PuzzleSpec,
} from "./types";
import { processSprite } from "@city41/gba-convertpng/dist/sprite";
import { getForcedPalette } from "@city41/gba-convertpng/dist/palette";
import execa from "execa";
import { mkdirp } from "mkdirp";
import { Nonogram } from "./Nonogram";
import { createCanvasFromPath } from "@city41/gba-convertpng/dist/canvas";
import { processMascot } from "./mascot";
import { parseSymbols } from "../EReaderRunner/z80js/parseSymbols";
import { calcLeftHintNumbers, calcTopHintNumbers } from "./hintNumbers";
import { calcPuzzleSizeAndWinFillCount, splitPuzzlePainting } from "./puzzle";
import { Canvas } from "canvas";

// this needs to match what is in puzzle_collection_struct.asm
const MAX_NUM_PUZZLES_IN_COLLECTION = 20;

function isPuzzleCollection(
  spec: PuzzleCollectionSpec | PuzzlePaintingSpec,
): spec is PuzzleCollectionSpec {
  return "puzzles" in spec;
}

function hydrateJsonSpec(jsonSpecPath: string): JsonSpec {
  const rootDir = path.dirname(jsonSpecPath);
  const initialSpec = require(jsonSpecPath) as JsonSpec;

  return {
    ...initialSpec,
    outputDir: path.resolve(rootDir, initialSpec.outputDir),
    mainSymFile: path.resolve(rootDir, initialSpec.mainSymFile),
    collections: initialSpec.collections.map((c) => {
      if (isPuzzleCollection(c)) {
        return {
          ...c,
          mascotBody: path.resolve(rootDir, c.mascotBody),
          mascotSadFace: path.resolve(rootDir, c.mascotSadFace),
          mascotTail: path.resolve(rootDir, c.mascotTail),
          palette: path.resolve(rootDir, c.palette),
          puzzles: c.puzzles.map((s) => {
            return {
              ...s,
              file: path.resolve(rootDir, s.file),
            };
          }),
          asm: c.asm ? path.resolve(rootDir, c.asm) : undefined,
        };
      } else {
        return {
          ...c,
          mascotBody: path.resolve(rootDir, c.mascotBody),
          mascotSadFace: path.resolve(rootDir, c.mascotSadFace),
          mascotTail: path.resolve(rootDir, c.mascotTail),
          palette: path.resolve(rootDir, c.palette),
          paintingFile: path.resolve(rootDir, c.paintingFile),
          asm: c.asm ? path.resolve(rootDir, c.asm) : undefined,
        };
      }
    }),
  };
}

function stringToNameArray(spec: PuzzleSpec): number[] {
  const name = spec.name ?? path.basename(spec.file, ".png");
  const trimmed = name.trim().replace(/[^A-Za-z0-9]/g, " ");

  if (trimmed.length > 12) {
    throw new Error(
      `Puzzle name too long: ${trimmed}, (${trimmed.length} chars)`,
    );
  }

  const bytes = trimmed.split("").map((c) => c.charCodeAt(0));
  while (bytes.length < 13) {
    bytes.push(0);
  }

  return bytes;
}

function solve(
  topHintNumbers: number[][],
  leftHintNumbers: number[][],
): string | null {
  const processedTopHintNumbers = topHintNumbers.map((c) =>
    c.filter((h) => h !== 0).reverse(),
  );
  const processedLeftHintNumbers = leftHintNumbers.map((c) =>
    c.filter((h) => h !== 0).reverse(),
  );

  const nonogram = new Nonogram(
    processedLeftHintNumbers,
    processedTopHintNumbers,
  );

  return nonogram.solveAndCheck();
}

async function processPuzzle(
  puzzle: PuzzleSpec,
  id: number,
  warnIllegal: boolean,
  palettePath: string,
  forcedPuzzleSize?: number,
): Promise<{ bin: number[]; hintNumbers: number[] }> {
  console.log("processing", path.basename(puzzle.file));
  const processResult = await processSprite(
    { ...puzzle, frames: 1 },
    "bin",
    palettePath,
  );

  if (processResult.canvas.width % 8 !== 0) {
    throw new Error(
      `Improper canvas width for puzzle, it should be a multiple of eight. Got width: ${processResult.canvas.width}`,
    );
  }

  if (processResult.canvas.height % 8 !== 0) {
    throw new Error(
      `Improper canvas height for puzzle, it should be a multiple of eight. Got height: ${processResult.canvas.height}`,
    );
  }

  const paletteCanvas = await createCanvasFromPath(palettePath);
  if (paletteCanvas.width !== 15) {
    throw new Error(
      `Invalid sized palette: should be 15px wide, got: ${paletteCanvas.width}`,
    );
  }
  if (paletteCanvas.height !== 1) {
    throw new Error(
      `Invalid sized palette: should be 1px tall, got: ${paletteCanvas.height}`,
    );
  }
  const palette = paletteCanvas
    .getContext("2d")
    .getImageData(0, 0, paletteCanvas.width, paletteCanvas.height).data;

  const {
    effectiveSizeInTiles: sizeInTiles,
    sizeEnum,
    winFillCount,
  } = calcPuzzleSizeAndWinFillCount(
    processResult.canvas as unknown as Canvas,
    palette,
    forcedPuzzleSize,
  );

  const {
    hintNumbers: topHintNumbers,
    flatFullHintNumbers: flatFullTopHintNumbers,
  } = calcTopHintNumbers(
    processResult.canvas as unknown as Canvas,
    palette,
    sizeInTiles,
  );
  const {
    hintNumbers: leftHintNumbers,
    flatFullHintNumbers: flatFullLeftHintNumbers,
  } = calcLeftHintNumbers(
    processResult.canvas as unknown as Canvas,
    palette,
    sizeInTiles,
  );

  const solveResult = solve(topHintNumbers, leftHintNumbers);

  if (solveResult !== "Solved") {
    const message = `${puzzle.file} is not a legal nonogram: ${solveResult}`;
    if (warnIllegal) {
      console.warn(message);
    } else {
      throw new Error(message);
    }
  }

  // console.log(
  //   JSON.stringify({ flatFullTopHintNumbers, flatFullLeftHintNumbers })
  // );
  console.log({ winFillCount });

  return {
    bin: [
      // TODO: id needs to be global across cards
      ...toWordArray(id),
      sizeEnum,
      winFillCount,
      ...stringToNameArray(puzzle),
      ...(processResult.tilesSrc as number[]),
    ],
    hintNumbers: flatFullTopHintNumbers.concat(flatFullLeftHintNumbers).flat(1),
  };
}

function toAsm(bin: number[]): string {
  return bin.map((b) => `.db 0x${b.toString(16)}`).join("\n");
}

function toCSrc(bin: number[]): { header: string; src: string } {
  const header = `#ifndef PUZZLE_COLLECTION_H
#define PUZZLE_COLLECTION_H

#ifdef EMBED_PUZZLES
#include "def.h"
extern const u8 puzzle_collection1[];
#endif

#endif`;

  const src = `#ifdef EMBED_PUZZLES
  #include "puzzle_collection.h"
  
const u8 puzzle_collection1[${bin.length}] = {
    ${bin.map((b) => `0x${b.toString(16)}`).join(",\n")}
    
};
#endif`;

  return { header, src };
}

async function compress(bin: number[]): Promise<number[]> {
  const tmpDir = path.resolve(
    os.tmpdir(),
    `puzzleCollectionGenerator-vpk-${Date.now()}`,
  );
  await mkdirp(tmpDir);

  const binFilePath = path.resolve(tmpDir, "input.bin");
  await fsp.writeFile(binFilePath, Uint8Array.from(bin));

  const vpkPath = path.resolve(tmpDir, "output.vpk");

  await execa(
    "scripts/wine.sh",
    ["nevpk.exe", "-level", "2", "-c", "-i", binFilePath, "-o", vpkPath],
    {
      cwd: "/home/matt/dev/ereaderz80",
    },
  );

  const vpkData = await fsp.readFile(vpkPath);

  // console.log("compressed", vpkPath, "size", vpkData.length);

  return Array.from(new Uint8Array(vpkData));
}

async function assembleFromSrc(asmSrc: string, org: number): Promise<number[]> {
  const tmpDir = path.resolve(
    os.tmpdir(),
    `puzzleCollectionGenerator-asm-${Date.now()}`,
  );

  asmSrc = `    .area CODE (ABS)
    .org 0x${org.toString(16)}
${asmSrc}`;

  await mkdirp(tmpDir);
  const tmpAsmPath = path.resolve(tmpDir, "asm.asm");
  await fsp.writeFile(tmpAsmPath, asmSrc);

  // create the rel
  //asz80 -o -s -w -i '.define $(TEXT)' $(PRELUDE) asm.asm
  await execa("/home/matt/dev/ereaderz80/bin/asz80", [
    "-o",
    "-s",
    "-w",
    tmpAsmPath,
  ]);

  const symFilePath = path.resolve(tmpDir, "asm.sym");
  const symFile = (await fsp.readFile(symFilePath)).toString();

  console.log("assembleFromSrc, resulting sym file\n", symFile);

  // create the s19
  const tmpRelPath = path.resolve(tmpDir, "asm.rel");
  // aslink -n -s asm.rel
  await execa("/home/matt/dev/ereaderz80/bin/aslink", ["-n", "-s", tmpRelPath]);

  // create the bin
  const tmpS19Path = path.resolve(tmpDir, "asm.s19");
  const tmpBinPath = path.resolve(tmpDir, "asm.bin");
  // objcopy --input-target=srec --output-target=binary asm.s19 asm.bin
  await execa("objcopy", [
    "--input-target=srec",
    "--output-target=binary",
    tmpS19Path,
    tmpBinPath,
  ]);

  const binData = Array.from(new Uint8Array(await fsp.readFile(tmpBinPath)));

  console.log(
    `function assembled with org: ${org}`,
    tmpBinPath,
    binData.length,
  );

  return binData;
}

async function decodeRaw(rawBin: number[]): Promise<number[]> {
  const tmpDir = path.resolve(
    os.tmpdir(),
    `puzzleCollectionGenerator-decode-raw-${Date.now()}`,
  );
  await mkdirp(tmpDir);

  const rawFilePath = path.resolve(tmpDir, "input.raw");
  const outputPath = path.resolve(tmpDir, "input.decoded.bin");
  await fsp.writeFile(rawFilePath, Uint8Array.from(rawBin));

  await execa("./nedcenc", ["-i", rawFilePath, "-o", outputPath, "-d"], {
    cwd: "/home/matt/dev/ereaderz80/bin",
  });

  const decodedData = await fsp.readFile(outputPath);
  return Array.from(new Uint8Array(decodedData));
}

async function createRaw(bin: number[]): Promise<number[]> {
  const tmpDir = path.resolve(
    os.tmpdir(),
    `puzzleCollectionGenerator-raw-${Date.now()}`,
  );
  await mkdirp(tmpDir);

  const binFilePath = path.resolve(tmpDir, "input.bin");
  await fsp.writeFile(binFilePath, Uint8Array.from(bin));

  const rawFileRootPath = path.resolve(tmpDir, "output");

  await execa(
    "scripts/wine.sh",
    [
      "nedcmake.exe",
      "-type",
      "3",
      "-i",
      binFilePath,
      "-o",
      rawFileRootPath,
      "-name",
      "Pixel Pup",
    ],
    {
      cwd: "/home/matt/dev/ereaderz80",
    },
  );

  const raw1Path = `${rawFileRootPath}-01.raw`;
  const raw2Path = `${rawFileRootPath}-02.raw`;

  let moreThanOneRaw = false;
  try {
    if ((await fsp.stat(raw2Path)).isFile()) {
      moreThanOneRaw = true;
    }
  } catch {
    // this happens if the second raw doesn't exist, which is great
  }

  if (moreThanOneRaw) {
    throw new Error("This puzzle collection generated more than one .raw");
  }

  const rawData = await fsp.readFile(raw1Path);

  // console.log("raw created", raw1Path);

  return Array.from(new Uint8Array(rawData));
}

function corrupt(bin: number[]): number[] {
  const copy = [...bin];

  for (let i = 50; i < copy.length; i += 5) {
    copy[i] = 0;
    copy[i + 1] = 0;
    copy[i + 3] = 0;
  }

  return copy;
}

function toWordArray(word: number): number[] {
  const highByte = word >> 8;
  const lowByte = word & 0xff;

  return [lowByte, highByte];
}

async function assemblePuzzlePaintingFunction(
  entriesPerRow: number,
  puzzleCount: number,
  org: number,
  symbols: Record<string, number>,
  asmPath?: string,
): Promise<number[]> {
  let additionalAsm = "ret";
  if (asmPath) {
    const rawAdditionalAsm = (await fsp.readFile(asmPath)).toString();
    additionalAsm = substituteSymbols(rawAdditionalAsm, symbols);
  }

  const numRows = puzzleCount / entriesPerRow;
  if (numRows !== Math.floor(numRows)) {
    throw new Error(
      `assemblePuzzlePaintingFunction: painting is not rectangular, entriesPerRow: ${entriesPerRow}, puzzleCount: ${puzzleCount}, numRows: ${numRows}`,
    );
  }
  // this is because puzzles are scaled 2x in the menu
  const puzzleSizePx = 30;
  const span = puzzleSizePx;
  const startX = Math.floor(240 / 2 - (entriesPerRow * span) / 2 + span / 2);
  const startY = Math.floor(160 / 2 - (numRows * span) / 2 + span / 2);
  const cursorStartY = startY - 16;

  // note that start_x and cursor_start_x are the same, so skipping a ld

  const asmSrc = `puzzle_painting_patch_menu:
ld a, ${startX}
ld (${symbols["_pm_start_x"]}), a
ld (${symbols["_pm_cursor_start_x"]}), a
ld a, ${startY}
ld (${symbols["_pm_start_y"]}), a
ld a, ${cursorStartY}
ld (${symbols["_pm_cursor_start_y"]}), a
ld a, ${span}
ld (${symbols["_pm_span"]}), a
ld a, ${entriesPerRow}
ld (${symbols["_pm_entries_per_row"]}), a
${additionalAsm}`;

  return assembleFromSrc(asmSrc, org);
}

function substituteSymbols(
  src: string,
  symbols: Record<string, number>,
): string {
  const lines = src.split("\n");

  const substitutedLines = lines.map((l) => {
    const regex = /\$\$\$([_a-zA-Z0-9]+)\$\$\$/g;

    let subbedLine = (" " + l).slice(1);
    let result = regex.exec(l);

    while (result) {
      console.log("about to sub", result[0], result[1], symbols[result[1]]);
      subbedLine = subbedLine.replace(result[0], symbols[result[1]].toString());
      result = regex.exec(l);
    }

    return subbedLine;
  });

  const substitutedSrc = substitutedLines.join("\n");

  return substitutedSrc;
}

async function assemblePuzzleCollectionAsm(
  asmPath: string,
  symbols: Record<string, number>,
  org: number,
) {
  const rawAsmSrc = (await fsp.readFile(asmPath)).toString();

  const finalAsmSrc = substituteSymbols(rawAsmSrc, symbols);

  return assembleFromSrc(finalAsmSrc, org);
}

async function processPuzzlePainting(
  spec: PuzzlePaintingSpec,
  startingId: number,
  symbols: Record<string, number>,
  warnIllegal: boolean,
): Promise<{ id: number; bin: number[] }> {
  const pieceFiles = await splitPuzzlePainting(spec);

  const puzzleBinaries: number[][] = [];
  const allHintNumbers: number[] = [];

  for (let i = 0; i < pieceFiles.length; ++i) {
    const pieceFile = pieceFiles[i];
    const puzzleSpec: PuzzleSpec = {
      file: pieceFile,
      name: `Piece ${i + 1}`,
    };

    const { bin: puzzleBin, hintNumbers } = await processPuzzle(
      puzzleSpec,
      startingId++,
      warnIllegal,
      spec.palette,
      spec.tileSize,
    );

    allHintNumbers.push(...hintNumbers);
    puzzleBinaries.push(puzzleBin);
  }

  const mascotBin = await processMascot(spec);
  const paletteBin = await getPackPalette(spec.palette);
  assert(
    paletteBin.length === 32,
    `paletteBin unexpected length: ${paletteBin.length}`,
  );

  let puzzleCollectionBin: number[] = [
    0,
    0,
    ...paletteBin,
    ...mascotBin,
    spec.bgId,
    ...toWordArray(spec.bgmId),
    pieceFiles.length,
    ...puzzleBinaries.flat(1),
  ];

  const org = symbols["scan_puzzle_buffer"] + puzzleCollectionBin.length;
  const asmBin = await assemblePuzzlePaintingFunction(
    spec.paintingEntriesPerRow,
    pieceFiles.length,
    org,
    symbols,
    spec.asm,
  );

  const funcAddress = toWordArray(org);

  puzzleCollectionBin[0] = funcAddress[0];
  puzzleCollectionBin[1] = funcAddress[1];

  puzzleCollectionBin = puzzleCollectionBin.concat(asmBin);

  return { id: startingId, bin: puzzleCollectionBin };
}

async function getPackPalette(palettePath: string): Promise<number[]> {
  const paletteCanvas = await createCanvasFromPath(palettePath);
  if (paletteCanvas.width !== 15) {
    throw new Error(
      `Invalid sized palette: should be 15px wide, got: ${paletteCanvas.width}`,
    );
  }
  if (paletteCanvas.height !== 1) {
    throw new Error(
      `Invalid sized palette: should be 1px tall, got: ${paletteCanvas.height}`,
    );
  }

  // this palette has the words in single numbers, they need to be separated out to bytes
  const gbaPalette = getForcedPalette(paletteCanvas);

  return gbaPalette.flatMap((c) => {
    return toWordArray(c);
  });
}

async function processCollection(
  spec: PuzzleCollectionSpec,
  startingId: number,
  symbols: Record<string, number>,
  warnIllegal: boolean,
): Promise<{ id: number; bin: number[] }> {
  const puzzleBinaries: number[][] = [];
  const allHintNumbers: number[] = [];

  if (spec.puzzles.length > MAX_NUM_PUZZLES_IN_COLLECTION) {
    throw new Error(
      `${spec.name} has too many puzzles (${spec.puzzles.length})`,
    );
  }

  const puzzles = spec.puzzles.filter((p) => !p.skip);

  for (let i = 0; i < puzzles.length; ++i) {
    const puzzleSpec = puzzles[i];
    const { bin: puzzleBin, hintNumbers } = await processPuzzle(
      puzzleSpec,
      startingId++,
      warnIllegal,
      spec.palette,
    );
    allHintNumbers.push(...hintNumbers);
    puzzleBinaries.push(puzzleBin);
  }

  const mascotBin = await processMascot(spec);
  const paletteBin = await getPackPalette(spec.palette);
  assert(
    paletteBin.length === 32,
    `paletteBin unexpected length: ${paletteBin.length}`,
  );

  let puzzleCollectionBin: number[] = [
    // function pointer, zero by default
    0,
    0,
    ...paletteBin,
    ...mascotBin,
    spec.bgId,
    ...toWordArray(spec.bgmId),
    puzzles.length,
    ...puzzleBinaries.flat(1),
  ];

  if (spec.asm) {
    const org = symbols["scan_puzzle_buffer"] + puzzleCollectionBin.length;
    const asmBin = await assemblePuzzleCollectionAsm(spec.asm, symbols, org);

    const funcAddress = toWordArray(org);
    puzzleCollectionBin[0] = funcAddress[0];
    puzzleCollectionBin[1] = funcAddress[1];

    puzzleCollectionBin = puzzleCollectionBin.concat(asmBin);
  }

  return { id: startingId, bin: puzzleCollectionBin };
}

async function getSymbols(
  symFilePath: string,
): Promise<Record<string, number>> {
  const symbolTxt = (await fsp.readFile(symFilePath)).toString();
  const symbols = parseSymbols(symbolTxt);

  return symbols.symbolToAddress;
}

async function main(spec: JsonSpec, warnIllegal: boolean) {
  let startingId = spec.startingId ?? 0;

  const symbols = await getSymbols(spec.mainSymFile);

  for (const collectionSpec of spec.collections) {
    console.log("processing", collectionSpec.name);
    let result;
    if (isPuzzleCollection(collectionSpec)) {
      result = await processCollection(
        collectionSpec,
        startingId,
        symbols,
        warnIllegal,
      );
    } else {
      result = await processPuzzlePainting(
        collectionSpec,
        startingId,
        symbols,
        warnIllegal,
      );
    }

    startingId = result.id;

    const binPath = path.resolve(spec.outputDir, `${collectionSpec.name}.bin`);
    await fsp.writeFile(binPath, Uint8Array.from(result.bin));
    console.log("wrote", binPath, "size", result.bin.length);

    const cSrc = toCSrc(result.bin);
    const cSrcRootPath = path.resolve(spec.outputDir, collectionSpec.name);
    await fsp.writeFile(cSrcRootPath + ".h", cSrc.header);
    await fsp.writeFile(cSrcRootPath + ".c", cSrc.src);
    console.log("wrote", cSrcRootPath + ".h");
    console.log("wrote", cSrcRootPath + ".c");

    const asmSrc = toAsm(result.bin);
    const asmSrcPath = path.resolve(
      spec.outputDir,
      collectionSpec.name + ".asm",
    );
    await fsp.writeFile(asmSrcPath, asmSrc);
    console.log("wrote", asmSrcPath);

    const vpkBin = await compress(result.bin);
    const vpkPath = path.resolve(spec.outputDir, `${collectionSpec.name}.vpk`);
    await fsp.writeFile(vpkPath, Uint8Array.from(vpkBin));
    console.log("wrote", vpkPath, vpkBin.length);

    const rawBin = await createRaw(vpkBin);
    const rawPath = path.resolve(spec.outputDir, `${collectionSpec.name}.raw`);
    await fsp.writeFile(rawPath, Uint8Array.from(rawBin));
    console.log("wrote", rawPath);

    const decodedRawBin = await decodeRaw(rawBin);
    const decodedRawPath = path.resolve(
      spec.outputDir,
      `${collectionSpec.name}.decoded.bin`,
    );
    await fsp.writeFile(decodedRawPath, Uint8Array.from(decodedRawBin));
    console.log("wrote", decodedRawPath);

    if (collectionSpec.generateCorrupt) {
      const corruptRawBin = corrupt(rawBin);
      const corruptRawPath = path.resolve(
        spec.outputDir,
        `${collectionSpec.name}.corrupt.raw`,
      );
      await fsp.writeFile(corruptRawPath, Uint8Array.from(corruptRawBin));
      console.log("wrote", corruptRawPath);
    }
  }
}

if (require.main === module) {
  const [_tsNode, _puzzleCollectionGeneratorMain, inputJsonSpecPath, warn] =
    process.argv;

  if (!inputJsonSpecPath) {
    console.error(
      "usage: ts-node puzzleCollectionGenerator/main.ts <json-spec-path> [warn]",
    );
    process.exit(1);
  }

  const jsonSpecPath = path.resolve(inputJsonSpecPath);
  const jsonSpec = hydrateJsonSpec(jsonSpecPath);

  main(jsonSpec, warn === "warn")
    .then(() => console.log("done"))
    .catch((e) => console.error(e));
}
