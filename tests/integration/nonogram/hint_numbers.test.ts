import { createRunner } from "./createRunner";
import {
  ERAPI_KEY_A,
  ERAPI_KEY_LEFT,
  ERAPI_KEY_RIGHT,
} from "../../../src/EReaderRunner/inputs";

describe("hint_numbers", function () {
  it("should zero out the numbers so previous puzzle numbers dont pollute the current puzzle", async function () {
    const { runner, symbols } = await createRunner();
    runner.runUntil(
      "scan in a card then choose first puzzle",
      [ERAPI_KEY_A, ERAPI_KEY_A],
      (result) => {
        return (
          result.getByte(symbols.symbolToAddress["_b_cur_size_tile"]) === 8
        );
      },
      { halts: 1 },
    );

    runner.runUntil(
      "make a mistake repeatedly until it is game over",
      [
        ERAPI_KEY_LEFT,
        ERAPI_KEY_A,
        ERAPI_KEY_A,
        ERAPI_KEY_A,
        ERAPI_KEY_A,
        ERAPI_KEY_A,
        ERAPI_KEY_A,
        ERAPI_KEY_A,
        ERAPI_KEY_A,
        ERAPI_KEY_A,
      ],
      (result) => {
        return result.getByte(symbols.symbolToAddress["clock_empty"]) === 1;
      },
      { halts: 1 },
    );

    const secondPuzzleResult = runner.runUntil(
      "load the second puzzle",
      [ERAPI_KEY_A, ERAPI_KEY_RIGHT, ERAPI_KEY_A],
      (result) => {
        return (
          result.getPCCount(
            symbols.symbolToAddress["calc_hint_numbers_calculate"],
          ) === 1
        );
      },
      { halts: 1 },
    );

    const topHintNumbers = secondPuzzleResult.getByteSpan(
      symbols.symbolToAddress["hint_numbers_top"],
      120,
    );

    const leftHintNumbers = secondPuzzleResult.getByteSpan(
      symbols.symbolToAddress["hint_numbers_left"],
      120,
    );

    const expectedTopHintNumbers = [
      3, 0, 0, 0, 0, 0, 0, 0, 2, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 2,
      1, 1, 1, 0, 0, 0, 0, 2, 4, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 2, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ];

    const expectedLeftHintNumbers = [
      3, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 1,
      1, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 5, 0,
      0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ];

    expect(topHintNumbers).toEqual(expectedTopHintNumbers);
    expect(leftHintNumbers).toEqual(expectedLeftHintNumbers);
  });
});
