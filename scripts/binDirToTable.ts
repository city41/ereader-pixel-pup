import * as path from "path";
import * as fsp from "fs/promises";
import { ParsedBin, parseBin } from "./parseBin";
import * as os from "os";
import { mkdirp } from "mkdirp";

type ParsedBinFromFile = ParsedBin & {
  file: string;
};

async function copyFile(src: string, dest: string) {
  const data = await fsp.readFile(src);
  return fsp.writeFile(dest, data);
}

async function processRaw(rawPath: string): Promise<ParsedBinFromFile | null> {
  const tmpDir = path.resolve(os.tmpdir(), `processRaw-${Date.now()}`);
  await mkdirp(tmpDir);
  const tmpPath = path.resolve(tmpDir, `processRaw-${Date.now()}.raw`);

  await copyFile(rawPath, tmpPath);

  const parsedBinResult = await parseBin(tmpPath);

  if (!parsedBinResult) {
    return null;
  }

  return {
    ...parsedBinResult.parsedBin,
    file: path.basename(rawPath),
  };
}

function markdownTableHeaderBoundary(numEntries: number): string {
  const dashes = new Array(numEntries).fill("-");

  return "|" + dashes.join("|") + "|";
}

function markdownTableRow(values: any[]): string {
  return values.reduce((accum, v) => {
    return accum + ` ${v} |`;
  }, "|");
}

function toStrings(vals: any[]) {
  return vals.map((v) => {
    if (v === null || v === undefined) {
      return "";
    } else {
      return String(v);
    }
  });
}

function getHeaders(b: ParsedBinFromFile): (keyof ParsedBinFromFile)[] {
  const keys = Object.keys(b).filter(
    (k) => k !== "file" && k !== "title" && k !== "subtitle"
  ) as (keyof ParsedBinFromFile)[];

  return ["file", "title", "subtitle", ...keys];
}

function getValues(b: ParsedBinFromFile): string[] {
  const values = Object.entries(b).reduce<any[]>((accum, e) => {
    if (e[0] === "file" || e[0] === "title" || e[0] === "subtitle") {
      return accum;
    } else {
      return [...accum, e[1]];
    }
  }, []);

  return toStrings([b.file, b.title, b.subtitle, ...values]);
}

function createTable(parsedBins: ParsedBinFromFile[]): string {
  const headerRow = markdownTableRow(getHeaders(parsedBins[0]));
  const header =
    headerRow +
    "\n" +
    markdownTableHeaderBoundary(Object.keys(parsedBins[0]).length);

  const entries = parsedBins.map((pb, i, a) => {
    return markdownTableRow(getValues(pb));
  });

  return [header, ...entries].join("\n");
}

async function main(rawDirPath: string, outputPath: string) {
  const files = await fsp.readdir(rawDirPath);

  const parsedFiles: ParsedBinFromFile[] = [];

  for (const file of files) {
    if (file.endsWith(".raw")) {
      console.log("parsing", file);
      const parsedFile = await processRaw(path.resolve(rawDirPath, file));

      // only save the parse results of the first strip,
      // subsequent strips dont quite parse right, and they have redudant info anyway
      if (parsedFile && parsedFile.stripNumber === 1) {
        parsedFiles.push(parsedFile);
      } else {
        console.error("failed to parse", file);
      }
    }
  }

  const tableMarkdown = createTable(parsedFiles);

  await fsp.writeFile(outputPath, tableMarkdown);

  console.log('wrote', outputPath);
}

const [_tsNode, _binDirToTable, rawDirPath, outputPath] = process.argv;

if (!rawDirPath || !outputPath) {
  console.error("usage: ts-node binDirToTable <raw-dir-path> <output-path>");
  process.exit(1);
}

main(path.resolve(rawDirPath), path.resolve(outputPath))
  .then(() => console.log("done"))
  .catch((e) => console.error(e));
