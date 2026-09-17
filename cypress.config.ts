import { defineConfig } from "cypress";

// Cypress bundles its own TS support (no ts-node needed, unlike Jest's
// config loader — see jest.config.js).
export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    supportFile: "cypress/support/e2e.ts",
    specPattern: "cypress/e2e/**/*.cy.ts",
  },
});
