// Covers the cross-cutting rule from PROJECT-REQUIREMENTS.md: a product's
// status, set from the admin editor, is what determines its visibility in
// the public catalog. Self-healing: forces the fixture back to DRAFT first,
// so a previous failed run doesn't leave "Mechanical Keyboard K2" stuck
// published for every other test in the suite.
describe("Publishing a product from the admin makes it visible publicly", () => {
  function setStatus(target: "Draft" | "Published") {
    cy.loginAsAdmin();
    cy.contains("a", "Mechanical Keyboard K2").click();
    cy.contains("button", target).click();
    cy.contains("button", "Save changes").click();
    cy.contains("Saved.").should("be.visible");
  }

  it("toggles publish/draft and reflects it in the public catalog, then restores draft", () => {
    // Safety net in case a previous run left this fixture published.
    setStatus("Draft");
    cy.visit("/");
    cy.contains("a", "Mechanical Keyboard K2").should("not.exist");

    setStatus("Published");
    cy.visit("/");
    cy.contains("a", "Mechanical Keyboard K2").should("be.visible");
    cy.contains("a", "Mechanical Keyboard K2").click();
    cy.contains("h1", "Mechanical Keyboard K2").should("be.visible");

    setStatus("Draft");
    cy.visit("/");
    cy.contains("a", "Mechanical Keyboard K2").should("not.exist");
    cy.request({ url: "/products/mechanical-keyboard", failOnStatusCode: false }).then(
      (response) => {
        expect(response.status).to.eq(404);
      },
    );
  });
});
