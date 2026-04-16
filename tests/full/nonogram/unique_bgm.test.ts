import { JsonSpec } from "../../../src/puzzleCollectionGenerator/types";

describe("unique bgm", function () {
  it("should have a unique bgm for each puzzle pack", function () {
    const puzzleJson =
      require("../../../src/nonogram/puzzles/puzzles.json") as JsonSpec;

    const bgmIds: Record<number, boolean> = {};

    for (const collection of puzzleJson.collections) {
      if (bgmIds[collection.bgmId]) {
        throw new Error(`bgm id ${collection.bgmId} was used more than once`);
      }
      bgmIds[collection.bgmId] = true;
    }
  });
});
