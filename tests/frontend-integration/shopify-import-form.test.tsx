import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShopifyImportForm } from "@/components/admin/shopify-import-form";

const push = jest.fn();
const refresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

const authenticatedRequest = jest.fn();
jest.mock("@/lib/authenticated-request", () => ({
  authenticatedRequest: (...args: unknown[]) => authenticatedRequest(...args),
}));

beforeEach(() => {
  authenticatedRequest.mockReset();
  push.mockReset();
  refresh.mockReset();
});

describe("ShopifyImportForm", () => {
  it("imports a product and navigates to its editor", async () => {
    authenticatedRequest.mockResolvedValue({
      status: 201,
      data: { product: { id: "new-product-id" } },
    });
    const user = userEvent.setup();
    render(<ShopifyImportForm />);

    await user.type(
      screen.getByPlaceholderText(/8325302452342/),
      "8325302452342",
    );
    await user.click(screen.getByRole("button", { name: /import/i }));

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/admin/products/new-product-id"),
    );
    expect(authenticatedRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/api/admin/products/import",
        method: "POST",
        data: { productId: "8325302452342" },
      }),
    );
  });

  it("shows an error and doesn't navigate when the import fails", async () => {
    authenticatedRequest.mockResolvedValue({
      status: 404,
      data: { error: "Shopify product not found" },
    });
    const user = userEvent.setup();
    render(<ShopifyImportForm />);

    await user.type(screen.getByPlaceholderText(/8325302452342/), "999");
    await user.click(screen.getByRole("button", { name: /import/i }));

    expect(await screen.findByText("Shopify product not found")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("shows a network-error message when the request throws", async () => {
    authenticatedRequest.mockRejectedValue(new Error("network down"));
    const user = userEvent.setup();
    render(<ShopifyImportForm />);

    await user.type(screen.getByPlaceholderText(/8325302452342/), "123");
    await user.click(screen.getByRole("button", { name: /import/i }));

    expect(
      await screen.findByText("Network error — please try again."),
    ).toBeInTheDocument();
  });

  it("redirects to login when the session is genuinely expired", async () => {
    authenticatedRequest.mockResolvedValue({ status: 401 });
    const user = userEvent.setup();
    render(<ShopifyImportForm />);

    await user.type(screen.getByPlaceholderText(/8325302452342/), "123");
    await user.click(screen.getByRole("button", { name: /import/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/login"));
  });
});
