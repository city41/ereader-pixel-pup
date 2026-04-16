import { processSprite } from "@city41/gba-convertpng/dist/sprite";
import { PuzzleCollectionSpec, PuzzlePaintingSpec } from "./types";

async function processMascot(
  spec: PuzzleCollectionSpec | PuzzlePaintingSpec
): Promise<number[]> {
  const mascotBodyResult = await processSprite(
    {
      file: spec.mascotBody,
      frames: 1,
    },
    "bin",
    spec.palette
  );

  const mascotSadFaceResult = await processSprite(
    {
      file: spec.mascotSadFace,
      frames: 1,
    },
    "bin",
    spec.palette
  );

  const mascotTailResult = await processSprite(
    {
      file: spec.mascotTail,
      frames: 2,
    },
    "bin",
    spec.palette
  );

  return [
    ...(mascotBodyResult.tilesSrc as number[]),
    ...(mascotSadFaceResult.tilesSrc as number[]),
    ...(mascotTailResult.tilesSrc as number[]),
  ];
}

export { processMascot };
