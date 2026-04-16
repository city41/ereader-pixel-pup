import { convert } from "utf16-to-sjis";

const SPACE_BYTES = [0x82, 0x40];

function convertToSJIS(input: string): number[] {
  const pieces = input.split(" ");

  const output: number[] = [];

  for (let i = 0; i < pieces.length; ++i) {
    const piece = pieces[i];
    const pieceBytes = Array.from(convert(piece));
    output.push(...pieceBytes);

    if (i < pieces.length - 1) {
      output.push(...SPACE_BYTES);
    }
  }

  return output;
}

const strings = [
  {
    en: "Fill a column King to Ace in the playfield.",
    jp: `キングから エースの
じゅんで 1れつそろえる`,
  },
  {
    en: "Win a game on two diamond difficulty.",
    jp: `むずかしさ2で
ゲームクリア`,
  },
  {
    en: "Defeat the boss with Tina's special attack.",
    jp: `ティーナの スペシャルで
ボスをたおす`,
  },
];

if (require.main === module) {
  for (const e of strings) {
    console.log(e.en);
    console.log(e.jp);
    const sjis = convertToSJIS(e.jp);
    console.log(sjis.map((b) => `0x${b.toString(16)}`).join(","));
    console.log();
  }
}
