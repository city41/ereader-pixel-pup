import * as path from "node:path";
import * as fsp from "node:fs/promises";

describe("vpk size", function () {
  it("should fit on two raws", async function () {
    const vpkPath = path.resolve(process.cwd(), "main.vpk");
    const vpkBin = Array.from(new Uint8Array(await fsp.readFile(vpkPath)));

    expect(vpkBin.length).toBeLessThan(4060);
  });
});
