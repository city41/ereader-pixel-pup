import execa from "execa";
import * as path from "node:path";
import * as fsp from "node:fs/promises";
import { parseSymbols } from "../../../scripts/z80js/parseSymbol";

async function clean(dir: string) {
  const result = await execa("make", ["clean"], {
    cwd: dir,
  });

  console.log(result.stdout);
}

async function build(dir: string, text: "US_TEXT" | "EJ_TEXT") {
  const result = await execa("make", [`TEXT=${text}`], {
    cwd: dir,
  });

  console.log(result.stdout);
}

async function getSymbols(
  text: "US_TEXT" | "EJ_TEXT",
): Promise<Record<string, number>> {
  const rootDir = "/home/matt/dev/ereaderz80/src/nonogram";

  await clean(rootDir);

  await build(rootDir, text);

  const symText = (
    await fsp.readFile(path.resolve(rootDir, "main.sym"))
  ).toString();
  const symbols = parseSymbols(symText);

  return symbols.symbolToAddress;
}

describe("scan_puzzle_buffer", function () {
  it("should be at the same address in EJ and US", async function () {
    const ejSymbols = await getSymbols("EJ_TEXT");
    const usSymbols = await getSymbols("US_TEXT");

    expect(usSymbols["scan_puzzle_buffer"]).toBeDefined();
    expect(ejSymbols["scan_puzzle_buffer"]).toBeDefined();

    expect(usSymbols["scan_puzzle_buffer"]).toEqual(
      ejSymbols["scan_puzzle_buffer"],
    );
  });
});
