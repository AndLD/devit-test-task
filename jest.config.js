// Plain JS, not TS: Jest's own config loader needs `ts-node` to parse a
// `.ts` config file, which isn't otherwise a dependency of this project —
// keeping this file JS avoids adding it just for that.
//
// The Next.js/Prisma stack this project runs on is ESM-first: Prisma 7's
// generated client uses `import.meta.url` to locate its wasm query
// compiler, and `jose` (used for JWT signing) ships ESM-only. Both are
// unusable under Jest's default CommonJS transform, so tests run under
// Jest's native ESM support instead of the more common CJS + ts-jest setup
// (see the NODE_OPTIONS=--experimental-vm-modules in the npm scripts).
const moduleNameMapper = {
  "^@/(.*)$": "<rootDir>/src/$1",
};

const esmTransform = {
  "^.+\\.tsx?$": ["ts-jest", { useESM: true }],
};

/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: "unit",
      preset: "ts-jest/presets/default-esm",
      extensionsToTreatAsEsm: [".ts"],
      transform: esmTransform,
      testEnvironment: "node",
      moduleNameMapper,
      testMatch: ["<rootDir>/tests/unit/**/*.test.ts"],
    },
    {
      displayName: "integration",
      preset: "ts-jest/presets/default-esm",
      extensionsToTreatAsEsm: [".ts"],
      transform: esmTransform,
      testEnvironment: "node",
      moduleNameMapper,
      testMatch: ["<rootDir>/tests/integration/**/*.test.ts"],
      globalSetup: "<rootDir>/tests/integration/support/global-setup.ts",
      globalTeardown: "<rootDir>/tests/integration/support/global-teardown.ts",
      setupFiles: ["<rootDir>/tests/integration/support/setup-env.ts"],
      testTimeout: 30000,
    },
  ],
};
