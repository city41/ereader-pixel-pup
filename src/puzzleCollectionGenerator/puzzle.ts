import * as path from "node:path";
import * as fsp from "node:fs/promises";
import * as os from "node:os";
import { mkdirp } from "mkdirp";
import { Canvas, createCanvas, Image } from "canvas";
import { PuzzlePaintingSpec } from "./types";

// this is the same value as in board.c
const MAX_HIGHLIGHT_INDEX = 10;

function isSolidTile(
  canvas: Canvas,
  palette: Uint8ClampedArray,
  x: number,
  y: number
): boolean {
  const pixel = canvas.getContext("2d").getImageData(x, y, 1, 1).data;

  for (let p = 0; p < palette.length; p += 4) {
    if (
      pixel[0] === palette[p] &&
      pixel[1] === palette[p + 1] &&
      pixel[2] === palette[p + 2] &&
      pixel[3] === 255
    ) {
      // ugh, this has to be >= where as in board.c it is >
      // because here the palette is only 15 colors, where as
      // with board.c it is 16...
      return p / 4 >= MAX_HIGHLIGHT_INDEX;
    }
  }

  return false;
}

const sizeEnums = [5, 8, 15] as const;

function calcPuzzleSizeAndWinFillCount(
  canvas: Canvas,
  palette: Uint8ClampedArray,
  forcedPuzzleSize?: number
): {
  sizeEnum: number;
  rawSizeInTiles: number;
  effectiveSizeInTiles: number;
  winFillCount: number;
} {
  let maxExtent = Number.MIN_SAFE_INTEGER;
  let filledCount = 0;

  for (let y = 0; y < canvas.height; ++y) {
    for (let x = 0; x < canvas.width; ++x) {
      if (isSolidTile(canvas, palette, x, y)) {
        maxExtent = Math.max(maxExtent, x, y);
        filledCount += 1;
      }
    }
  }

  // +1 since coordinates are zero based and size is one based
  const rawSize = forcedPuzzleSize ?? maxExtent + 1;
  let sizeEnum = -1;
  for (let i = 0; i < sizeEnums.length; ++i) {
    if (rawSize <= sizeEnums[i]) {
      sizeEnum = i;
      break;
    }
  }

  if (sizeEnum === -1) {
    throw new Error(
      `calcPuzzleSizeAndFillCount: puzzle is of an unexpected raw size: ${rawSize}`
    );
  }

  return {
    sizeEnum,
    rawSizeInTiles: rawSize,
    effectiveSizeInTiles: sizeEnums[sizeEnum],
    winFillCount: filledCount,
  };
}

function getPaintingPieceCanvasSizeFromTileSize(tileSize: number): number {
  if (tileSize <= 8) {
    return 8;
  } else {
    return 16;
  }
}

async function createImage(imagePath: string): Promise<Image> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve(img);
    };
    img.src = imagePath;
  });
}

async function splitPuzzlePainting(
  spec: PuzzlePaintingSpec
): Promise<string[]> {
  const tmpDir = path.resolve(
    os.tmpdir(),
    `puzzleCollectionGenerator-splitPuzzlePainting-${Date.now()}`
  );
  await mkdirp(tmpDir);

  const { tileSize } = spec;

  const painting = await createImage(spec.paintingFile);

  if (painting.width % tileSize !== 0) {
    throw new Error(
      `splitPuzzlePainting: painting width ($${painting.width}) is not a multiple of tileSize (${tileSize})`
    );
  }

  if (painting.height % tileSize !== 0) {
    throw new Error(
      `splitPuzzlePainting: painting height ($${painting.height}) is not a multiple of tileSize (${tileSize})`
    );
  }

  const piecePaths: string[] = [];

  const canvasSize = getPaintingPieceCanvasSizeFromTileSize(tileSize);

  for (let y = 0; y < painting.height; y += tileSize) {
    for (let x = 0; x < painting.width; x += tileSize) {
      const piece = createCanvas(canvasSize, canvasSize);
      const pieceContext = piece.getContext("2d");

      pieceContext.fillStyle = "rgb(255, 0, 255)";
      pieceContext.fillRect(0, 0, canvasSize, canvasSize);

      pieceContext.drawImage(
        painting,
        x,
        y,
        tileSize,
        tileSize,
        0,
        0,
        tileSize,
        tileSize
      );

      const piecePath = path.resolve(
        tmpDir,
        `piece-x${x / tileSize}-y${y / tileSize}.png`
      );
      const buffer = piece.toBuffer();
      await fsp.writeFile(piecePath, buffer);
      piecePaths.push(piecePath);
    }
  }

  return piecePaths;
}

export { isSolidTile, calcPuzzleSizeAndWinFillCount, splitPuzzlePainting };
