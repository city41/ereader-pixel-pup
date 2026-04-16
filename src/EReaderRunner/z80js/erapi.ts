import { BaseMemory } from "../BaseMemory";
import { ScannedInBin, Z80State } from "./types";

type ErapiState = {
  z80State: Z80State;
  memory: BaseMemory;
  scannedInBins: ScannedInBin[];
  scanCount: number;
  logger: (msg: string) => void;
};

type ErapiEntry = {
  functionName: string;
  handler?: (state: ErapiState) => void;
};

type Z80Registers = {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  h: number;
  l: number;
};

type ErapiCall = {
  name: string;
  id: number;
  inputRegisters: Z80Registers;
  outputRegisters: Z80Registers;
  // TODO: top of stack
};

let spriteHandleId = 1;

const erapi0: Record<number, ErapiEntry> = {
  [0x0]: {
    functionName: "FadeIn",
  },
  [0x1]: {
    functionName: "FadeOut",
  },
  [0x10]: {
    functionName: "LoadSystemBackground",
  },
  [0x11]: {
    functionName: "SetBackgroundOffset",
  },
  [0x12]: {
    functionName: "SetBackgroundAutoScroll",
  },
  [0x19]: {
    functionName: "SetBackgroundMode",
  },
  [0x20]: {
    functionName: "LayerShow",
  },
  [0x21]: {
    functionName: "LayerHide",
  },
  [0x2d]: {
    functionName: "LoadCustomBackground",
  },
  [0x30]: {
    functionName: "CreateSystemSprite",
  },
  [0x31]: {
    functionName: "SpriteFree",
  },
  [0x32]: {
    functionName: "SetSpritePos",
  },
  [0x36]: {
    // hl = sprite handle
    // e = frame#
    functionName: "SetSpriteFrame",
  },
  [0x39]: {
    // hl = sprite handle
    // auto moves the sprite
    //
    // d = x velocity
    // e = ??? if it isn't zero, it influences x velocity
    // b = y velocity
    // c = ???
    //
    // gbatek says:  RST0_39h SetSpriteAutoMove, HL=sprite handle, DE=X, BC=Y
    functionName: "SpriteAutoMove",
  },
  [0x3c]: {
    // hl = sprite handle
    // de = sprite frame duration in system frames
    // bc =
    // bc: 0 = Start Animating Forever
    //     1 = Stop Animation
    //     2 > Number of frames to animate for -2 (ex. 12 animates for 10 frames)
    functionName: "SpriteAutoAnimate",
  },
  [0x45]: {
    // hl = sprite handle
    // c = sprite palette #
    // e = bg#
    //
    // draws the sprite that hl points to into
    // the e'th background. It uses the c'th palette to do so
    // It uses the sprite's x/y to decide where in the bg to draw it
    // this is set with ERAPI_SetSpritePos
    // x = sprite.x / 8 - 1
    // y = sprite.y / 8 - 1
    functionName: "SpriteDrawOnBackground",
  },
  [0x46]: {
    functionName: "SpriteShow",
  },
  [0x47]: {
    functionName: "SpriteHide",
  },
  [0x48]: {
    functionName: "SpriteMirrorToggle",
  },
  [0x4d]: {
    functionName: "SpriteCreate",
    handler: (state) => {
      state.z80State.h = 0;
      state.z80State.l = spriteHandleId++;
    },
  },
  [0x5b]: {
    functionName: "SpriteAutoScaleUntilSize",
  },
  [0x7e]: {
    functionName: "SetBackgroundPalette",
  },
  [0x90]: {
    functionName: "CreateRegion",
  },
  [0x91]: {
    functionName: "SetRegionColor",
  },
  [0x92]: {
    functionName: "ClearRegion",
  },
  [0x98]: {
    functionName: "SetTextColor",
  },
  [0x99]: {
    functionName: "DrawText",
  },
  [0x9a]: {
    functionName: "SetTextSize",
  },
  [0xc0]: {
    functionName: "GetTextWidth",
  },
  [0xc2]: {
    functionName: "ScanDotCode",
    handler: (state) => {
      state.logger(`ScanDotCode, scanCount: ${state.scanCount}`);
      // get the destination
      const hl = (state.z80State.h << 8) | state.z80State.l;

      for (
        let i = 0;
        i < state.scannedInBins[state.scanCount].decodedRaw.length;
        ++i
      ) {
        state.memory.setValueAt(
          hl + i,
          state.scannedInBins[state.scanCount].decodedRaw[i]
        );
      }

      // 6 is "non-standalone" card
      state.z80State.a = state.scannedInBins[state.scanCount].scanResult ?? 6;
      state.scanCount += 1;
    },
  },
  [0xda]: {
    functionName: "SpriteSetPosAnimateSpeed",
  },
  [0xdd]: {
    functionName: "DecompressVPKOrNonVPK",
    handler(state) {
      const de = (state.z80State.d << 8) | state.z80State.e;

      for (let i = 0; i < state.scannedInBins[0].decompressed.length; ++i) {
        state.memory.setValueAt(de + i, state.scannedInBins[0].decompressed[i]);
      }
    },
  },
  [0xf0]: {
    functionName: "SystemSpriteIdIsValid",
  },
};

