import assert from "node:assert";
import { EReaderRunner } from "../../../src/EReaderRunner/EReaderRunner";
import {
  ERAPI_KEY_A,
  ERAPI_KEY_DOWN,
  ERAPI_KEY_LEFT,
  ERAPI_KEY_RIGHT,
  ERAPI_KEY_UP,
} from "../../../src/EReaderRunner/inputs";

async function fillTile(
  runner: EReaderRunner,
  symbols: Record<string, number>,
  sizeInTiles: number,
  x: number,
  y: number
) {
  assert(x === Math.floor(x), `fillTiles, x not an integer: ${x}`);
  assert(y === Math.floor(y), `fillTiles, y not an integer: ${y}`);
  assert(
    [5, 8, 15].includes(sizeInTiles),
    `fillTile, sizeInTiles invalid: ${sizeInTiles}`
  );
  assert(x >= 0, `fillTile, negative x: ${x}`);
  assert(y >= 0, `fillTile, negative y: ${y}`);
  assert(x < sizeInTiles, `fillTile, x out of range: ${x}`);
  assert(y < sizeInTiles, `fillTile, y out of range: ${y}`);

  const upperLeftCornerLefts = new Array(sizeInTiles + 1).fill(ERAPI_KEY_LEFT);
  const upperLeftCornerUps = new Array(sizeInTiles + 1).fill(ERAPI_KEY_UP);
  runner.runUntil(
    "move cursor to upper left corner of puzzle",
    [...upperLeftCornerLefts, ...upperLeftCornerUps],
    (result) => {
      return (
        result.getByte(symbols["cursor_board_x"]) === 0 &&
        result.getByte(symbols["cursor_board_y"]) === 0
      );
    },
    { halts: 1 }
  );

  const toTileRights = new Array(x).fill(ERAPI_KEY_RIGHT);
  const toTileDowns = new Array(y).fill(ERAPI_KEY_DOWN);

  runner.runUntil(
    `move cursor to tile that should be filled (${x},${y})`,
    [...toTileRights, ...toTileDowns],
    (result) => {
      return (
        result.getByte(symbols["cursor_board_x"]) === x &&
        result.getByte(symbols["cursor_board_y"]) === y
      );
    },
    { halts: 1 }
  );

  runner.runUntil(
    "press a to fill the tile",
    [ERAPI_KEY_A],
    (result) => {
      const filledTiles = result.getByteSpan(
        symbols["_b_filled_tiles"],
        15 * 15
      );
      return filledTiles[y * sizeInTiles + x] === 1;
    },
    { halts: 1 }
  );
}

export { fillTile };
