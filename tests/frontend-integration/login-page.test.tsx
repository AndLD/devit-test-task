import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminLoginPage from "@/app/admin/login/page";

const push = jest.fn();
const refresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

const post = jest.fn();
jest.mock("@/lib/api-client", () => ({
  apiClient: { post: (...args: unknown[]) => post(...args) },
}));

beforeEach(() => {
  post.mockReset();
  push.mockReset();
  refresh.mockReset();
});

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), email);
  await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: /sign in/i }));
}

describe("AdminLoginPage", () => {
  it("shows an error and stays on the page for wrong credentials", async () => {
    post.mockResolvedValue({
      status: 401,
      data: { error: "Invalid email or password" },
    });
    render(<AdminLoginPage />);

    await fillAndSubmit("admin@example.com", "wrong-password");

    expect(await screen.findByText("Invalid email or password")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("redirects to the product list on success", async () => {
    post.mockResolvedValue({ status: 200, data: { ok: true } });
    render(<AdminLoginPage />);

    await fillAndSubmit("admin@example.com", "correct-password");

    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/products"));
    expect(refresh).toHaveBeenCalled();
  });

  it("shows a network-error message when the request throws", async () => {
    post.mockRejectedValue(new Error("network down"));
    render(<AdminLoginPage />);

    await fillAndSubmit("admin@example.com", "correct-password");

    expect(
      await screen.findByText("Network error — please try again."),
    ).toBeInTheDocument();
  });
});
