import * as path from "node:path";
import * as fsp from "node:fs/promises";

async function main(outputPath: string, count: number) {
  const asm = new Array(count).fill(".db 0").join("\n");

  await fsp.writeFile(outputPath, asm);

  console.log("wrote", outputPath);
}

if (require.main === module) {
  const [_tsNode, _genDS, count, outputPath] = process.argv;

  if (!count || !outputPath) {
    console.error("usage: ts-node genDS.ts <count> <output-path>");
    process.exit(1);
  }

  main(path.resolve(outputPath), parseInt(count))
    .then(() => console.log("done"))
    .catch((e) => console.error(e));
}
