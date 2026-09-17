import { render, screen } from "@testing-library/react";
import { StatusBadge } from "@/components/admin/status-badge";

describe("StatusBadge", () => {
  it("renders 'Published' for a published product", () => {
    render(<StatusBadge status="PUBLISHED" />);
    expect(screen.getByText("Published")).toBeInTheDocument();
  });

  it("renders 'Draft' for a draft product", () => {
    render(<StatusBadge status="DRAFT" />);
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });
});
