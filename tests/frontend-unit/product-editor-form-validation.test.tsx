import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductEditorForm } from "@/components/admin/product-editor-form";
import type { Product } from "@/lib/types/product";

const push = jest.fn();
const refresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

const authenticatedRequest = jest.fn();
jest.mock("@/lib/authenticated-request", () => ({
  authenticatedRequest: (...args: unknown[]) => authenticatedRequest(...args),
}));

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "product-1",
    slug: "product-1",
    name: "Product One",
    characteristics: [{ label: "Color", value: "Black" }],
    description: "A description within limits.",
    seoTitle: "A valid SEO title",
    seoDescription: "A valid SEO description.",
    status: "DRAFT",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  authenticatedRequest.mockReset();
  push.mockReset();
  refresh.mockReset();
});

describe("ProductEditorForm client-side validation", () => {
  it("enables Save for a product that already satisfies the limits", () => {
    render(<ProductEditorForm product={makeProduct()} />);
    expect(screen.getByRole("button", { name: /save changes/i })).toBeEnabled();
  });

  it("disables Save when the description is cleared", async () => {
    const user = userEvent.setup();
    render(<ProductEditorForm product={makeProduct()} />);

    await user.clear(screen.getByLabelText("Description"));

    expect(screen.getByRole("button", { name: /save changes/i })).toBeDisabled();
  });

  it("disables Save when the description exceeds 1000 characters", async () => {
    const user = userEvent.setup();
    render(<ProductEditorForm product={makeProduct()} />);

    await user.clear(screen.getByLabelText("Description"));
    await user.type(screen.getByLabelText("Description"), "x".repeat(1001));

    expect(screen.getByRole("button", { name: /save changes/i })).toBeDisabled();
  });

  it("disables Save when the SEO title exceeds 60 characters", async () => {
    const user = userEvent.setup();
    render(<ProductEditorForm product={makeProduct()} />);

    await user.clear(screen.getByLabelText("SEO title"));
    await user.type(screen.getByLabelText("SEO title"), "x".repeat(61));

    expect(screen.getByRole("button", { name: /save changes/i })).toBeDisabled();
  });

  it("disables Save when the SEO description exceeds 160 characters", async () => {
    const user = userEvent.setup();
    render(<ProductEditorForm product={makeProduct()} />);

    await user.clear(screen.getByLabelText("SEO description"));
    await user.type(screen.getByLabelText("SEO description"), "x".repeat(161));

    expect(screen.getByRole("button", { name: /save changes/i })).toBeDisabled();
  });

  it("re-enables Save once the offending field is fixed", async () => {
    const user = userEvent.setup();
    render(<ProductEditorForm product={makeProduct()} />);

    await user.clear(screen.getByLabelText("SEO title"));
    expect(screen.getByRole("button", { name: /save changes/i })).toBeDisabled();

    await user.type(screen.getByLabelText("SEO title"), "A fixed title");
    expect(screen.getByRole("button", { name: /save changes/i })).toBeEnabled();
  });

  it("never calls the API just from typing or toggling status", async () => {
    const user = userEvent.setup();
    render(<ProductEditorForm product={makeProduct()} />);

    await user.type(screen.getByLabelText("Description"), " more text");
    await user.click(screen.getByRole("button", { name: "Published" }));

    expect(authenticatedRequest).not.toHaveBeenCalled();
  });
});
