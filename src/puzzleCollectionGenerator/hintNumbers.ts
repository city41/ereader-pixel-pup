import { Canvas } from "canvas";
import assert from "node:assert";
import { isSolidTile } from "./puzzle";

const MAX_HINT_NUMBERS_PER_COL_ROW = 8;

function calcTopHintNumbers(
  canvas: Canvas,
  palette: Uint8ClampedArray,
  sizeInTiles: number
): { hintNumbers: number[][]; flatFullHintNumbers: number[] } {
  assert(
    sizeInTiles > 0,
    `calcTopHintNumbers, bad sizeInTiles passed in: ${sizeInTiles}`
  );
  const hintNumbers: number[][] = [];
  for (let x = 0; x < sizeInTiles; ++x) {
    let y = sizeInTiles - 1;
    const colHintNumbers: number[] = [];
    while (y >= 0) {
      // soak up blanks
      while (y >= 0 && !isSolidTile(canvas, palette, x, y)) {
        y -= 1;
      }
      // count solids
      let count = 0;
      while (y >= 0 && isSolidTile(canvas, palette, x, y)) {
        count += 1;
        y -= 1;
      }
      if (count > 0) {
        colHintNumbers.push(count);
      }
    }
    while (colHintNumbers.length < MAX_HINT_NUMBERS_PER_COL_ROW) {
      colHintNumbers.push(0);
    }
    hintNumbers.push(colHintNumbers);
  }

  assert(
    hintNumbers.length === sizeInTiles,
    `calcTopHintNumbers, unexpected size (got ${hintNumbers.length}, size in tiles: ${sizeInTiles})`
  );

  for (let i = 0; i < hintNumbers.length; ++i) {
    assert(
      hintNumbers[i].length <= MAX_HINT_NUMBERS_PER_COL_ROW,
      `calcTopHintNumbers: too many hint numbers at index ${i}, got ${hintNumbers[i].length}`
    );
  }

  const flatFullHintNumbers = hintNumbers.flat(1);

  while (flatFullHintNumbers.length < MAX_HINT_NUMBERS_PER_COL_ROW * 15) {
    flatFullHintNumbers.push(0);
  }

  return { hintNumbers, flatFullHintNumbers };
}

function calcLeftHintNumbers(
  canvas: Canvas,
  palette: Uint8ClampedArray,
  sizeInTiles: number
): { hintNumbers: number[][]; flatFullHintNumbers: number[] } {
  const hintNumbers: number[][] = [];

  for (let y = 0; y < sizeInTiles; ++y) {
    let x = sizeInTiles - 1;
    const rowHintNumbers: number[] = [];
    while (x >= 0) {
      // soak up blanks
      while (x >= 0 && !isSolidTile(canvas, palette, x, y)) {
        x -= 1;
      }
      // count solids
      let count = 0;
      while (x >= 0 && isSolidTile(canvas, palette, x, y)) {
        count += 1;
        x -= 1;
      }
      if (count > 0) {
        rowHintNumbers.push(count);
      }
    }
    while (rowHintNumbers.length < MAX_HINT_NUMBERS_PER_COL_ROW) {
      rowHintNumbers.push(0);
    }
    hintNumbers.push(rowHintNumbers);
  }

  assert(
    hintNumbers.length === sizeInTiles,
    `calcLeftHintNumbers, unexpected size (got ${hintNumbers.length}, size in tiles: ${sizeInTiles})`
  );

  for (let i = 0; i < hintNumbers.length; ++i) {
    assert(
      hintNumbers[i].length <= MAX_HINT_NUMBERS_PER_COL_ROW,
      `caldLeftHintNumbers: too many hint numbers at index ${i}, got ${hintNumbers[i].length}, ${hintNumbers[i].join(",")}`
    );
  }

  const flatFullHintNumbers = hintNumbers.flat(1);

  while (flatFullHintNumbers.length < MAX_HINT_NUMBERS_PER_COL_ROW * 15) {
    flatFullHintNumbers.push(0);
  }

  return { hintNumbers, flatFullHintNumbers };
}

export { calcTopHintNumbers, calcLeftHintNumbers };
