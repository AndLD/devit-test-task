describe("Public — catalog", () => {
  it("lists only published products", () => {
    cy.visit("/");

    cy.contains("a", "Wireless Mouse M1").should("be.visible");
    cy.contains("a", "USB-C Hub 7-in-1").should("be.visible");
    cy.contains("a", "Mechanical Keyboard K2").should("not.exist");
  });

  it("opens a product page with its content and SEO title", () => {
    cy.visit("/");
    cy.contains("a", "USB-C Hub 7-in-1").click();

    cy.location("pathname").should("eq", "/products/usb-c-hub");
    cy.contains("h1", "USB-C Hub 7-in-1").should("be.visible");
    cy.contains("Ports").should("be.visible");
    cy.title().should("eq", "USB-C Hub 7-in-1 — HDMI 4K, USB-A, SD card reader");
  });
});

describe("Public — draft visibility", () => {
  it("404s a draft product's page by direct URL", () => {
    cy.request({ url: "/products/mechanical-keyboard", failOnStatusCode: false }).then(
      (response) => {
        expect(response.status).to.eq(404);
      },
    );

    cy.visit("/products/mechanical-keyboard", { failOnStatusCode: false });
    cy.contains("Page not found").should("be.visible");
  });
});
