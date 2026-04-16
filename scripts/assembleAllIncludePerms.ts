import * as path from "node:path";
import * as fsp from "node:fs/promises";
import { IncludesJson, generateIncludesAsm } from "./generateIncludesAsm";
import execa from "execa";

const PERM_LIMIT = 2000;

function permutator(inputArr: IncludesJson): IncludesJson[] {
  const results: IncludesJson[] = [];

  function permute(arr: IncludesJson, memoIn?: IncludesJson) {
    if (results.length > PERM_LIMIT) {
      return results;
    }

    var cur: IncludesJson;
    var memo = memoIn ?? [];

    for (var i = 0; i < arr.length; i++) {
      cur = arr.splice(i, 1);
      if (arr.length === 0) {
        results.push(memo.concat(cur));
      }
      permute(arr.slice(), memo.concat(cur));
      arr.splice(i, 0, cur[0]);
    }

    return results;
  }

  return permute(inputArr);
}

function generatePerms(includesJson: IncludesJson): string[] {
  const alwaysFirst = includesJson.filter((inc) => inc.alwaysFirst);
  const rest = includesJson.filter((inc) => !inc.alwaysFirst);

  if (alwaysFirst.length > 1) {
    throw new Error(
      `More than one alwaysFirst specified: ${JSON.stringify(alwaysFirst)}`
    );
  }

  const restPerms = permutator(rest);

  return restPerms.map((p) => {
    return generateIncludesAsm(alwaysFirst.concat(p));
  });
}

async function getVpkSize(
  gameDir: string,
  includesAsm: string
): Promise<number> {
  await fsp.writeFile(path.resolve(gameDir, "includes.asm"), includesAsm);

  await execa("make", ["clean"], {
    cwd: gameDir,
  });

  await execa("make", {
    cwd: gameDir,
  });

  const vpk = await fsp.readFile(path.resolve(gameDir, "includes.vpk"));

  return Array.from(vpk).length;
}

async function main(gameDir: string) {
  const includesJson = require(
    path.resolve(gameDir, "includes.json")
  ) as IncludesJson;

  console.log("about to generate perms from", includesJson.length, "inputs");

  const perms = generatePerms(includesJson);

  console.log(perms.length, "perms");

  let worst = 0;
  let best = Number.MAX_SAFE_INTEGER;

  for (let i = 0; i < perms.length; ++i) {
    const perm = perms[i];

    const vpkSize = await getVpkSize(gameDir, perm);

    if (vpkSize > worst) {
      worst = vpkSize;
    }
    if (vpkSize < best) {
      best = vpkSize;
    }

    console.log(i, vpkSize);
  }

  console.log({ worst, best });
}

if (require.main === module) {
  const [_tsNode, _assembleAllIncludePermsTs, gameDir] = process.argv;

  if (!gameDir) {
    console.error("usage: ts-node generateIncludesAsm.ts <game-src-dir>");
    process.exit(1);
  }

  main(path.resolve(gameDir))
    .then(() => console.log("done"))
    .catch((e) => console.error(e));
}
