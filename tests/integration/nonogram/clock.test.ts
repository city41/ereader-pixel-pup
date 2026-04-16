import { ERAPI_KEY_A } from "../../../src/EReaderRunner/inputs";
import { createRunner } from "./createRunner";

describe("clock", function () {
  it("should set clock_empty to 1 when the time runs out", async function () {
    const { runner, symbols } = await createRunner();

    runner.runUntil(
      "scan in a card, choose first puzzle",
      [ERAPI_KEY_A, ERAPI_KEY_A],
      (result) => {
        return (
          result.getByte(symbols.symbolToAddress["_b_cur_size_tile"]) === 8
        );
      },
      { halts: 1 },
    );

    const emptyClockResult = runner.runUntil(
      "clock runs out",
      [],
      (result) => {
        return result.getPCCount(symbols.symbolToAddress["_g_game_over"]) === 1;
      },
      { haltMinutesTimeout: 32 },
    );

    expect(
      emptyClockResult.getWord(symbols.symbolToAddress["clock_empty"]),
    ).toBe(1);

    expect(
      emptyClockResult.getWord(
        symbols.symbolToAddress["clock_seconds_counter"],
      ),
    ).toBe(0);

    expect(
      emptyClockResult.getPCCount(symbols.symbolToAddress["_g_game_over"]),
    ).toBe(1);
  });

  it("should go down by one second after 60 frames", async function () {
    const { runner, symbols } = await createRunner();

    runner.runUntil(
      "scan in a card, choose first puzzle",
      [ERAPI_KEY_A, ERAPI_KEY_A],
      (result) => {
        return (
          result.getByte(symbols.symbolToAddress["_b_cur_size_tile"]) === 8
        );
      },
    );

    const oneSecondResult = runner.runUntil(
      "run game for one second",
      [],
      (result) => {
        return result.getPCCount(symbols.symbolToAddress["clock_frame"]) === 60;
      },
    );

    const secondCounter = oneSecondResult.getWord(
      symbols.symbolToAddress["clock_seconds_counter"],
    );
    expect(secondCounter).toBeGreaterThan(0);

    const secondSecondResult = runner.runUntil(
      "run game for one more second",
      [],
      (result) => {
        return (
          result.getPCCount(symbols.symbolToAddress["clock_frame"]) === 120
        );
      },
    );

    const secondCounter2 = secondSecondResult.getWord(
      symbols.symbolToAddress["clock_seconds_counter"],
    );
    // the counter is two off due to choosing first puzzle causes one frame to elapse
    expect(secondCounter2 + 2).toEqual(secondCounter);
  });
});
