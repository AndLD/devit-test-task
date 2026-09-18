import { defineConfig } from "cypress";

// Cypress bundles its own TS support (no ts-node needed, unlike Jest's
// config loader — see jest.config.js).
export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    supportFile: "cypress/support/e2e.ts",
    specPattern: "cypress/e2e/**/*.cy.ts",
    // `npm run test:e2e` runs against `next dev`, which compiles each route
    // on first visit — usually fast locally, but slow enough on a colder/
    // slower CI runner to exceed the 4s default and flake a `cy.location()`
    // assertion right after a first-time navigation.
    defaultCommandTimeout: 15000,
  },
});
