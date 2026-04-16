// @ts-nocheck
export const puzzleOffsets: Record<string, number> = new (function (
  this: Record<string, number>
) {
  this.id = 0;
  this.size = this.id + 2;
  this.winFillCount = this.size + 1;
  this.name = this.winFillCount + 1;
  this.tileData = this.name + 13;
})();

export const puzzleSizes: Record<string, number> = new (function (
  this: Record<string, number>
) {
  this.metaData = puzzleOffsets.tileData;
  this.smallMediumTileData = 32 * 1;
  this.largeTileData = 32 * 4;
  this.smallMediumPuzzle = this.metaData + this.smallMediumTileData;
  this.largePuzzle = this.metaData + this.largeTileData;
})();
