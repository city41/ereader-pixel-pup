import * as path from "path";
import * as fsp from "fs/promises";
// @ts-ignore
import { Z80 } from "./Z80";
import { Opcode } from "./disasm/disassembler/opcode";
import { BaseMemory, MAX_MEM_SIZE } from "./disasm/disassembler/basememory";
import { erapi0, erapi8 } from "./erapi";
import { AugmentedZ80State, Z80State } from "./types";
import { ParseSymbolResult, parseSymbols } from "./parseSymbol";

const DUMP_REGISTERS = false;
const ORG = 0x100;

function hex(v: number, len: number): string {
  const vs = v.toString(16);
  const paddingLen = Math.max(len - vs.length, 0);
  const padding = new Array(paddingLen).fill("0").join("");

  return `${padding}${vs}`;
}

function getRegistersForTrace(state: Z80State): string {
  const augmented = augmentState(state);

  const regs = [
    `a:  ${hex(augmented.a, 2)}`,
    `b:  ${hex(augmented.b, 2)}`,
    `c:  ${hex(augmented.c, 2)}`,
    `d:  ${hex(augmented.d, 2)}`,
    `e:  ${hex(augmented.e, 2)}`,
    `h:  ${hex(augmented.h, 2)}`,
    `l:  ${hex(augmented.l, 2)}`,
    `bc: ${hex(augmented.bc, 4)}`,
    `de: ${hex(augmented.de, 4)}`,
    `hl: ${hex(augmented.hl, 4)}`,
    `ix: ${hex(augmented.ix, 4)}`,
    `iy: ${hex(augmented.iy, 4)}`,
  ];

  return regs.join(", ");
}

function augmentState(state: Z80State): AugmentedZ80State {
  return {
    ...state,
    bc: (state.b << 8) | state.c,
    de: (state.d << 8) | state.e,
    hl: (state.h << 8) | state.l,
  };
}

function trace(state: Z80State, memory: BaseMemory) {
  const opcode = Opcode.getOpcodeAt(memory, state.pc);
  const mnemonic = opcode.disassemble().mnemonic;

  let additionalOpcodeInfo = "";
  let apiCallInfo = "";

  if (mnemonic === "rst  0x00" || mnemonic === "rst  0x08") {
    const apiCallId = memory.getValueAt(state.pc + 1);
    // additionalOpcodeInfo = `\n${hex(state.pc + 1, 4).toUpperCase()}: db ${hex(apiCallId, 2).toUpperCase()}`;
    const api = mnemonic === "rst  0x00" ? erapi0 : erapi8;
    const apiCall = api[apiCallId];
    additionalOpcodeInfo = `; apiCallId: ${hex(apiCallId, 2).toUpperCase()} ${apiCall?.functionName}`;
    if (apiCall) {
      additionalOpcodeInfo = `, ${
        apiCall?.functionName ?? "Unknown"
      } (${apiCallId.toString(16)})`;
      apiCallInfo = apiCall.callLogger?.(augmentState(state), memory) ?? "";
    }
  }

  const opcodeInfo = `${mnemonic}${additionalOpcodeInfo}`;
  const fillerLength = Math.max(40 - opcodeInfo.length, 0);
  const filler = new Array(fillerLength).fill(" ").join("");
  const registers = getRegistersForTrace(state);

  console.log(
    `${hex(
      state.pc,
      4
    ).toUpperCase()}: ${mnemonic}${additionalOpcodeInfo}${filler}${
      DUMP_REGISTERS ? "| " : ""
    }${DUMP_REGISTERS ? registers : ""}`
  );

  if (apiCallInfo) {
    console.log("\t", apiCallInfo);
  }
}

async function main(z80BinPath: string, symFilePath?: string) {
  Opcode.makeLowerCase();
  let symbols: ParseSymbolResult | undefined = undefined;

  if (symFilePath) {
    const symFile = (await fsp.readFile(symFilePath)).toString();
    symbols = parseSymbols(symFile);
    Opcode.setConvertToLabelHandler((value) => {
      return symbols!.addressToSymbol[value];
    });
  }

  const buffer = await fsp.readFile(z80BinPath);
  const dataUint8 = Uint8Array.from(buffer);
  const data = Array.from(dataUint8);

  const memory = new BaseMemory(ORG, MAX_MEM_SIZE);

  for (let i = 0; i < data.length; ++i) {
    memory.setValueAtIndex(i, data[i]);
  }

  memory.missingMemoryValue = 0;

  const core = {
    mem_read(address: number) {
      if (address === 0xc2) {
        return 1;
      }
      return memory.getValueAt(address);
    },

    mem_write(address: number, value: number) {
      if (address === 0x317f) {
        console.log("batman_deck_gfx_cur_card_frame", value);
      }

      if (address === 0x3180) {
        console.log("batman_deck_gfx_cur_card_y", value);
      }

      if (address === 0x317e) {
        console.log("batman_deck_gfx_cur_column_x", value);
      }

      memory.setValueAt(address, value);
    },

    io_read(_port: number) {
      throw new Error("io_read: not implemented");
    },

    io_write(_port: number, _value: number) {
      throw new Error("io_write: not implemented");
    },
  };

  console.log("data length", data.length);
  console.log("data last valid address", data.length + ORG - 1);

  // @ts-ignore
  const z80 = new Z80(core, { erapi0, erapi8 });

  const state = z80.getState();
  state.pc = ORG;
  z80.setState(state);

  let haltCount = 0;

  for (;;) {
    const state = z80.getState();

    if (state.halted) {
      ++haltCount;

      if (haltCount > 20) {
        break;
      } else {
        state.halted = false;
        z80.setState(state);
      }
    }

    trace(state, memory);

    z80.run_instruction();
  }

  if (symbols) {
    console.log("_deal_pile_deal_pile");
    const dumpAddress = symbols.symbolToAddress._deal_pile_deal_pile;

    for (let i = 0; i < 25; i += 1) {
      const val = memory.getValueAt(dumpAddress + i);
      console.log(hex(dumpAddress + i, 4), hex(val, 2));
    }
  }
}

const [_tsNode, _z80jsmain, z80BinPath, symFilePath] = process.argv;

if (!z80BinPath) {
  console.error("usage: ts-node z80jsmain.ts <z80-bin-file>");
  process.exit(1);
}

if (require.main === module) {
  main(
    path.resolve(z80BinPath),
    symFilePath ? path.resolve(symFilePath) : undefined
  )
    .then(() => console.log("done"))
    .catch((e) => console.error(e));
}
