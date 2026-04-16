import * as path from "node:path";
import {
  JsonSpec,
  PuzzleCollectionSpec,
  PuzzlePaintingSpec,
  PuzzleSpec,
} from "../../../src/puzzleCollectionGenerator/types";
import {
  ERAPI_KEY_A,
  ERAPI_KEY_DOWN,
  ERAPI_KEY_RIGHT,
} from "../../../src/EReaderRunner/inputs";
import { createRunner } from "../../integration/nonogram/createRunner";
import { createCanvasFromPath } from "@city41/gba-convertpng/dist/canvas";
import {
  calcPuzzleSizeAndWinFillCount,
  isSolidTile,
  splitPuzzlePainting,
} from "../../../src/puzzleCollectionGenerator/puzzle";
import { fillTile } from "../../util/nonogram/puzzleUtil";

function isPuzzleCollection(
  spec: PuzzleCollectionSpec | PuzzlePaintingSpec
): spec is PuzzleCollectionSpec {
  return "puzzles" in spec;
}

async function validateSolvePuzzle(
  puzzle: PuzzleSpec,
  palettePath: string,
  index: number,
  binPath: string,
  decodedRawPath: string
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

  const { effectiveSizeInTiles: sizeInTiles, winFillCount } =
    calcPuzzleSizeAndWinFillCount(canvas as any, palette);

  const { runner, symbols } = await createRunner(decodedRawPath, binPath);

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

  runner.runUntil(
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

  let tilesToGo = winFillCount;

  // go through and fill all tiles that make up the puzzle
  for (let y = 0; y < sizeInTiles; ++y) {
    for (let x = 0; x < sizeInTiles; ++x) {
      if (isSolidTile(canvas as any, palette, x, y)) {
        await fillTile(runner, symbols.symbolToAddress, sizeInTiles, x, y);
        tilesToGo -= 1;

        if (tilesToGo === 0) {
          break;
        }
      }
    }
  }

  // assert we are on the win screen
  expect(runner.getPCCount(symbols.symbolToAddress["game_won_run"])).toEqual(1);

  // assert the puzzle id got saved to flash

  runner.runUntil(
    "Flash save has happened",
    [],
    (result) => {
      return (
        result.getPCCount(
          symbols.symbolToAddress["flash_set_puzzle_cleared"]
        ) === 1
      );
    },
    { halts: 1 }
  );

  // now form what was expected to be saved based on the puzzle that was
  // just solved

  // get the puzzle id
  const chosenPuzzlePointer = runner.getWord(
    symbols.symbolToAddress["chosen_puzzle"]
  );
  const puzzleId = runner.getWord(chosenPuzzlePointer);

  const expectedSaveBuffer = new Array(32).fill(0);
  const byteIndex = Math.floor(puzzleId / 8);
  const bitIndex = puzzleId % 8;
  const puzzleSaveByte = 1 << bitIndex;
  expectedSaveBuffer[byteIndex] = puzzleSaveByte;

  const actualSaveBuffer = runner.getByteSpan(
    symbols.symbolToAddress["_f_save_data"],
    32
  );
  expect(actualSaveBuffer).toEqual(expectedSaveBuffer);
}

async function solvePuzzleCollection(collection: PuzzleCollectionSpec) {
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
    console.log(puzzle.file);
    await validateSolvePuzzle(
      puzzle,
      collection.palette,
      p,
      binPath,
      decodedRawPath
    );
  }
}

async function solvePuzzlePaintingCollection(collection: PuzzlePaintingSpec) {
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

    console.log(puzzleSpec.name);
    await validateSolvePuzzle(
      puzzleSpec,
      collection.palette,
      i,
      binPath,
      decodedRawPath
    );
  }
}

describe("solve all puzzles", function () {
  it(
    "should solve all puzzles",
    async function () {
      const puzzleJson =
        require("../../../src/nonogram/puzzles/puzzles.json") as JsonSpec;

      for (const collection of puzzleJson.collections) {
        console.log("processing collection", collection.name);

        if (isPuzzleCollection(collection)) {
          await solvePuzzleCollection(collection);
        } else {
          await solvePuzzlePaintingCollection(collection);
        }
      }
    },
    // 10 minutes
    1000 * 60 * 10
  );
});

export { fillTile };
