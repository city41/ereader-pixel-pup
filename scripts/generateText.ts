import * as path from "node:path";
import * as fsp from "node:fs/promises";
import { asciiInShiftJis } from "./asciiInShiftJis";

type TextLineSpec = {
  key: string;
  en: string;
  jpn?: string;
};

type JSONSpec = {
  text: Array<TextLineSpec>;
};

async function main(jsonPath: string, outputDir: string) {
  const json = require(jsonPath) as JSONSpec;

  const enEntries = json.text.map((ts) => {
    return `${ts.key}_text:\n\t.ascii "${ts.en}\\0"\n${ts.key}_text_end:`;
  });

  const ejEntries = json.text.map((ts) => {
    const bytes = asciiInShiftJis(ts.en);

    return `${ts.key}_text:\n\t.db ${bytes.map((b) => `0x${b.toString(16)}`).join(",")},0\n${ts.key}_text_end:`;
  });

  const usSrc = enEntries.join("\n");
  const ejSrc = ejEntries.join("\n");

  const usOutputPath = path.resolve(outputDir, "text_us.asm");
  const ejOutputPath = path.resolve(outputDir, "text_ej.asm");

  await fsp.writeFile(usOutputPath, usSrc);
  console.log("wrote", usOutputPath);
  await fsp.writeFile(ejOutputPath, ejSrc);
  console.log("wrote", ejOutputPath);
}

if (require.main === module) {
  const [_tsNode, _generateText, jsonTextPath, outputDir] = process.argv;

  if (!jsonTextPath || !outputDir) {
    console.error(
      "usage: ts-node generateText.ts <json-text-file> <output-dir>"
    );
    process.exit(1);
  }

  main(path.resolve(jsonTextPath), path.resolve(outputDir))
    .then(() => console.log("done"))
    .catch((e) => console.error(e));
}
