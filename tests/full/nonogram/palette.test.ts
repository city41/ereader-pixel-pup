import * as path from "node:path";
import {
  JsonSpec,
  PuzzleCollectionSpec,
  PuzzlePaintingSpec,
  PuzzleSpec,
} from "../../../src/puzzleCollectionGenerator/types";
import { createCanvasFromPath } from "@city41/gba-convertpng/dist/canvas";

function isPuzzleCollection(
  spec: PuzzleCollectionSpec | PuzzlePaintingSpec
): spec is PuzzleCollectionSpec {
  return "puzzles" in spec;
}

function isInPalette(color: number[], paletteData: number[]): boolean {
  const colorS = color.join("-");

  for (let i = 0; i < paletteData.length; i += 4) {
    const paletteColor = paletteData.slice(i, i + 4);
    const paletteColorS = paletteColor.join("-");

    if (paletteColorS === colorS) {
      return true;
    }
  }

  return false;
}

function isMagenta(color: number[]) {
  return (
    color[0] === 255 && color[1] === 0 && color[2] === 255 && color[3] === 255
  );
}

function isTransparent(color: number[]) {
  return color[3] !== 255;
}

function isCanvasEntirelyMadeFromPalette(
  canvasData: number[],
  paletteData: number[]
): boolean {
  for (let i = 0; i < canvasData.length; i += 4) {
    const color = canvasData.slice(i, i + 4);
    if (isMagenta(color) || isTransparent(color)) {
      continue;
    }
    if (!isInPalette(color, paletteData)) {
      console.log("Color not in palette", color.join("-"));
      return false;
    }
  }

  return true;
}

async function validatePuzzlePalette(
  puzzle: PuzzleSpec,
  paletteData: number[]
) {
  const canvas = await createCanvasFromPath(
    path.resolve(process.cwd(), "src/nonogram/puzzles/", puzzle.file)
  );
  const canvasData = Array.from(
    canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data
  );

  if (!isCanvasEntirelyMadeFromPalette(canvasData, paletteData)) {
    throw new Error(
      `Puzzle , ${puzzle.name ?? puzzle.file}, is using a color not in its palette`
    );
  }
}

async function validatePuzzleCollectionPalette(
  collection: PuzzleCollectionSpec
) {
  const palettePath = path.resolve(
    process.cwd(),
    "src/nonogram/puzzles",
    collection.palette
  );

  const paletteCanvas = await createCanvasFromPath(palettePath);
  const paletteData = Array.from(
    paletteCanvas
      .getContext("2d")
      .getImageData(0, 0, paletteCanvas.width, paletteCanvas.height).data
  );

  for (let p = 0; p < collection.puzzles.length; ++p) {
    const puzzle = collection.puzzles[p];
    console.log(puzzle.file);
    await validatePuzzlePalette(puzzle, paletteData);
  }
}

async function validatePuzzlePaintingCollectionPalette(
  collection: PuzzlePaintingSpec
) {
  const palettePath = path.resolve(
    process.cwd(),
    "src/nonogram/puzzles",
    collection.palette
  );

  const paintingPath = path.resolve(
    process.cwd(),
    "src/nonogram/puzzles",
    collection.paintingFile
  );

  const paletteCanvas = await createCanvasFromPath(palettePath);
  const paletteData = Array.from(
    paletteCanvas
      .getContext("2d")
      .getImageData(0, 0, paletteCanvas.width, paletteCanvas.height).data
  );
  const paintingCanvas = await createCanvasFromPath(paintingPath);
  const paintingData = Array.from(
    paintingCanvas
      .getContext("2d")
      .getImageData(0, 0, paintingCanvas.width, paintingCanvas.height).data
  );

  if (!isCanvasEntirelyMadeFromPalette(paintingData, paletteData)) {
    throw new Error(
      `Puzzle painting, ${collection.paintingFile}, is using a color not in its palette`
    );
  }
}

describe("puzzle palettes", function () {
  it(
    "should only use the colors in its palette for all puzzles",
    async function () {
      const puzzleJson =
        require("../../../src/nonogram/puzzles/puzzles.json") as JsonSpec;

      for (const collection of puzzleJson.collections) {
        console.log("processing collection", collection.name);

        if (isPuzzleCollection(collection)) {
          console.log("todo", collection.name);
          await validatePuzzleCollectionPalette(collection);
        } else {
          await validatePuzzlePaintingCollectionPalette(collection);
        }
      }
    },
    1000 * 60
  );
});
