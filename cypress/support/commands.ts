/// <reference types="cypress" />

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Logs in as the seeded test admin (prisma/seed.ts) via the UI. */
      loginAsAdmin(): Chainable<void>;
    }
  }
}

Cypress.Commands.add("loginAsAdmin", () => {
  // Idempotent: an already-authenticated visit to /admin/login redirects
  // straight to /admin/products (see src/proxy.ts), so a stale session from
  // an earlier step in the same test would otherwise make the #email lookup
  // below time out.
  cy.clearCookies();
  cy.visit("/admin/login");
  cy.get("#email").type("admin@example.com");
  cy.get("#password").type("admin12345");
  cy.contains("button", "Sign in").click();
  cy.location("pathname").should("eq", "/admin/products");
});

export {};
