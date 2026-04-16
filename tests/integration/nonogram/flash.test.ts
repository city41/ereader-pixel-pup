import { createRunner } from "./createRunner";
import {
  ERAPI_KEY_A,
  ERAPI_KEY_RIGHT,
} from "../../../src/EReaderRunner/inputs";
import { fillTile } from "../../util/nonogram/puzzleUtil";
import { puzzleCollectionOffsets } from "./puzzleCollectionOffsets";

describe("flash", function () {
  it("checks flash to see if puzzles have been completed", async function () {
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

    const erapiCalls = runner.getErapiCalls("FlashLoadUserData");

    // three because Pixel Pup uses 2 save slots and entomology calls flash
    // to see if it should show the tina easter egg
    expect(erapiCalls.length).toBe(3);
  });

  // I hardcode the function to return a=1 at times during dev
  // this verifies I don't accidentally leave that in
  it("should not return a hard coded 1 for flash_is_puzzle_cleared", async function () {
    const { runner, symbols } = await createRunner();

    const firstWordOfFunction = runner.getWord(
      symbols.symbolToAddress["flash_is_puzzle_cleared"],
    );

    // the opcode is 2 bytes 3e N, but since the z80 is little endian
    // it is stored N 3e
    const LDA_1 = 0x13e;

    expect(firstWordOfFunction).not.toBe(LDA_1);
  });

  it("saves to flash after a puzzle has been completed", async function () {
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

    // now fill out the rest of the puzzle and assert we get game won
    // this is Grub
    const puzzle = [
      0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 1,
      0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0,
      1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0,
    ];

    const winFillCount = puzzle.filter((b) => b === 1).length;

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

    expect(fillTileCount).toBe(winFillCount);
    // now we should have won the puzzle
    expect(runner.getPCCount(symbols.symbolToAddress["game_won_run"])).toBe(1);

    runner.runUntil(
      "Flash save has happened",
      [],
      (result) => {
        return (
          result.getPCCount(
            symbols.symbolToAddress["flash_set_puzzle_cleared"],
          ) === 1
        );
      },
      { halts: 1 },
    );

    const erapiCalls = runner.getErapiCalls("FlashSaveUserData");

    expect(erapiCalls.length).toBe(2);

    const flashSaveBufferPointer = symbols.symbolToAddress["_f_save_data"];

    for (let i = 0; i < erapiCalls.length; ++i) {
      const ec = erapiCalls[i];
      const callSaveBufferPointer =
        (ec.inputRegisters.d << 8) | ec.inputRegisters.e;

      expect(callSaveBufferPointer).toBe(flashSaveBufferPointer + 16 * i);
    }

    // now form what was expected to be saved based on the puzzle that was
    // just solved

    // get the puzzle id
    const chosenPuzzlePointer = runner.getWord(
      symbols.symbolToAddress["chosen_puzzle"],
    );
    const puzzleId = runner.getWord(chosenPuzzlePointer);

    const expectedSaveBuffer = new Array(32).fill(0);
    const byteIndex = Math.floor(puzzleId / 8);
    const bitIndex = puzzleId % 8;
    const puzzleSaveByte = 1 << bitIndex;
    expectedSaveBuffer[byteIndex] = puzzleSaveByte;

    const actualSaveBuffer = runner.getByteSpan(
      symbols.symbolToAddress["_f_save_data"],
      32,
    );
    expect(actualSaveBuffer).toEqual(expectedSaveBuffer);
  });

  it("saves to flash after a second puzzle has been completed, and does not clobber the first puzzle save", async function () {
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

    // now fill out the rest of the puzzle and assert we get game won
    // this is Grub
    const puzzle = [
      0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 1,
      0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0,
      1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0,
    ];
    const winFillCount = puzzle.filter((b) => b === 1).length;

    let fillTileCount = 0;

    for (let puzzleI = 0; puzzleI < puzzle.length; ++puzzleI) {
      const x = puzzleI % 8;
      const y = Math.floor(puzzleI / 8);

      // if this tile is not yet filled but it should be, fill it in
      if (puzzle[puzzleI] === 1) {
        await fillTile(runner, symbols.symbolToAddress, 8, x, y);
        fillTileCount += 1;
      }
    }

    expect(fillTileCount).toBe(winFillCount);
    // now we should have won the puzzle
    expect(runner.getPCCount(symbols.symbolToAddress["game_won_run"])).toBe(1);

    // get the first puzzle id
    const firstPuzzlePointer = runner.getWord(
      symbols.symbolToAddress["chosen_puzzle"],
    );
    const firstPuzzleId = runner.getWord(firstPuzzlePointer);

    runner.runUntil(
      "go back to puz menu and load second puzzle",
      [ERAPI_KEY_A, ERAPI_KEY_RIGHT, ERAPI_KEY_A],
      (result) => {
        return result.getPCCount(symbols.symbolToAddress["game_frame"]) === 1;
      },
      { halts: 1 },
    );

    // now fill out the rest of the puzzle and assert we get game won
    // it is again grub
    let secondGrubFillTileCount = 0;

    for (let puzzleI = 0; puzzleI < puzzle.length; ++puzzleI) {
      const x = puzzleI % 8;
      const y = Math.floor(puzzleI / 8);

      // if this tile is not yet filled but it should be, fill it in
      if (puzzle[puzzleI] === 1) {
        await fillTile(runner, symbols.symbolToAddress, 8, x, y);
        secondGrubFillTileCount += 1;
      }
    }

    expect(runner.getPCCount(symbols.symbolToAddress["game_won_run"])).toBe(1);

    runner.runUntil(
      "Flash save has happened",
      [],
      (result) => {
        return (
          result.getPCCount(
            symbols.symbolToAddress["flash_set_puzzle_cleared"],
          ) === 1
        );
      },
      { halts: 1 },
    );

    // get the second puzzle id
    const maggotChosenPuzzlePointer = runner.getWord(
      symbols.symbolToAddress["chosen_puzzle"],
    );
    const secondPuzzleId = runner.getWord(maggotChosenPuzzlePointer);
    expect(secondPuzzleId - firstPuzzleId).toBe(1);

    expect(secondGrubFillTileCount).toBe(winFillCount);

    // now both grubs have been solved
    // the last flash save call should have both of their bits set

    const expectedSaveBuffer = new Array(32).fill(0);
    const firstPuzzleByteIndex = Math.floor(firstPuzzleId / 8);
    const secondPuzzleByteIndex = Math.floor(secondPuzzleId / 8);

    // if the second puzzle moves onto the next byte, it's not as strong of
    // a test
    expect(firstPuzzleByteIndex).toBe(secondPuzzleByteIndex);

    const firstPuzzleBitIndex = firstPuzzleId % 8;
    const secondPuzzleBitIndex = secondPuzzleId % 8;
    const puzzleSaveByte =
      (1 << firstPuzzleBitIndex) | (1 << secondPuzzleBitIndex);
    expectedSaveBuffer[firstPuzzleByteIndex] = puzzleSaveByte;

    const actualSaveBuffer = runner.getByteSpan(
      symbols.symbolToAddress["_f_save_data"],
      32,
    );
    expect(actualSaveBuffer).toEqual(expectedSaveBuffer);
  });

  it("saves to flash after a puzzle has been completed with an id above 127", async function () {
    const PUZZLE_ID = 203;

    const { runner, symbols, puzzleCardBin } = await createRunner();
    puzzleCardBin[puzzleCollectionOffsets.puzzles] = PUZZLE_ID;

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

    // now fill out the rest of the puzzle and assert we get game won
    // this is grub
    const puzzle = [
      0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 1,
      0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0,
      1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0,
    ];
    const winFillCount = puzzle.filter((b) => b === 1).length;

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

    expect(fillTileCount).toBe(winFillCount);
    // now we should have won the puzzle
    expect(runner.getPCCount(symbols.symbolToAddress["game_won_run"])).toBe(1);

    runner.runUntil(
      "Flash save has happened",
      [],
      (result) => {
        return (
          result.getPCCount(
            symbols.symbolToAddress["flash_set_puzzle_cleared"],
          ) === 1
        );
      },
      { halts: 1 },
    );

    const erapiCalls = runner.getErapiCalls("FlashSaveUserData");

    expect(erapiCalls.length).toBe(2);

    const flashSaveBufferPointer = symbols.symbolToAddress["_f_save_data"];

    for (let i = 0; i < erapiCalls.length; ++i) {
      const ec = erapiCalls[i];
      const callSaveBufferPointer =
        (ec.inputRegisters.d << 8) | ec.inputRegisters.e;

      expect(callSaveBufferPointer).toBe(flashSaveBufferPointer + 16 * i);
    }

    // now form what was expected to be saved based on the puzzle that was
    // just solved

    // get the puzzle id
    const chosenPuzzlePointer = runner.getWord(
      symbols.symbolToAddress["chosen_puzzle"],
    );
    const puzzleId = runner.getWord(chosenPuzzlePointer);
    expect(puzzleId).toBe(PUZZLE_ID);

    const expectedSaveBuffer = new Array(32).fill(0);
    const byteIndex = Math.floor(puzzleId / 8);
    const bitIndex = puzzleId % 8;
    const puzzleSaveByte = 1 << bitIndex;
    expectedSaveBuffer[byteIndex] = puzzleSaveByte;

    const actualSaveBuffer = runner.getByteSpan(
      symbols.symbolToAddress["_f_save_data"],
      32,
    );
    expect(actualSaveBuffer).toEqual(expectedSaveBuffer);
  });
});
