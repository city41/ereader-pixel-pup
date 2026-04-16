import "jest-expect-message";
import * as path from "node:path";
import {
  JsonSpec,
  PuzzleCollectionSpec,
  PuzzlePaintingSpec,
  PuzzleSpec,
} from "../../../src/puzzleCollectionGenerator/types";
import { createRunner } from "../../integration/nonogram/createRunner";
import {
  ERAPI_KEY_A,
  ERAPI_KEY_DOWN,
  ERAPI_KEY_RIGHT,
} from "../../../src/EReaderRunner/inputs";
import { createCanvasFromPath } from "@city41/gba-convertpng/dist/canvas";
import {
  calcLeftHintNumbers,
  calcTopHintNumbers,
} from "../../../src/puzzleCollectionGenerator/hintNumbers";
import {
  calcPuzzleSizeAndWinFillCount,
  splitPuzzlePainting,
} from "../../../src/puzzleCollectionGenerator/puzzle";

function isPuzzleCollection(
  spec: PuzzleCollectionSpec | PuzzlePaintingSpec
): spec is PuzzleCollectionSpec {
  return "puzzles" in spec;
}

async function validateHintNumbers(
  puzzle: PuzzleSpec,
  palettePath: string,
  index: number,
  binPath: string,
  vpkPath: string
) {
  const canvas = await createCanvasFromPath(
    path.resolve(process.cwd(), "src/nonogram/puzzles/", puzzle.file)
  );

  const paletteCanvas = await createCanvasFromPath(
    path.resolve(process.cwd(), "src/nonogram/puzzles/", palettePath)
  );
  if (paletteCanvas.width !== 15) {
    throw new Error(
      `Invalid sized palette: should be 15px wide, got: ${paletteCanvas.width}`
    );
  }
  if (paletteCanvas.height !== 1) {
    throw new Error(
      `Invalid sized palette: should be 1px tall, got: ${paletteCanvas.height}`
    );
  }

  const palette = paletteCanvas
    .getContext("2d")
    .getImageData(0, 0, paletteCanvas.width, paletteCanvas.height).data;

  const { effectiveSizeInTiles: sizeInTiles } = calcPuzzleSizeAndWinFillCount(
    canvas as any,
    palette
  );

  const { flatFullHintNumbers: expectedTopHintNumbers } = calcTopHintNumbers(
    canvas as any,
    palette,
    sizeInTiles
  );
  const { flatFullHintNumbers: expectedLeftHintNumbers } = calcLeftHintNumbers(
    canvas as any,
    palette,
    sizeInTiles
  );

  const { runner, symbols } = await createRunner(vpkPath, binPath);

  runner.runUntil(
    "scan in a card",
    [ERAPI_KEY_A],
    (result) => {
      return result.getByte(symbols.symbolToAddress["_pm_num_rows"]) !== 0;
    },
    { halts: 1 }
  );

  const entriesPerRow = runner.getByte(
    symbols.symbolToAddress["_pm_entries_per_row"]
  );

  const rights = new Array(index % entriesPerRow).fill(ERAPI_KEY_RIGHT);
  const downs = new Array(Math.floor(index / entriesPerRow)).fill(
    ERAPI_KEY_DOWN
  );

  const hintNumberResult = runner.runUntil(
    "choose puzzle",
    [...rights, ...downs, ERAPI_KEY_A],
    (result) => {
      return (
        result.getByte(symbols.symbolToAddress["_b_cur_size_tile"]) ===
        sizeInTiles
      );
    },
    { halts: 1 }
  );

  const topHintNumbers = hintNumberResult.getByteSpan(
    symbols.symbolToAddress["hint_numbers_top"],
    120
  );

  expect(topHintNumbers, `top hint numbers for ${puzzle.file}`).toEqual(
    expectedTopHintNumbers
  );

  const leftHintNumbers = hintNumberResult.getByteSpan(
    symbols.symbolToAddress["hint_numbers_left"],
    120
  );

  expect(leftHintNumbers, `left hint numbers for ${puzzle.file}`).toEqual(
    expectedLeftHintNumbers
  );
}

async function processPuzzleCollection(collection: PuzzleCollectionSpec) {
  const binPath = path.resolve(
    process.cwd(),
    `src/nonogram/puzzles/output/${collection.name}.bin`
  );
  const decodedRawPath = path.resolve(
    process.cwd(),
    `src/nonogram/puzzles/output/${collection.name}.decoded.bin`
  );

  const puzzles = collection.puzzles.filter((p) => !p.skip);

  for (let p = 0; p < puzzles.length; ++p) {
    const puzzle = puzzles[p];
    await validateHintNumbers(
      puzzle,
      collection.palette,
      p,
      binPath,
      decodedRawPath
    );
  }
}

async function processPuzzlePaintingCollection(collection: PuzzlePaintingSpec) {
  const binPath = path.resolve(
    process.cwd(),
    `src/nonogram/puzzles/output/${collection.name}.bin`
  );
  const decodedRawPath = path.resolve(
    process.cwd(),
    `src/nonogram/puzzles/output/${collection.name}.decoded.bin`
  );

  const pieceFiles = await splitPuzzlePainting({
    ...collection,
    paintingFile: path.resolve(
      process.cwd(),
      "src/nonogram/puzzles",
      collection.paintingFile
    ),
  });

  for (let i = 0; i < pieceFiles.length; ++i) {
    const pieceFile = pieceFiles[i];
    const puzzleSpec: PuzzleSpec = {
      file: pieceFile,
      name: `piece ${i}`,
    };

    await validateHintNumbers(
      puzzleSpec,
      collection.palette,
      i,
      binPath,
      decodedRawPath
    );
  }
}

describe("full hint_numbers", function () {
  it("should calculate correct hint numbers for all puzzles", async function () {
    const puzzleJson =
      require("../../../src/nonogram/puzzles/puzzles.json") as JsonSpec;

    for (const collection of puzzleJson.collections) {
      if (isPuzzleCollection(collection)) {
        await processPuzzleCollection(collection);
      } else {
        await processPuzzlePaintingCollection(collection);
      }
    }
  });
});
