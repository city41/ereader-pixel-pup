function toHex(v: number, byteCount = 1): string {
  const rawHex = v.toString(16);

  const expectedLength = byteCount * 2;

  const fillCount = expectedLength - rawHex.length;

  const filler = new Array(fillCount).fill("0").join("");

  return "0x" + filler + rawHex;
}

const jistable = [
  0x40, 0x49, 0x00, 0x94, 0x90, 0x93, 0x95, 0x66, 0x69, 0x6a, 0x96, 0x7b, 0x43,
  0x5d, 0x44, 0x5e, 0x4f, 0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58,
  0x46, 0x47, 0x83, 0x81, 0x84, 0x48, 0x97, 0x60, 0x61, 0x62, 0x63, 0x64, 0x65,
  0x66, 0x67, 0x68, 0x69, 0x6a, 0x6b, 0x6c, 0x6d, 0x6e, 0x6f, 0x70, 0x71, 0x72,
  0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x6d, 0x5f, 0x6e, 0x4f, 0x51, 0x4d,
  0x81, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x8b, 0x8c, 0x8d,
  0x8e, 0x8f, 0x90, 0x91, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a,
  0x6f, 0x62, 0x70, 0x60,
];

const punctuation: Record<string, [number, number] | [number]> = {
  ".": [0xc4, 0x44],
  ":": [0xc4, 0xc46],
  ";": [0xc4, 0x47],
  "?": [0xc4, 0x48],
  "!": [0xc4, 0x49],
  ",": [0xc4, 0x43],
  "~": [0xc4, 0x60],
  "‘": [0xc4, 0x65],
  "’": [0xc4, 0x66],
  "'": [0xc4, 0x66],
  "“": [0xc4, 0x67],
  "”": [0xc4, 0x68],
  "&": [0xc4, 0x95],
  "@": [0xc4, 0x97],
  "(": [0xc4, 0x69],
  ")": [0xc4, 0x6a],
  "{": [0xc4, 0x6f],
  "}": [0xc4, 0x70],
  "<": [0xc4, 0x71],
  ">": [0xc4, 0x72],
  "\n": [0xa],
};

function asciiInShiftJis(str: string): number[] {
  const output: number[] = [];

  let oi = 0;

  for (let i = 0; i < str.length; ++i) {
    if (
      (str[i] >= "a" && str[i] <= "z") ||
      (str[i] >= "A" && str[i] <= "Z") ||
      (str[i] >= "0" && str[i] <= "9") ||
      punctuation[str[i]] !== undefined ||
      str[i] === " "
    ) {
      // console.log(
      //   str[i],
      //   str.charCodeAt(i),
      //   str.charCodeAt(i) - 0x20,
      //   jistable[str.charCodeAt(i) - 0x20]
      // );

      if (punctuation[str[i]] !== undefined) {
        output[oi++] = punctuation[str[i]][0];
        if (punctuation[str[i]].length === 2) {
          output[oi++] = (punctuation[str[i]] as [number, number])[1];
        }
      } else {
        output[oi++] = 0x82;
        const jisbyte = jistable[str.charCodeAt(i) - 0x20];
        output[oi++] = jisbyte
        console.log(str[i], ':', str.charCodeAt(i).toString(16), '->', jisbyte.toString(16));
      }
    }
  }

  return output;
}

if (require.main === module) {
  function main(inputStr: string) {
    const bytes = asciiInShiftJis(inputStr);
    bytes.push(0);

    console.log("; ascii in shift jis");
    inputStr.split("\n").forEach((isl) => {
      console.log(";", isl);
    });

    const chunkSize = 10;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, i + chunkSize);
      // do whatever
      console.log(`.db ${chunk.map((b) => toHex(b)).join(",")}`);
    }
  }

  function usage() {
    console.error("usage: ts-node asciiinShiftJis.ts <input-string>");
    process.exit(1);
  }

  if (require.main === module) {
    const [_tsNode, _asciiinShiftJis, inputStr] = process.argv;

    if (!inputStr) {
      usage();
    }

    main(inputStr);
  }
}

export { asciiInShiftJis };
