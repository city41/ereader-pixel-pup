// parses a symbol file produced by asxxxx's -s -w flags

// example symbol file
//     ERAPI_SpriteSetPosAnimatedSpeed                         =   00DA
//     ERAPI_SpriteShow                                        =   0046
//     ERAPI_SystemSpriteIdIsValid                             =   00F0
//   2 card_loop                                                   0127 R
//   2 deck_auto_move_card                                         0155 R
//   2 deck_center_card                                            014C R

type ParseSymbolResult = {
  symbolToAddress: Record<string, number>;
  addressToSymbol: Record<number, string>;
};

function parseSymbols(symFile: string): ParseSymbolResult {
  const lines = symFile.split("\n");

  const addressToSymbol: Record<number, string> = {};
  const symbolToAddress: Record<string, number> = {};

  lines.forEach((line) => {
    const split = line.split(" ").filter((token) => token.trim());
    // split is now something like
    // ['2', 'deck_center_card', '014c'], ['2', 'scan_puzzle_buffer', 'r'] or ['foo', '0112'] without the leading 2

    let symbol, addressS;

    if (split.length >= 3) {
      symbol = split[1];
      addressS = split[2];
    } else {
      symbol = split[0];
      addressS = split[1];
    }

    const address = parseInt(addressS, 16);

    addressToSymbol[address] = symbol;
    symbolToAddress[symbol] = address;
  });

  return { addressToSymbol, symbolToAddress };
}

export { parseSymbols };
export type { ParseSymbolResult };
