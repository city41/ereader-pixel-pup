import { ERAPI_KEY_A } from "../../../src/EReaderRunner/inputs";
import { createRunner } from "./createRunner";
import {
  SCAN_RESULT_RAW_CARD,
  SCAN_RESULT_READ_ERROR,
  SCAN_RESULT_SUCCESS,
} from "./scanResults";

describe("scan", function () {
  it("should execute the puzzle pack function if it exists", async function () {
    const { runner, symbols } = await createRunner();

    const finalResult = runner.runUntil(
      "scan card and load first puzzle",
      [ERAPI_KEY_A, ERAPI_KEY_A],
      (result) => {
        return (
          result.getPCCount(
            symbols.symbolToAddress["calc_hint_numbers_calculate"]
          ) === 1
        );
      }
    );

    expect(finalResult.getPCCount(symbols.symbolToAddress["main_jp_hl"])).toBe(
      1
    );
  });

  it("should error if scanning in a main e-reader card", async function () {
    // "success" means a successful standalone card scan, ie not a puzzle pack card
    // so for pixel pup this is actually an error
    const { runner, symbols } = await createRunner(
      undefined,
      undefined,
      SCAN_RESULT_SUCCESS
    );

    const scanResult = runner.runUntil("scan card", [ERAPI_KEY_A], (result) => {
      return (
        result.getPCCount(symbols.symbolToAddress["scan_frame__error"]) === 1
      );
    });

    expect(
      scanResult.getPCCount(symbols.symbolToAddress["scan_frame__error"])
    ).toBe(1);
  });

  it("should let the user try again after scan errors, then succeed", async function () {
    const { runner, symbols } = await createRunner(
      undefined,
      undefined,
      SCAN_RESULT_READ_ERROR,
      [
        { scanResult: SCAN_RESULT_READ_ERROR },
        { scanResult: SCAN_RESULT_RAW_CARD },
      ]
    );

    runner.runUntil(
      "first scan gets an error",
      [ERAPI_KEY_A],
      (result) => {
        return (
          result.getPCCount(symbols.symbolToAddress["scan_frame__error"]) === 1
        );
      },
      {
        halts: 1,
      }
    );

    runner.runUntil(
      "second scan gets an error",
      [ERAPI_KEY_A],
      (result) => {
        return (
          result.getPCCount(symbols.symbolToAddress["scan_frame__error"]) === 1
        );
      },
      {
        halts: 1,
      }
    );

    runner.runUntil(
      "third scan succeeds then load first puzzle",
      [ERAPI_KEY_A, ERAPI_KEY_A],
      (result) => {
        return (
          result.getPCCount(
            symbols.symbolToAddress["calc_hint_numbers_calculate"]
          ) === 1
        );
      },
      {
        halts: 1,
      }
    );
  });

  it("should error if scanning in a non vpk0 e-reader card", async function () {
    const { runner, symbols } = await createRunner(
      "tests/integration/nonogram/cards/sma4.decoded.bin",
      undefined,
      SCAN_RESULT_RAW_CARD,
      [{ scanResult: SCAN_RESULT_RAW_CARD }]
    );

    runner.runUntil(
      "first scan of a non-vpk card",
      [ERAPI_KEY_A],
      (result) => {
        return (
          result.getPCCount(symbols.symbolToAddress["scan_frame__error"]) === 1
        );
      },
      {
        halts: 1,
      }
    );

    runner.runUntil(
      "second scan succeeds then load first puzzle",
      [ERAPI_KEY_A, ERAPI_KEY_A],
      (result) => {
        return (
          result.getPCCount(
            symbols.symbolToAddress["calc_hint_numbers_calculate"]
          ) === 1
        );
      },
      {
        halts: 1,
      }
    );
  });

  it("should error if scanned in card is a non-standalone vpk, but it is not a puzzle pack card", async function () {
    const { runner, symbols } = await createRunner(
      "tests/integration/nonogram/cards/scavengerRawCard.decoded.bin",
      undefined,
      SCAN_RESULT_RAW_CARD,
      [{ scanResult: SCAN_RESULT_RAW_CARD }]
    );

    runner.runUntil(
      "first scan of a non-puzzle pack card",
      [ERAPI_KEY_A],
      (result) => {
        return (
          result.getPCCount(symbols.symbolToAddress["scan_frame__error"]) === 1
        );
      },
      {
        halts: 1,
      }
    );

    runner.runUntil(
      "second scan succeeds then load first puzzle",
      [ERAPI_KEY_A, ERAPI_KEY_A],
      (result) => {
        return (
          result.getPCCount(
            symbols.symbolToAddress["calc_hint_numbers_calculate"]
          ) === 1
        );
      },
      {
        halts: 1,
      }
    );
  });
});
