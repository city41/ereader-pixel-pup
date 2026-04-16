import * as path from "node:path";
import * as fsp from "node:fs/promises";
import execa from "execa";
import assert from "node:assert";
import { mkdirp } from "mkdirp";

type CardSpec = {
  name: string;
  rawRoot: string;
  rawFullPath?: string;
  rawCount: number;
  sourceSvg: string;
  strips: [number] | [number, number];
  codeDir: string;
  make?: string;
  stripFormat?: "bmp" | "svg";
  shape?: "circle" | "square";
  gap?: number;
};

type Cards = Array<CardSpec>;

async function clean(dir: string) {
  const result = await execa("make", ["clean"], {
    cwd: dir,
  });

  console.log(result.stdout);
}

async function make(dir: string, makeArgs: string[]) {
  const result = await execa("make", makeArgs, {
    cwd: dir,
  });

  console.log(result.stdout);
}

async function assertRawCount(dir: string, rawRoot: string, count: number) {
  const allFiles = await fsp.readdir(dir);
  const rawFiles = allFiles.filter(
    (f) => f.endsWith(".raw") && f.startsWith(rawRoot)
  );

  assert(
    rawFiles.length === count,
    `Number of raws (${rawFiles.length}) is unexpected (${count})`
  );
}

async function createSvgDotStrips(card: CardSpec) {
  for (let i = 0; i < card.rawCount; ++i) {
    let rawFile;

    if (card.rawFullPath) {
      rawFile = card.rawFullPath;
    } else {
      rawFile = `${card.rawRoot}${i + 1}.raw`;
    }

    const svgStripRoot = `${card.rawRoot}${i + 1}`;

    const args = [
      "--input",
      rawFile,
      "--output",
      svgStripRoot,
      "--format",
      "svg",
      "--svg-shape",
      card.shape ?? "circle",
      "--dot-gap",
      card.gap?.toString() ?? "50",
    ];

    console.log("about to exec: convert-raw", args.join(" "));

    const result = await execa("convert-raw", args, {
      cwd: card.codeDir,
    });

    console.log(result.stdout);
  }
}

async function createBmpDotStrips(card: CardSpec) {
  for (let i = 0; i < card.rawCount; ++i) {
    let rawFile;

    if (card.rawFullPath) {
      rawFile = card.rawFullPath;
    } else {
      rawFile = `${card.rawRoot}${i + 1}.raw`;
    }

    const bmpStripRoot = path.resolve(
      process.cwd(),
      card.codeDir,
      `${card.rawRoot}${i + 1}`
    );

    const args = [
      "--input",
      rawFile,
      "--output",
      bmpStripRoot,
      "--format",
      "bmp",
      "--dpi",
      "600",
    ];

    console.log("about to exec: convert-raw", args.join(" "));

    const result = await execa("convert-raw", args, {
      cwd: card.codeDir,
    });

    console.log(result.stdout);
  }
}

async function injectStrips(card: CardSpec, bleed: boolean, outputDir: string) {
  console.log("inject strips", card.name, outputDir);
  const inputSvgPath = path.resolve(process.cwd(), card.sourceSvg);

  const suffix =
    card.stripFormat === "bmp"
      ? "bmp"
      : `${card.shape ?? "circle"}_gap${card.gap ?? 50}.svg`;

  const strip1ImgPath = path.resolve(
    process.cwd(),
    card.codeDir,
    `${card.rawRoot}${card.strips[0]}.${suffix}`
  );

  const strip2Args =
    card.strips.length === 2
      ? [
          "--strip2",
          path.resolve(
            process.cwd(),
            card.codeDir,
            `${card.rawRoot}${card.strips[1]}.${suffix}`
          ),
        ]
      : [];

  const bleedArg = bleed ? ["--bleed"] : [];

  const args = [
    "--input",
    inputSvgPath,
    "--output",
    outputDir,
    "--strip1",
    strip1ImgPath,
    ...strip2Args,
    ...bleedArg,
  ];

  console.log("about to exec: inject-strips", args.join(" "));

  const result = await execa("inject-strips", args, {
    cwd: card.codeDir,
  });

  console.log(result.stdout);
  console.log(result.stderr);

  const inputFileRoot = path.basename(inputSvgPath, ".svg");
  const outputPath = path.resolve(outputDir, `${inputFileRoot}_injected.svg`);
  const finalOutputPath = path.resolve(
    outputDir,
    `${inputFileRoot}_${card.shape ?? ""}_${card.gap?.toString() ?? ""}_injected.svg`
  );
  await fsp.rename(outputPath, finalOutputPath);
}

async function processCard(
  card: CardSpec,
  bleed: boolean,
  outputDir: string
): Promise<void> {
  console.log("processing", card.name);
  if (card.make) {
    await clean(path.resolve(card.codeDir));
    await make(card.codeDir, card.make.split(" "));
  }

  await assertRawCount(card.codeDir, card.rawRoot, card.rawCount);

  if (card.stripFormat === "bmp") {
    await createBmpDotStrips(card);
  } else {
    await createSvgDotStrips(card);
  }

  await injectStrips(card, bleed, outputDir);
}

async function main(cardsJsonPath: string, bleed: boolean, outputDir: string) {
  console.log({ outputDir });
  await execa("rm", ["-rf", outputDir]);
  await mkdirp(outputDir);

  const cards = require(cardsJsonPath) as Cards;

  for (const card of cards) {
    await processCard(card, bleed, outputDir);
    console.log("processed", card.name);
  }

  console.log(`processed ${cards.length} cards`);
}

if (require.main === module) {
  const [
    _tsNode,
    _generatePrintSvgs,
    cardsJsonPath,
    bleedOrNoBleed,
    outputDir,
  ] = process.argv;

  if (
    !cardsJsonPath ||
    !bleedOrNoBleed ||
    !outputDir ||
    (bleedOrNoBleed !== "bleed" && bleedOrNoBleed !== "no-bleed")
  ) {
    console.error(
      "usage: ts-node generatePrintSvgs.ts <cards-json-path> <bleed | no-bleed> <output-dir>"
    );
    process.exit(1);
  }

  main(
    path.resolve(cardsJsonPath),
    bleedOrNoBleed === "bleed",
    path.resolve(outputDir)
  )
    .then(() => console.log("done"))
    .catch((e) => console.error(e));
}
