import { createRunner } from "./createRunner";
import {
  ERAPI_KEY_A,
  ERAPI_KEY_DOWN,
  ERAPI_KEY_R,
  ERAPI_KEY_RIGHT,
  ERAPI_KEY_SELECT,
  ERAPI_KEY_START,
  ERAPI_KEY_UP,
} from "../../../src/EReaderRunner/inputs";
import { fillTile } from "../../util/nonogram/puzzleUtil";

describe("game", function () {
  it.skip("should fully reset game state on the second puzzle", async function () {
    const { runner, symbols } = await createRunner();
    runner.runUntil(
      "scan in a card then choose first puzzle",
      [ERAPI_KEY_A, ERAPI_KEY_A],
      (result) => {
        return (
          result.getPCCount(
            symbols.symbolToAddress["calc_hint_numbers_calculate"],
          ) === 1
        );
      },
      { halts: 1 },
    );

    const moveCursorResult = runner.runUntil(
      "move cursor away from (0,0) ",
      [
        ERAPI_KEY_RIGHT,
        ERAPI_KEY_RIGHT,
        ERAPI_KEY_RIGHT,
        ERAPI_KEY_RIGHT,
        ERAPI_KEY_RIGHT,
        ERAPI_KEY_DOWN,
      ],
      (result) => {
        return result.getByte(symbols.symbolToAddress["cursor_board_x"]) === 4;
      },
      { halts: 1 },
    );

    const firstCursorX = moveCursorResult.getByte(
      symbols.symbolToAddress["cursor_board_x"],
    );
    expect(firstCursorX).toBe(4);
    const firstCursorY = moveCursorResult.getByte(
      symbols.symbolToAddress["cursor_board_y"],
    );
    expect(firstCursorY).toBe(1);

    runner.runUntil(
      "make a mistake repeatedly until it is game over",
      [
        // go back up to be on a bad tile
        ERAPI_KEY_UP,
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
        return result.getPCCount(symbols.symbolToAddress["game_frame"]) === 1;
      },
      { halts: 1 },
    );

    const secondCursorX = secondPuzzleResult.getByte(
      symbols.symbolToAddress["cursor_board_x"],
    );
    expect(secondCursorX).toBe(0);
    const secondCursorLastX = secondPuzzleResult.getByte(
      symbols.symbolToAddress["cursor_board_last_x"],
    );
    expect(secondCursorLastX).toBe(0);
    const secondCursorY = secondPuzzleResult.getByte(
      symbols.symbolToAddress["cursor_board_y"],
    );
    expect(secondCursorY).toBe(0);
    const secondCursorLastY = secondPuzzleResult.getByte(
      symbols.symbolToAddress["cursor_board_last_y"],
    );
    expect(secondCursorLastY).toBe(0);

    expect(
      secondPuzzleResult.getByte(symbols.symbolToAddress["clock_empty"]),
    ).toBe(0);

    expect(
      secondPuzzleResult.getByte(symbols.symbolToAddress["_cl_penalty_index"]),
    ).toBe(0);

    expect(
      secondPuzzleResult.getPCCount(
        symbols.symbolToAddress["game_happy_mascot"],
      ),
    ).toBe(1);

    expect(
      secondPuzzleResult.getByte(symbols.symbolToAddress["_h_count"]),
    ).toBe(1);
  });

  it("should pause the game, not allow play while paused, then resume play after unpause", async function () {
    const { runner, symbols } = await createRunner();

    runner.runUntil(
      "scan in a card then choose first puzzle",
      [ERAPI_KEY_A, ERAPI_KEY_A],
      (result) => {
        return (
          result.getPCCount(
            symbols.symbolToAddress["calc_hint_numbers_calculate"],
          ) === 1
        );
      },
      { halts: 1 },
    );

    const fillOneTileResult = runner.runUntil(
      "fill in one tile",
      [ERAPI_KEY_RIGHT, ERAPI_KEY_A],
      (result) => {
        const filledTile = result.getByte(
          symbols.symbolToAddress["_b_filled_tiles"] + 1,
        );
        return filledTile === 1;
      },
      { halts: 1 },
    );

    const beforePausedFilledTiles = fillOneTileResult.getByteSpan(
      symbols.symbolToAddress["_b_filled_tiles"],
      15 * 15,
    );
    const expectedFilledTiles = new Array(15 * 15).fill(0);
    expectedFilledTiles[1] = 1;

    expect(beforePausedFilledTiles).toEqual(expectedFilledTiles);

    runner.runUntil(
      "pause the game",
      [ERAPI_KEY_START],
      (result) => {
        return result.getByte(symbols.symbolToAddress["_g_is_paused"]) === 1;
      },
      { halts: 1 },
    );

    const secondsOnPause = runner.getWord(
      symbols.symbolToAddress["clock_seconds_counter"],
    );

    const tryWhilePausedResult = runner.runUntil(
      "try to fill a tile while the game is paused",
      [ERAPI_KEY_RIGHT, ERAPI_KEY_A],
      (result) => {
        return result.getByte(symbols.symbolToAddress["cursor_board_x"]) === 1;
      },
      { halts: 3 },
    );

    const duringPauseFilledTiles = tryWhilePausedResult.getByteSpan(
      symbols.symbolToAddress["_b_filled_tiles"],
      15 * 15,
    );

    expect(duringPauseFilledTiles).toEqual(expectedFilledTiles);

    const secondsAfterPausingForAWhile = runner.getWord(
      symbols.symbolToAddress["clock_seconds_counter"],
    );

    expect(secondsOnPause).toEqual(secondsAfterPausingForAWhile);

    runner.runUntil(
      "unpause the game",
      [ERAPI_KEY_START],
      (result) => {
        return result.getByte(symbols.symbolToAddress["_g_is_paused"]) === 0;
      },
      { halts: 1 },
    );

    const playAfterUnpauseResult = runner.runUntil(
      "fill a tile after unpausing",
      [ERAPI_KEY_RIGHT, ERAPI_KEY_A],
      (result) => {
        return result.getByte(symbols.symbolToAddress["cursor_board_x"]) === 2;
      },
      // 100 frames to ensure the secound counter goes down
      { halts: 100 },
    );

    const unpausedFilledTiles = playAfterUnpauseResult.getByteSpan(
      symbols.symbolToAddress["_b_filled_tiles"],
      15 * 15,
    );

    const afterUnpauseExpectedFilledTiles = [...expectedFilledTiles];
    afterUnpauseExpectedFilledTiles[2] = 1;

    expect(unpausedFilledTiles).toEqual(afterUnpauseExpectedFilledTiles);

    const secondsAfterUnpausing = runner.getWord(
      symbols.symbolToAddress["clock_seconds_counter"],
    );

    expect(secondsAfterUnpausing).toBeLessThan(secondsOnPause);
  });

  it("should return to the puzzle menu when select is pressed", async function () {
    const { runner, symbols } = await createRunner();

    runner.runUntil(
      "scan in a card then choose first puzzle",
      [ERAPI_KEY_A, ERAPI_KEY_A],
      (result) => {
        return (
          result.getPCCount(
            symbols.symbolToAddress["calc_hint_numbers_calculate"],
          ) === 1
        );
      },
      { halts: 1 },
    );

    const selectToExitResult = runner.runUntil(
      "hit select to exit",
      [ERAPI_KEY_SELECT],
      (result) => {
        return result.getPCCount(symbols.symbolToAddress["main_reset"]) === 1;
      },
      { halts: 1 },
    );

    expect(
      selectToExitResult.getPCCount(
        symbols.symbolToAddress["puzzle_menu_on_start"],
      ),
    ).toBe(1);
  });

  describe("hints", function () {
    it.skip("should reveal a single tile for a small puzzle", async function () {
      const { runner, symbols } = await createRunner();

      const choosePuzzleResult = runner.runUntil(
        "scan in a card then choose first puzzle and get it playable",
        [ERAPI_KEY_A, ERAPI_KEY_A],
        (result) => {
          return result.getPCCount(symbols.symbolToAddress["game_frame"]) === 1;
        },
        { halts: 1 },
      );

      expect(
        choosePuzzleResult.getByte(symbols.symbolToAddress["_b_cur_size_tile"]),
      ).toBe(8);

      const hintResult = runner.runUntil(
        "use the hint",
        [ERAPI_KEY_R],
        (result) => {
          return result.getPCCount(symbols.symbolToAddress["hints_use"]) === 1;
        },
        { halts: 3 },
      );

      const filledTiles = hintResult.getByteSpan(
        symbols.symbolToAddress["_b_filled_tiles"],
        15 * 15,
      );

      const numberOfFilledTiles = filledTiles.filter((t) => t === 1).length;
      const numberOfEmptyTiles = filledTiles.filter((t) => t === 0).length;

      expect(numberOfFilledTiles).toBe(1);
      expect(numberOfEmptyTiles).toBe(15 * 15 - 1);
    });

    it("should reveal two tiles for a medium puzzle", async function () {
      const { runner, symbols } = await createRunner();

      const choosePuzzleResult = runner.runUntil(
        "scan in a card then choose third puzzle and get it playable",
        [ERAPI_KEY_A, ERAPI_KEY_RIGHT, ERAPI_KEY_RIGHT, ERAPI_KEY_A],
        (result) => {
          return result.getPCCount(symbols.symbolToAddress["game_frame"]) === 1;
        },
        { halts: 1 },
      );

      expect(
        choosePuzzleResult.getByte(symbols.symbolToAddress["_b_cur_size_tile"]),
      ).toBe(8);

      const hintResult = runner.runUntil(
        "use the hint",
        [ERAPI_KEY_R],
        (result) => {
          return result.getPCCount(symbols.symbolToAddress["hints_use"]) === 1;
        },
        { halts: 3 },
      );

      const filledTiles = hintResult.getByteSpan(
        symbols.symbolToAddress["_b_filled_tiles"],
        15 * 15,
      );

      const numberOfFilledTiles = filledTiles.filter((t) => t === 1).length;
      const numberOfEmptyTiles = filledTiles.filter((t) => t === 0).length;

      expect(numberOfFilledTiles).toBe(2);
      expect(numberOfEmptyTiles).toBe(15 * 15 - 2);
    });

    it.skip("should reveal three tiles for a large puzzle", async function () {
      const { runner, symbols } = await createRunner();

      const choosePuzzleResult = runner.runUntil(
        "scan in a card then choose sixth puzzle and get it playable",
        [ERAPI_KEY_A, ERAPI_KEY_DOWN, ERAPI_KEY_DOWN, ERAPI_KEY_A],
        (result) => {
          return result.getPCCount(symbols.symbolToAddress["game_frame"]) === 1;
        },
        { halts: 1 },
      );

      expect(
        choosePuzzleResult.getByte(symbols.symbolToAddress["_b_cur_size_tile"]),
      ).toBe(15);

      const hintResult = runner.runUntil(
        "use the hint",
        [ERAPI_KEY_R],
        (result) => {
          return result.getPCCount(symbols.symbolToAddress["hints_use"]) === 1;
        },
        { halts: 3 },
      );

      const filledTiles = hintResult.getByteSpan(
        symbols.symbolToAddress["_b_filled_tiles"],
        15 * 15,
      );

      const numberOfFilledTiles = filledTiles.filter((t) => t === 1).length;
      const numberOfEmptyTiles = filledTiles.filter((t) => t === 0).length;

      expect(numberOfFilledTiles).toBe(3);
      expect(numberOfEmptyTiles).toBe(15 * 15 - 3);
    });

    it("should still get the puzzle solved after using a hint", async function () {
      const { runner, symbols } = await createRunner();

      const choosePuzzleResult = runner.runUntil(
        "scan in a card then choose first puzzle and get it playable",
        [ERAPI_KEY_A, ERAPI_KEY_A],
        (result) => {
          return result.getPCCount(symbols.symbolToAddress["game_frame"]) === 1;
        },
        { halts: 1 },
      );

      expect(
        choosePuzzleResult.getByte(symbols.symbolToAddress["_b_cur_size_tile"]),
      ).toBe(8);

      runner.runUntil(
        "use the hint",
        [ERAPI_KEY_R],
        (result) => {
          return result.getPCCount(symbols.symbolToAddress["hints_use"]) === 1;
        },
        { halts: 3 },
      );

      // now fill out the rest of the puzzle and assert we get game won
      // this is Grub
      const puzzle = [
        0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0,
        1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0,
        0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0,
      ];

      const filledBytes = runner.getByteSpan(
        symbols.symbolToAddress["_b_filled_tiles"],
        15 * 15,
      );

      let fillTileCount = 0;

      for (let puzzleI = 0; puzzleI < puzzle.length; ++puzzleI) {
        const x = puzzleI % 8;
        const y = Math.floor(puzzleI / 8);

        // if this tile is not yet filled but it should be, fill it in
        if (filledBytes[puzzleI] !== 1 && puzzle[puzzleI] === 1) {
          await fillTile(runner, symbols.symbolToAddress, 8, x, y);
          fillTileCount += 1;
        }
      }

      // Grub has 27 valid tiles, and two should already be filled from the hint
      expect(fillTileCount).toBe(25);
      // now we should have won the puzzle
      expect(runner.getPCCount(symbols.symbolToAddress["game_won_run"])).toBe(
        1,
      );
    });
  });
});
