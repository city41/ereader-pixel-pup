import * as path from "path";
import { glob } from "glob";
import { parseRaw } from "../../../scripts/parseRaw";

const V_CHARCODE = "v".charCodeAt(0);
const P_CHARCODE = "p".charCodeAt(0);
const K_CHARCODE = "k".charCodeAt(0);
const ZERO_CHARCODE = "0".charCodeAt(0);

function getVpkIndex(vpkBin: number[]) {
  for (let i = 0; i < vpkBin.length; ++i) {
    if (
      vpkBin[i] === V_CHARCODE &&
      vpkBin[i + 1] === P_CHARCODE &&
      vpkBin[i + 2] === K_CHARCODE &&
      vpkBin[i + 3] === ZERO_CHARCODE
    ) {
      return i;
    }
  }

  return -1;
}

async function main(rawDirPath: string) {
  const vpkEntries = await glob("**/*.raw", { cwd: rawDirPath });

  for (const rawEntry of vpkEntries) {
    const parseResult = await parseRaw(path.resolve(rawDirPath, rawEntry));

    if (!parseResult) {
      throw new Error(`Failed to parse: ${rawEntry}`);
    }

    const vpkIndex = getVpkIndex(parseResult?.binData);

    console.log({
      vpkEntry: rawEntry,
      vpkIndex,
      parsed: JSON.stringify(parseResult.parsedBin),
    });
  }
}

if (require.main === module) {
  const [_tsNode, _vpkLocation, rawDirPath] = process.argv;

  if (!rawDirPath) {
    console.error("usage: ts-node vpkLocation.ts <raw-dir-path>");
    process.exit(1);
  }

  main(path.resolve(rawDirPath))
    .then(() => console.log("done"))
    .catch((e) => console.error(e));
}
