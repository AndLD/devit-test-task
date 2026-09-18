describe("Admin — auth", () => {
  it("shows an error for a wrong password and does not log in", () => {
    cy.visit("/admin/login");
    cy.get("#email").type("admin@example.com");
    cy.get("#password").type("wrong-password");
    cy.contains("button", "Sign in").click();

    cy.contains("Invalid email or password").should("be.visible");
    cy.location("pathname").should("eq", "/admin/login");
  });

  it("logs in with the seeded credentials and reaches the product list", () => {
    cy.loginAsAdmin();
    cy.contains("h1", "Products").should("be.visible");
  });

  it("redirects an already-authenticated visit to /admin/login back to the product list", () => {
    cy.loginAsAdmin();

    cy.visit("/admin/login");

    cy.location("pathname").should("eq", "/admin/products");
  });

  it("redirects an unauthenticated visit to an admin page to /admin/login", () => {
    cy.visit("/admin/products");

    cy.location("pathname").should("eq", "/admin/login");
  });

  it("logs out and can no longer reach the product list", () => {
    cy.loginAsAdmin();
    cy.contains("button", "Log out").click();

    cy.location("pathname").should("eq", "/admin/login");

    cy.visit("/admin/products");
    cy.location("pathname").should("eq", "/admin/login");
  });
});

describe("Admin — product list", () => {
  beforeEach(() => {
    cy.loginAsAdmin();
  });

  it("shows both draft and published products", () => {
    cy.contains("a", "Wireless Mouse M1")
      .should("be.visible")
      .and("contain.text", "Published");
    cy.contains("a", "Mechanical Keyboard K2")
      .should("be.visible")
      .and("contain.text", "Draft");
  });

  it("opens a product's editor from the list", () => {
    cy.contains("a", "USB-C Hub 7-in-1").click();

    cy.location("pathname").should("match", /\/admin\/products\/.+/);
    cy.contains("h1", "USB-C Hub 7-in-1").should("be.visible");
  });
});

describe("Admin — product editor", () => {
  beforeEach(() => {
    cy.loginAsAdmin();
    cy.contains("a", "USB-C Hub 7-in-1").click();
  });

  it("disables Save when a required field is cleared", () => {
    cy.get("#seoTitle").clear();
    cy.contains("button", "Save changes").should("be.disabled");
  });

  it("disables Save when a field exceeds its character limit", () => {
    cy.get("#description").clear().type("x".repeat(1001), { delay: 0 });
    cy.contains("button", "Save changes").should("be.disabled");
  });

  it("saves a change and persists it across reload, leaving the product as found", () => {
    const original = "A 7-in-1 USB-C hub that adds HDMI, USB-A, and card reader ports to a single USB-C port.";
    const updated = "A 7-in-1 USB-C hub — updated by the Cypress e2e suite.";

    cy.get("#description").should("have.value", original);
    cy.get("#description").clear().type(updated, { delay: 0 });
    cy.contains("button", "Save changes").click();
    cy.contains("Saved.").should("be.visible");

    cy.reload();
    cy.get("#description").should("have.value", updated);

    // Restore the original value so the seeded fixture stays stable for
    // every other test and every future run of this suite.
    cy.get("#description").clear().type(original, { delay: 0 });
    cy.contains("button", "Save changes").click();
    cy.contains("Saved.").should("be.visible");
    cy.reload();
    cy.get("#description").should("have.value", original);
  });

  it("generates an AI suggestion and applies it to the editor without saving", () => {
    const original = "A 7-in-1 USB-C hub that adds HDMI, USB-A, and card reader ports to a single USB-C port.";

    cy.get("#description").should("have.value", original);
    cy.contains("button", "Suggest with AI").click();

    // The e2e run has no OPENAI_API_KEY configured (see .env.example), so
    // this always exercises the mock provider — clearly marked as such.
    cy.contains("Preview").should("be.visible");
    cy.contains("Simulated (no API key set)").should("be.visible");

    cy.contains("button", "Apply to editor").click();
    cy.contains("Preview").should("not.exist");
    cy.get("#description").invoke("val").should("not.eq", original).and("not.be.empty");
    cy.get("#seoTitle").invoke("val").should("contain", "USB-C Hub 7-in-1");

    // Applying only changes the editor's local state — nothing is saved
    // until the user clicks Save, so a reload must revert to what's
    // actually persisted.
    cy.reload();
    cy.get("#description").should("have.value", original);
  });
});
