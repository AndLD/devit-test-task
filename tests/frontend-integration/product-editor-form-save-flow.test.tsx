import { render, screen, waitFor } from "@testing-library/react";
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
    characteristics: [],
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

describe("ProductEditorForm save flow", () => {
  it("shows 'Saved.' and refreshes on a successful save", async () => {
    authenticatedRequest.mockResolvedValue({
      status: 200,
      data: { product: makeProduct() },
    });
    const user = userEvent.setup();
    render(<ProductEditorForm product={makeProduct()} />);

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText("Saved.")).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
    expect(authenticatedRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/api/admin/products/product-1",
        method: "PATCH",
      }),
    );
  });

  it("shows the server's validation issues and keeps the entered values on a rejected save", async () => {
    authenticatedRequest.mockResolvedValue({
      status: 400,
      data: { issues: ["Description is required"] },
    });
    const user = userEvent.setup();
    render(<ProductEditorForm product={makeProduct()} />);

    await user.clear(screen.getByLabelText("SEO title"));
    await user.type(screen.getByLabelText("SEO title"), "A different but still valid title");
    // Force the button enabled path through a save even though this specific
    // scenario is meant to model a server-side rejection (e.g. a race with
    // another edit), not a client-side invalid value.
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText("Description is required")).toBeInTheDocument();
    // The typed value must still be there — a failed save must never lose
    // the user's edits.
    expect(screen.getByLabelText("SEO title")).toHaveValue(
      "A different but still valid title",
    );
  });

  it("redirects to login when the session is genuinely expired", async () => {
    authenticatedRequest.mockResolvedValue({ status: 401 });
    const user = userEvent.setup();
    render(<ProductEditorForm product={makeProduct()} />);

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/login"));
  });

  it("shows a network-error message when the request throws, keeping the edits", async () => {
    authenticatedRequest.mockRejectedValue(new Error("network down"));
    const user = userEvent.setup();
    render(<ProductEditorForm product={makeProduct()} />);

    await user.type(screen.getByLabelText("Description"), " extra");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(
      await screen.findByText("Network error — please try again."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toHaveValue(
      "A description within limits. extra",
    );
  });
});
