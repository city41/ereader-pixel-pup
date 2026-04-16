import * as path from "node:path";
import {
  JsonSpec,
  PuzzleCollectionSpec,
  PuzzlePaintingSpec,
} from "../../../src/puzzleCollectionGenerator/types";
import {
  ERAPI_KEY_A,
  ERAPI_KEY_DOWN,
  ERAPI_KEY_RIGHT,
} from "../../../src/EReaderRunner/inputs";
import { createRunner } from "../../integration/nonogram/createRunner";
import { splitPuzzlePainting } from "../../../src/puzzleCollectionGenerator/puzzle";

function isPuzzleCollection(
  spec: PuzzleCollectionSpec | PuzzlePaintingSpec
): spec is PuzzleCollectionSpec {
  return "puzzles" in spec;
}

async function getIdForPuzzle(
  index: number,
  binPath: string,
  vpkPath: string
): Promise<number> {
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

  runner.runUntil(
    "choose puzzle",
    [...rights, ...downs, ERAPI_KEY_A],
    (result) => {
      return result.getByte(symbols.symbolToAddress["chosen_puzzle"]) !== 0;
    },
    { halts: 1 }
  );

  const puzzleAddress = runner.getWord(
    symbols.symbolToAddress["chosen_puzzle"]
  );

  return runner.getWord(puzzleAddress);
}

async function getIdsForPuzzleCollection(
  collection: PuzzleCollectionSpec
): Promise<number[]> {
  const binPath = path.resolve(
    process.cwd(),
    `src/nonogram/puzzles/output/${collection.name}.bin`
  );
  const decodedRawPath = path.resolve(
    process.cwd(),
    `src/nonogram/puzzles/output/${collection.name}.decoded.bin`
  );

  const puzzles = collection.puzzles.filter((p) => !p.skip);
  const ids: number[] = [];

  for (let p = 0; p < puzzles.length; ++p) {
    const id = await getIdForPuzzle(p, binPath, decodedRawPath);

    ids.push(id);
  }

  return ids;
}

async function getIdsForPaintingCollection(
  collection: PuzzlePaintingSpec
): Promise<number[]> {
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

  const ids: number[] = [];

  for (let i = 0; i < pieceFiles.length; ++i) {
    const id = await getIdForPuzzle(i, binPath, decodedRawPath);
    ids.push(id);
  }

  return ids;
}

function sortNumerically(a: number, b: number): number {
  return a - b;
}

describe("puzzle ids", function () {
  it("should have a unique id for each puzzle", async function () {
    const puzzleJson =
      require("../../../src/nonogram/puzzles/puzzles.json") as JsonSpec;

    const allIds: Record<number, boolean> = {};

    for (const collection of puzzleJson.collections) {
      let ids: number[];
      if (isPuzzleCollection(collection)) {
        ids = await getIdsForPuzzleCollection(collection);
      } else {
        ids = await getIdsForPaintingCollection(collection);
      }

      for (const id of ids) {
        expect(allIds[id]).toBe(undefined);
        allIds[id] = true;
      }
    }

    // now assert all ids are consecutive and start at zero
    const justIds = Object.keys(allIds)
      .map((stringId) => Number(stringId))
      .sort(sortNumerically);

    for (let i = 0; i < justIds.length; ++i) {
      expect(justIds[i]).toEqual(i);
    }
  });
});
