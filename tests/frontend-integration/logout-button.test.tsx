import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LogoutButton } from "@/components/admin/logout-button";

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

describe("LogoutButton", () => {
  it("calls the logout endpoint and navigates to login", async () => {
    post.mockResolvedValue({ status: 200 });
    const user = userEvent.setup();
    render(<LogoutButton />);

    await user.click(screen.getByRole("button", { name: /log out/i }));

    expect(post).toHaveBeenCalledWith("/api/admin/auth/logout");
    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/login"));
    expect(refresh).toHaveBeenCalled();
  });

  it("still navigates to login even if the logout request fails", async () => {
    post.mockRejectedValue(new Error("network down"));
    const user = userEvent.setup();
    render(<LogoutButton />);

    await user.click(screen.getByRole("button", { name: /log out/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/login"));
    expect(refresh).toHaveBeenCalled();
  });
});
