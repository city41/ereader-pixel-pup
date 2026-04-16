import { BaseMemory } from "./disasm/disassembler/basememory";
import { AugmentedZ80State, Z80State } from "./types";

type ErapiEntry = {
  functionName: string;
  handler?: (state: Z80State) => Partial<Z80State>;
  callLogger?: (state: AugmentedZ80State, memory: BaseMemory) => string;
};

const TILE_SIZE_BYTES = 0x20;

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
    callLogger: (state, memory) => {
      const pointerToBgbStruct = state.de;
      const pointerToBgGfx = memory
        .getWordValueAt(pointerToBgbStruct)
        .toString(16);
      const pointerToBgPal = memory
        .getWordValueAt(pointerToBgbStruct + 2)
        .toString(16);
      const pointerToBgMap = memory
        .getWordValueAt(pointerToBgbStruct + 4)
        .toString(16);
      const bgGfxNumTiles = memory.getWordValueAt(pointerToBgbStruct + 6);
      const bgGfxSize = bgGfxNumTiles * TILE_SIZE_BYTES;
      const bgPalSize = (
        memory.getWordValueAt(pointerToBgbStruct + 8) * 32
      ).toString(16);

      const bgData = {
        pointerToBgbStruct: pointerToBgbStruct.toString(16),
        pointerToBgGfx,
        pointerToBgPal,
        pointerToBgMap,
        bgGfxNumTiles: bgGfxNumTiles.toString(16),
        bgGfxSize: bgGfxSize.toString(16),
        bgPalSize,
      };

      return JSON.stringify(bgData);
    },
  },
  [0x30]: {
    functionName: "CreateSystemSprite",
  },
  [0x31]: {
    functionName: "SpriteFree",
  },
  [0x32]: {
    functionName: "SetSpritePos",
    callLogger: (state) => {
      return JSON.stringify({
        spriteHandle: state.hl,
        x: state.de,
        y: state.bc,
      });
    },
  },
  [0x36]: {
    // hl = sprite handle
    // e = frame#
    functionName: "SetSpriteFrame",
    callLogger: (state) => {
      return JSON.stringify({
        spriteHandle: state.hl,
        frame: state.e,
      });
    },
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
    callLogger: (state) => {
      return JSON.stringify({
        spriteHandle: state.hl,
        paletteNum: state.c,
        bgNum: state.e,
      });
    },
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
      state.h = 0;
      state.l = spriteHandleId++;

      return state;
    },
    callLogger: (state, memory) => {
      const pointerToSpriteStruct = state.hl;
      const pointerToSpriteTiles = memory
        .getWordValueAt(pointerToSpriteStruct)
        .toString(16);
      const pointerToSpritePal = memory
        .getWordValueAt(pointerToSpriteStruct + 2)
        .toString(16);
      const spriteWidth = memory.getValueAt(pointerToSpriteStruct + 4);
      const spriteHeight = memory.getValueAt(pointerToSpriteStruct + 5);

      const spriteData = {
        pointerToSpriteStruct: pointerToSpriteStruct.toString(16),
        pointerToSpriteTiles,
        pointerToSpritePal,
        spriteWidth,
        spriteHeight,
        size: (spriteWidth * spriteHeight * 32).toString(16),
        spriteHandleId,
      };

      return JSON.stringify(spriteData);
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
    callLogger: (state, memory) => {
      const pointerToText = state.bc;
      const chars: number[] = [];

      let p = pointerToText;
      let c = memory.getValueAt(p);

      while (c !== 0) {
        chars.push(c);
        p += 1;
        c = memory.getValueAt(p);
      }

      const text = chars.map((c) => String.fromCharCode(c)).join("");
      return text;
    },
  },
  [0x9a]: {
    functionName: "SetTextSize",
  },
  [0xc0]: {
    functionName: "GetTextWidth",
  },
  [0xda]: {
    functionName: "SpriteSetPosAnimateSpeed",
    callLogger: (state) => {
      return JSON.stringify({
        spriteHandle: state.hl,
        x: state.de,
        y: state.bc,
      });
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
      state.h = 0;
      state.l = state.a * state.e;
      return state;
    },
    callLogger: (state) => {
      return `a:${state.a.toString(16)} * e:${state.e.toString(16)} -> hl: ${(
        state.a * state.e
      ).toString(16)}`;
    },
  },
  [0x2]: {
    // hl = hl * de
    functionName: "Mul16",
    handler: (state) => {
      const de = (state.d << 8) | state.e;
      const hl = (state.h << 8) | state.l;
      const result = de * hl;
      state.h = result >> 8;
      state.l = result & 0xff;
      return state;
    },
    callLogger: (state) => {
      return `hl:${state.hl.toString(16)} * de:${state.de.toString(
        16
      )} -> hl: ${(state.hl * state.de).toString(16)}`;
    },
  },
  [0x3]: {
    // hl = hl / de
    functionName: "Div",
    handler: (state) => {
      const de = (state.d << 8) | state.e;
      const hl = (state.h << 8) | state.l;
      const result = Math.floor(hl / de);
      state.h = result >> 8;
      state.l = result & 0xff;
      return state;
    },
    callLogger: (state) => {
      return `hl:${state.hl.toString(16)} / de:${state.de.toString(
        16
      )} -> hl: ${Math.floor(state.hl / state.de).toString(16)}`;
    },
  },
  [0x4]: {
    // hl = hl % de
    functionName: "Mod",
    handler: (state) => {
      const de = (state.d << 8) | state.e;
      const hl = (state.h << 8) | state.l;
      const result = hl % de;
      state.h = result >> 8;
      state.l = result & 0xff;
      return state;
    },
    callLogger: (state) => {
      return `hl:${state.hl.toString(16)} % de:${state.de.toString(
        16
      )} -> hl: ${Math.floor(state.hl % state.de).toString(16)}`;
    },
  },
  [0x05]: {
    functionName: "PlaySystemSound",
  },
  [0x07]: {
    functionName: "Rand",
  },
  [0x12]: {
    functionName: "RandMax",
  },
  [0x16]: {
    functionName: "PauseSound",
  },
  [0x19]: {
    functionName: "IsSoundPlaying",
  },
};

export { erapi0, erapi8 };
