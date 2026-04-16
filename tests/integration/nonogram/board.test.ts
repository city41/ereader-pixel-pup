import { createRunner } from "./createRunner";
import {
  ERAPI_KEY_A,
  ERAPI_KEY_LEFT,
  ERAPI_KEY_RIGHT,
} from "../../../src/EReaderRunner/inputs";

describe("board", function () {
  // I hardcode the function to return a=1 at times during dev
  // this verifies I don't accidentally leave that in
  it("should not return a hard coded 1 for board_check_win", async function () {
    const { runner, symbols } = await createRunner();

    const firstWordOfFunction = runner.getWord(
      symbols.symbolToAddress["board_check_win"],
    );

    // the opcode is 2 bytes 3e N, but since the z80 is little endian
    // it is stored N 3e
    const LDA_1 = 0x13e;

    expect(firstWordOfFunction).not.toBe(LDA_1);
  });

  it("should calculate the chosen puzzle correctly", async function () {
    const { runner, symbols } = await createRunner();

    const boardResult = runner.runUntil(
      "scan in a card then choose first puzzle",
      [ERAPI_KEY_A, ERAPI_KEY_A],
      (result) => {
        return (
          result.getByte(symbols.symbolToAddress["_b_cur_size_tile"]) !== 0
        );
      },
      { halts: 1 },
    );

    expect(
      boardResult.getByte(symbols.symbolToAddress["_b_cur_size_tile"]),
    ).toBe(8);

    expect(boardResult.getByte(symbols.symbolToAddress["_b_cur_size_px"])).toBe(
      48,
    );

    expect(
      boardResult.getByte(
        symbols.symbolToAddress["_b_total_filled_count_to_win"],
      ),
    ).toBe(27);

    expect(
      boardResult.getByte(symbols.symbolToAddress["_b_cur_rightbottom"]),
    ).toBe(2 + 48);

    const filledTiles = boardResult.getByteSpan(
      symbols.symbolToAddress["_b_filled_tiles"],
      15 * 15,
    );

    const expectedFilledTiles = new Array(15 * 15).fill(0);

    expect(filledTiles).toEqual(expectedFilledTiles);
  });

  describe("loading a second board", function () {
    async function playUntilSecondBoard() {
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

      runner.runUntil(
        "fill in a tile so filled_tiles is not empty",
        [ERAPI_KEY_RIGHT, ERAPI_KEY_A],
        (result) => {
          return (
            result.getByte(symbols.symbolToAddress["_b_filled_tiles"] + 1) !== 0
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

      runner.runUntil(
        "load a second puzzle",
        [ERAPI_KEY_A, ERAPI_KEY_RIGHT, ERAPI_KEY_RIGHT, ERAPI_KEY_A],
        (result) => {
          return (
            result.getPCCount(symbols.symbolToAddress["board_load_puzzle"]) ===
            2
          );
        },
        { halts: 1 },
      );

      return { runner, symbols };
    }

    it.skip("should reset all state", async function () {
      const { runner, symbols } = await playUntilSecondBoard();

      const filledTiles = runner.getByteSpan(
        symbols.symbolToAddress["_b_filled_tiles"],
        15 * 15,
      );

      const expectedFilledTiles = new Array(15 * 15).fill(0);

      expect(filledTiles).toEqual(expectedFilledTiles);

      const lastTileValue = runner.getByte(
        symbols.symbolToAddress["_b_last_tile_value"],
      );

      expect(lastTileValue).toBe(0);

      const curFillCount = runner.getByte(
        symbols.symbolToAddress["_b_cur_filled_count"],
      );

      expect(curFillCount).toBe(0);
    });
  });
});
