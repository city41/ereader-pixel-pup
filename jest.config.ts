import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "./tests",
  roots: ["<rootDir>/integration", "<rootDir>/full", "<rootDir>/ejVsUs"],
  setupFilesAfterEnv: ["jest-expect-message"],
};

export default config;
