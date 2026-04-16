// @ts-nocheck
export const puzzleCollectionOffsets: Record<string, number> = new (function (
  this: Record<string, number>
) {
  this.functionOffset = 0;
  this.paletteOffset = this.functionOffset + 2;
  this.mascotBody = this.paletteOffset + 32;
  this.mascotSadFace = this.mascotBody + 32 * 9;
  this.mascotTail = this.mascotSadFace + 32 * 1;
  this.bgId = this.mascotTail + 32 * 2;
  this.bgmId = this.bgId + 1;
  this.puzzleCount = this.bgmId + 2;
  this.puzzles = this.puzzleCount + 1;
})();
