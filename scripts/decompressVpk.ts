import * as path from "path";
import * as os from "os";
import * as fsp from "fs/promises";
import { mkdirp } from "mkdirp";
import execa from "execa";

async function decompressVpk(vpk: number[]): Promise<number[]> {
  const tmpDir = path.resolve(os.tmpdir(), `decompressVpk-${Date.now()}`);
  await mkdirp(tmpDir);

  const vpkWritePath = path.resolve(tmpDir, "decompressVpk.vpk");
  const decompressedWritePath = path.resolve(tmpDir, "decompressVpk.bin");
  await fsp.writeFile(vpkWritePath, Uint8Array.from(vpk));

  // @ts-ignore
  const { stdout, stderr } = await execa(`${__dirname}/wine.sh`, [
    "nevpk.exe",
    "-d",
    "-i",
    vpkWritePath,
    "-o",
    decompressedWritePath,
  ]);

  // console.log("stdout");
  // console.log(stdout);
  // console.log("stderr");
  // console.log(stderr);

  const buffer = await fsp.readFile(decompressedWritePath);
  const byteArray = new Uint8Array(buffer);

  return Array.from(byteArray);
}

export { decompressVpk };
