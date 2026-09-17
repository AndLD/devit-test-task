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
    description: "Original description.",
    seoTitle: "Original SEO title",
    seoDescription: "Original SEO description.",
    status: "DRAFT",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

const SUGGESTION = {
  description: "Suggested description.",
  seoTitle: "Suggested SEO title",
  seoDescription: "Suggested SEO description.",
};

beforeEach(() => {
  authenticatedRequest.mockReset();
  push.mockReset();
  refresh.mockReset();
});

describe("ProductEditorForm suggestion flow", () => {
  it("shows a preview marked as simulated, and never calls the save endpoint on its own", async () => {
    authenticatedRequest.mockResolvedValue({
      status: 200,
      data: { suggestion: SUGGESTION, mocked: true },
    });
    const user = userEvent.setup();
    render(<ProductEditorForm product={makeProduct()} />);

    await user.click(screen.getByRole("button", { name: /suggest with ai/i }));

    expect(await screen.findByText("Suggested description.")).toBeInTheDocument();
    expect(screen.getByText("Simulated (no API key set)")).toBeInTheDocument();
    expect(authenticatedRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/api/admin/products/product-1/suggest",
        method: "POST",
      }),
    );
    // Applying/saving are separate, explicit steps — generating a preview
    // must never itself touch the editor fields or trigger a save.
    expect(screen.getByLabelText("Description")).toHaveValue("Original description.");
  });

  it("applies the suggestion to the editor fields without saving", async () => {
    authenticatedRequest.mockResolvedValue({
      status: 200,
      data: { suggestion: SUGGESTION, mocked: true },
    });
    const user = userEvent.setup();
    render(<ProductEditorForm product={makeProduct()} />);

    await user.click(screen.getByRole("button", { name: /suggest with ai/i }));
    await screen.findByText("Suggested description.");
    await user.click(screen.getByRole("button", { name: /apply to editor/i }));

    expect(screen.getByLabelText("Description")).toHaveValue("Suggested description.");
    expect(screen.getByLabelText("SEO title")).toHaveValue("Suggested SEO title");
    expect(screen.getByLabelText("SEO description")).toHaveValue(
      "Suggested SEO description.",
    );
    // Only the suggest call (a GET-like, read-only POST) should have hit
    // the network — applying is local-only, and the preview panel (which
    // rendered the same text as static content) is gone.
    expect(authenticatedRequest).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Preview")).not.toBeInTheDocument();
  });

  it("discards the suggestion without touching the editor fields", async () => {
    authenticatedRequest.mockResolvedValue({
      status: 200,
      data: { suggestion: SUGGESTION, mocked: true },
    });
    const user = userEvent.setup();
    render(<ProductEditorForm product={makeProduct()} />);

    await user.click(screen.getByRole("button", { name: /suggest with ai/i }));
    await screen.findByText("Suggested description.");
    await user.click(screen.getByRole("button", { name: /discard/i }));

    expect(screen.queryByText("Suggested description.")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toHaveValue("Original description.");
  });

  it("shows an error and leaves the editor untouched when generation fails", async () => {
    authenticatedRequest.mockResolvedValue({
      status: 502,
      data: { error: "OpenAI API request failed with status 500." },
    });
    const user = userEvent.setup();
    render(<ProductEditorForm product={makeProduct()} />);

    await user.click(screen.getByRole("button", { name: /suggest with ai/i }));

    expect(
      await screen.findByText("OpenAI API request failed with status 500."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toHaveValue("Original description.");
  });

  it("shows a network-error message when the request throws", async () => {
    authenticatedRequest.mockRejectedValue(new Error("network down"));
    const user = userEvent.setup();
    render(<ProductEditorForm product={makeProduct()} />);

    await user.click(screen.getByRole("button", { name: /suggest with ai/i }));

    expect(
      await screen.findByText("Network error — please try again."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toHaveValue("Original description.");
  });

  it("redirects to login when the session is genuinely expired", async () => {
    authenticatedRequest.mockResolvedValue({ status: 401 });
    const user = userEvent.setup();
    render(<ProductEditorForm product={makeProduct()} />);

    await user.click(screen.getByRole("button", { name: /suggest with ai/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/login"));
  });
});
