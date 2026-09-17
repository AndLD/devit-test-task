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

// Frontend component tests never import jose or the generated Prisma client
// (those are server-only), so the plain CJS + ts-jest transform works fine —
// no need for the ESM workaround the backend projects use.
const cjsTransform = {
  "^.+\\.tsx?$": ["ts-jest", {}],
};

/** @type {import('jest').Config} */
module.exports = {
  // Watchman is only useful for --watch mode, not a one-shot `npm test` run,
  // and a broken/mismatched local watchman install (a known issue on some
  // Homebrew setups) otherwise makes Jest hang or crash before running
  // anything. Jest's own file crawler works fine without it.
  watchman: false,
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
    {
      displayName: "frontend-unit",
      transform: cjsTransform,
      testEnvironment: "jsdom",
      moduleNameMapper,
      testMatch: ["<rootDir>/tests/frontend-unit/**/*.test.tsx"],
      setupFilesAfterEnv: ["<rootDir>/tests/frontend-support/setup.ts"],
    },
    {
      displayName: "frontend-integration",
      transform: cjsTransform,
      testEnvironment: "jsdom",
      moduleNameMapper,
      testMatch: ["<rootDir>/tests/frontend-integration/**/*.test.tsx"],
      setupFilesAfterEnv: ["<rootDir>/tests/frontend-support/setup.ts"],
    },
  ],
};
