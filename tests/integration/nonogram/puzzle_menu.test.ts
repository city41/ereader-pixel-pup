import * as path from "node:path";
import {
  ERAPI_KEY_A,
  ERAPI_KEY_RIGHT,
} from "../../../src/EReaderRunner/inputs";
import { puzzleCollectionOffsets } from "./puzzleCollectionOffsets";
import { puzzleOffsets, puzzleSizes } from "./puzzleOffsets";
import { createRunner } from "./createRunner";

function getPuzzleAddress(
  puzzleIndex: number,
  collectionAddress: number,
  puzzleCollectionBin: number[],
): number {
  let pcIndex = puzzleCollectionOffsets.puzzles;
  for (let i = 0; i < puzzleIndex; ++i) {
    const size = puzzleCollectionBin[pcIndex + puzzleOffsets.size];

    // large puzzle
    switch (size) {
      case 0:
      case 1:
        pcIndex += puzzleSizes.smallMediumPuzzle;
        break;
      case 2:
        pcIndex += puzzleSizes.largePuzzle;
        break;
      default: {
        throw new Error(`getPuzzleAddress, unexpected size: ${size}`);
      }
    }
  }

  return collectionAddress + pcIndex;
}

describe("puzzle_menu", function () {
  let entomologyCollection: any;

  beforeAll(() => {
    const puzzleJson = require(path.resolve("./puzzles/puzzles.json"));
    entomologyCollection = puzzleJson.collections.find(
      (c: any) => c.name === "entomology",
    );
    expect(entomologyCollection).toBeDefined();
  });

  it("should correctly determine the number of puzzles in the collection", async function () {
    const { runner, symbols } = await createRunner();

    const puzzleCount = entomologyCollection.puzzles.length;
    expect(puzzleCount).toBeGreaterThan(0);

    const finalResult = runner.runUntil(
      "scan card and load puzzle menu",
      [ERAPI_KEY_A],
      (result) => {
        return (
          result.getByte(symbols.symbolToAddress["_pm_puzzle_count"]) ===
          puzzleCount
        );
      },
    );

    expect(
      finalResult.getByte(symbols.symbolToAddress["_pm_puzzle_count"]),
    ).toBe(puzzleCount);
  });

  it("should set chosen_puzzle to the first puzzle", async function () {
    const { runner, puzzleCardBin, symbols } = await createRunner();
    const puzzleCount = entomologyCollection.puzzles.length;

    const puzzleMenuResult = runner.runUntil(
      "scan card and load puzzle menu",
      [ERAPI_KEY_A],
      (result) => {
        return (
          result.getByte(symbols.symbolToAddress["_pm_puzzle_count"]) ===
          puzzleCount
        );
      },
    );

    expect(
      puzzleMenuResult.getWord(symbols.symbolToAddress["chosen_puzzle"]),
    ).toEqual(0);

    const chosenPuzzleResult = runner.runUntil(
      "choose first puzzle in menu",
      [ERAPI_KEY_A],
      (result) => {
        return result.getWord(symbols.symbolToAddress["chosen_puzzle"]) !== 0;
      },
    );

    expect(
      chosenPuzzleResult.getWord(symbols.symbolToAddress["chosen_puzzle"]),
    ).toBe(
      getPuzzleAddress(
        0,
        symbols.symbolToAddress["scan_puzzle_buffer"],
        puzzleCardBin,
      ),
    );
  });

  it("should set chosen_puzzle to the third puzzle", async function () {
    const { runner, puzzleCardBin, symbols } = await createRunner();
    const puzzleCount = entomologyCollection.puzzles.length;

    runner.runUntil(
      "scan card and choose first puzzle",
      [ERAPI_KEY_A],
      (result) => {
        return (
          result.getByte(symbols.symbolToAddress["_pm_puzzle_count"]) ===
          puzzleCount
        );
      },
    );

    const chosenPuzzleResult = runner.runUntil(
      "navigate to third puzzle and choose it",
      [ERAPI_KEY_RIGHT, ERAPI_KEY_RIGHT, ERAPI_KEY_A],
      (result) => {
        return result.getWord(symbols.symbolToAddress["chosen_puzzle"]) !== 0;
      },
    );

    expect(
      chosenPuzzleResult.getWord(symbols.symbolToAddress["chosen_puzzle"]),
    ).toBe(
      getPuzzleAddress(
        2,
        symbols.symbolToAddress["scan_puzzle_buffer"],
        puzzleCardBin,
      ),
    );
  });
});
