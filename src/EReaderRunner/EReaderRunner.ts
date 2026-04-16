import * as path from "node:path";
import * as fs from "node:fs";
import assert from "node:assert";
import { BaseMemory, MAX_MEM_SIZE } from "./BaseMemory";
import { SYS_INPUT_JUST, SYS_INPUT_RAW } from "./inputs";
import {
  Erapi,
  erapi0Handlers,
  erapi8Handlers,
  ErapiCall,
} from "./z80js/erapi";
import { ScannedInBin } from "./z80js/types";
import { Z80 } from "./z80js/Z80";

const ORG = 0x100;

type EReaderRunnerRunResult = {
  getByte: (address: number) => number;
  getWord: (address: number) => number;
  getByteSpan: (address: number, count: number) => number[];
  getLog: () => string[];
  getPCCount: (address: number) => number;
};

type RunUntilPredicate = (result: EReaderRunnerRunResult) => boolean;

class EReaderRunner {
  private z80: any;
  private memory: BaseMemory;

  private _haltCount = 0;
  private justInputs: number[] = [];
  private heldInputs: number = 0;
  private justInputsIndex = 0;
  private readSysInputJustThisFrame = false;

  private _log: string[] = [];
  private pcCount: Record<number, number> = {};

  private erapiCalls: ErapiCall[] = [];

  get haltCount() {
    return this._haltCount;
  }

  writeLog(): string {
    const now = Date.now();
    const logPath = path.resolve(`ereaderRunnerLog_${now}.txt`);
    fs.writeFileSync(logPath, this._log.join("\n"));

    return logPath;
  }

  constructor(
    mainBin: number[],
    scannedInBins: ScannedInBin[],
    private symbols: Record<number, string>
  ) {
    this.memory = new BaseMemory(ORG, MAX_MEM_SIZE);

    for (let i = 0; i < mainBin.length; ++i) {
      this.memory.setValueAtIndex(i, mainBin[i]);
    }

    const core = {
      mem_read: (address: number) => {
        if (address === SYS_INPUT_JUST) {
          // return input on the low byte if it exists
          const input = (this.justInputs[this.justInputsIndex] ?? 0) & 0xff;
          if (input !== 0) {
            this.log(`SYS_INPUT_JUST: ${input}`);
            this.readSysInputJustThisFrame = true;
            return input;
          } else {
            return 0;
          }
        }

        if (address === SYS_INPUT_JUST + 1) {
          // return input on the high byte if it exists
          const input = (this.justInputs[this.justInputsIndex] ?? 0) >> 8;
          if (input !== 0) {
            this.log(`SYS_INPUT_JUST + 1: ${input}`);
            this.readSysInputJustThisFrame = true;
            return input;
          } else {
            return 0;
          }
        }
        if (address === SYS_INPUT_RAW) {
          const input =
            (this.heldInputs || this.justInputs[this.justInputsIndex]) & 0xff;
          if (input !== 0) {
            this.log(`SYS_INPUT_RAW: ${input}, heldInputs: ${this.heldInputs}`);
          }
          return input;
        }
        return this.memory.getValueAt(address);
      },

      mem_write: (address: number, value: number) => {
        this.memory.setValueAt(address, value);
      },

      io_read(_port: number) {
        throw new Error("io_read: not implemented");
      },

      io_write(_port: number, _value: number) {
        throw new Error("io_write: not implemented");
      },
    };

    const logger = this.log.bind(this);
    const erapi0 = new Erapi(
      erapi0Handlers,
      this.memory,
      scannedInBins,
      logger,
      (erapiCall) => {
        this.erapiCalls.push(erapiCall);
      }
    );
    const erapi8 = new Erapi(
      erapi8Handlers,
      this.memory,
      scannedInBins,
      logger,
      (erapiCall) => {
        this.erapiCalls.push(erapiCall);
      }
    );

    // @ts-expect-error
    this.z80 = new Z80(core, { erapi0, erapi8 });
    const state = this.z80.getState();
    state.pc = ORG;
    this.z80.setState(state);
  }

  log(msg: string) {
    this._log.push(msg);
  }

  getByte(address: number): number {
    assert(!isNaN(address), `getByte: recieved bad address: ${address}`);
    return this.memory.getValueAt(address);
  }

  getWord(address: number): number {
    assert(!isNaN(address), `getWord: recieved bad address: ${address}`);
    return this.memory.getWordValueAt(address);
  }

  getByteSpan(address: number, count: number): number[] {
    assert(!isNaN(address), `getByteSpan: recieved bad address: ${address}`);
    assert(count > 0, `getByteSpan, count less than 1 (${count})`);
    const span: number[] = [];

    for (let i = address; i < address + count; ++i) {
      span.push(this.getByte(i));
    }

    return span;
  }

  getLog(): string[] {
    return [...this._log];
  }

  getPCCount(address: number): number {
    return this.pcCount[address];
  }

  getErapiCalls(erapiFuncName: string): ErapiCall[] {
    return this.erapiCalls.filter((ec) => ec.name === erapiFuncName);
  }

  runUntil(
    description: string,
    inputs: number[] | { just: number[]; held: number },
    predicate: RunUntilPredicate,
    options?: { halts?: number; haltMinutesTimeout?: number }
  ): EReaderRunnerRunResult {
    const haltMinutesTimeout = options?.haltMinutesTimeout ?? 2;

    this.erapiCalls = [];
    this.pcCount = {};
    this._haltCount = 0;
    this.log(`runUntil: ${description}`);

    if (Array.isArray(inputs)) {
      this.justInputs = inputs;
      this.heldInputs = 0;
    } else {
      this.justInputs = inputs.just;
      this.heldInputs = inputs.held;
    }

    this.justInputsIndex = 0;
    this.readSysInputJustThisFrame = false;

    const state = this.z80.getState();
    state.halted = false;
    this.z80.setState(state);

    do {
      this.z80.run_instruction();

      const state = this.z80.getState();

      if (this.symbols[state.pc]) {
        this.log(`pc: ${this.symbols[state.pc]} (${state.pc})`);
        const hitCount = this.pcCount[state.pc] ?? 0;
        this.pcCount[state.pc] = hitCount + 1;
      }

      if (state.halted) {
        this._haltCount += 1;
        state.halted = false;
        this.z80.setState(state);
        if (this.readSysInputJustThisFrame) {
          this.justInputsIndex += 1;
          this.readSysInputJustThisFrame = false;
        }
      }

      if (this._haltCount > 60 * 60 * haltMinutesTimeout) {
        const logPath = this.writeLog();
        throw new Error(
          `EReaderRunner#runUntil: infinite loop (counter: ${this._haltCount}), log written to: ${logPath}, for: ${description}`
        );
      }
    } while (this.justInputsIndex < this.justInputs.length || !predicate(this));

    let halts = options?.halts ?? 0;

    while (halts > 0) {
      for (;;) {
        this.z80.run_instruction();

        const state = this.z80.getState();

        if (this.symbols[state.pc]) {
          this.log(`pc: ${this.symbols[state.pc]}`);
          const hitCount = this.pcCount[state.pc] ?? 0;
          this.pcCount[state.pc] = hitCount + 1;
        }

        if (state.halted) {
          this._haltCount += 1;
          halts -= 1;
          state.halted = false;
          this.z80.setState(state);
          break;
        }
      }
    }

    return this;
  }
}

export { EReaderRunner };
