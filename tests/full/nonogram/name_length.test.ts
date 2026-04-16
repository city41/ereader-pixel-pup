import * as path from "node:path";
import "jest-expect-message";
import {
  JsonSpec,
  PuzzleCollectionSpec,
  PuzzlePaintingSpec,
} from "../../../src/puzzleCollectionGenerator/types";

function isPuzzleCollection(
  collection: PuzzleCollectionSpec | PuzzlePaintingSpec
): collection is PuzzleCollectionSpec {
  return "puzzles" in collection;
}

describe("name length", function () {
  it("should have a all puzzles with names 12 characters or less", function () {
    const puzzleJson =
      require("../../../src/nonogram/puzzles/puzzles.json") as JsonSpec;

    for (const collection of puzzleJson.collections) {
      if (isPuzzleCollection(collection)) {
        for (const puzzle of collection.puzzles) {
          const name = puzzle.name ?? path.basename(puzzle.file, ".png");
          expect(
            name.length,
            `${name} has too many characters (${name.length})`
          ).toBeLessThan(13);
        }
      }
    }
  });
});
