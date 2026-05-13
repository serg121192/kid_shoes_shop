import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ToastContainer from "@/app/components/Toast";
import { Toast } from "@/app/context/ShopContext";

vi.mock("lucide-react", () => ({
  CheckCircle: () => <span data-testid="check-icon" />,
  XCircle: () => <span data-testid="x-icon" />,
}));

let mockToasts: Toast[] = [];

vi.mock("@/app/context/ShopContext", () => ({
  useShop: () => ({ toasts: mockToasts }),
}));

describe("ToastContainer", () => {
  beforeEach(() => {
    mockToasts = [];
  });

  it("renders nothing when toasts list is empty", () => {
    mockToasts = [];
    const { container } = render(<ToastContainer />);
    expect(container.firstChild).toBeNull();
  });

  it("renders success toast message", () => {
    mockToasts = [{ id: 1, message: "Товар додано до кошика", type: "success" }];
    render(<ToastContainer />);
    expect(screen.getByText("Товар додано до кошика")).toBeInTheDocument();
    expect(screen.getByTestId("check-icon")).toBeInTheDocument();
  });

  it("renders error toast message", () => {
    mockToasts = [{ id: 2, message: "Помилка завантаження", type: "error" }];
    render(<ToastContainer />);
    expect(screen.getByText("Помилка завантаження")).toBeInTheDocument();
    expect(screen.getByTestId("x-icon")).toBeInTheDocument();
  });

  it("renders multiple toasts", () => {
    mockToasts = [
      { id: 1, message: "Успіх", type: "success" },
      { id: 2, message: "Помилка", type: "error" },
    ];
    render(<ToastContainer />);
    expect(screen.getByText("Успіх")).toBeInTheDocument();
    expect(screen.getByText("Помилка")).toBeInTheDocument();
  });
});