const erapi8: Record<number, ErapiEntry> = {
  [0x0]: {
    functionName: "Exit",
  },
  [0x1]: {
    // hl = a * e
    functionName: "Mul8",
    handler: (state) => {
      state.z80State.h = 0;
      state.z80State.l = state.z80State.a * state.z80State.e;
    },
  },
  [0x2]: {
    // hl = hl * de
    functionName: "Mul16",
    handler: (state) => {
      const de = (state.z80State.d << 8) | state.z80State.e;
      const hl = (state.z80State.h << 8) | state.z80State.l;
      const result = de * hl;
      state.z80State.h = result >> 8;
      state.z80State.l = result & 0xff;
    },
  },
  [0x3]: {
    // hl = hl / de
    functionName: "Div",
    handler: (state) => {
      const de = (state.z80State.d << 8) | state.z80State.e;
      const hl = (state.z80State.h << 8) | state.z80State.l;
      const result = Math.floor(hl / de);
      state.z80State.h = result >> 8;
      state.z80State.l = result & 0xff;
    },
  },
  [0x4]: {
    // hl = hl % de
    functionName: "Mod",
    handler: (state) => {
      const de = (state.z80State.d << 8) | state.z80State.e;
      const hl = (state.z80State.h << 8) | state.z80State.l;
      const result = hl % de;
      state.z80State.h = result >> 8;
      state.z80State.l = result & 0xff;
    },
  },
  [0x05]: {
    functionName: "PlaySystemSound",
  },
  [0x07]: {
    functionName: "Rand",
    handler: (state) => {
      const randA = Math.floor(Math.random() * 256);
      state.z80State.a = randA;
    },
  },
  [0x12]: {
    functionName: "RandMax",
    handler: (state) => {
      const randA = Math.floor(Math.random() * state.z80State.a);
      state.z80State.a = randA;
    },
  },
  [0x16]: {
    functionName: "PauseSound",
  },
  [0x19]: {
    functionName: "IsSoundPlaying",
  },
  [0x1b]: {
    functionName: "FlashLoadUserData",
  },
  [0x1c]: {
    functionName: "FlashSaveUserData",
  },
};

class Erapi {
  scanCount = 0;

  constructor(
    private handlers: Record<number, ErapiEntry>,
    private memory: BaseMemory,
    private scannedInBins: ScannedInBin[],
    private logger: (msg: string) => void,
    private onCall: (call: ErapiCall) => void
  ) {}

  handle(id: number, inputZ80State: Z80State): Z80State {
    const handler = this.handlers[id];
    const inputRegisters = {
      a: inputZ80State.a,
      b: inputZ80State.b,
      c: inputZ80State.c,
      d: inputZ80State.d,
      e: inputZ80State.e,
      h: inputZ80State.h,
      l: inputZ80State.l,
    };
    let outputRegisters = {
      a: inputZ80State.a,
      b: inputZ80State.b,
      c: inputZ80State.c,
      d: inputZ80State.d,
      e: inputZ80State.e,
      h: inputZ80State.h,
      l: inputZ80State.l,
    };

    if (handler) {
      this.logger(`erapi call: ${handler.functionName}`);
    }

    if (handler?.handler) {
      const handlerState = {
        z80State: inputZ80State,
        memory: this.memory,
        scannedInBins: this.scannedInBins,
        scanCount: this.scanCount,
        logger: this.logger,
      };
      handler.handler(handlerState);

      outputRegisters = {
        a: inputZ80State.a,
        b: inputZ80State.b,
        c: inputZ80State.c,
        d: inputZ80State.d,
        e: inputZ80State.e,
        h: inputZ80State.h,
        l: inputZ80State.l,
      };

      this.scanCount = handlerState.scanCount;
    }

    if (handler) {
      this.onCall({
        id,
        name: handler.functionName,
        inputRegisters,
        outputRegisters,
      });
    }

    return inputZ80State;
  }
}

export { Erapi, erapi0 as erapi0Handlers, erapi8 as erapi8Handlers };
export type { ErapiCall };
