export type PuzzleSpec = {
  file: string;
  name?: string;
  skip?: boolean;
};

type BasePuzzleCollectionSpec = {
  generateCorrupt: boolean;
  mascotBody: string;
  mascotSadFace: string;
  mascotTail: string;
  palette: string;
  bgId: number;
  bgmId: number;
  asm?: string;
};

export type PuzzleCollectionSpec = BasePuzzleCollectionSpec & {
  name: string;
  puzzles: PuzzleSpec[];
};

export type PuzzlePaintingSpec = BasePuzzleCollectionSpec & {
  name: string;
  paintingFile: string;
  tileSize: 5 | 8 | 15;
  paintingEntriesPerRow: number;
};

export type JsonSpec = {
  startingId?: number;
  outputDir: string;
  mainSymFile: string;
  collections: Array<PuzzleCollectionSpec | PuzzlePaintingSpec>;
};
