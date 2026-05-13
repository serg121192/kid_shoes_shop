import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProductCard from "@/app/components/ProductCard";
import { ProductList } from "@/app/types";

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={props.alt ?? ""} />
  ),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/app/lib/api", () => ({
  getMediaUrl: (path: string | null) => (path ? `http://localhost:8000${path}` : null),
}));

const baseProduct: ProductList = {
  id: 1,
  vendor: "Nike",
  model_name: "Air Max",
  exists: "В наявності",
  prod_type: "Sneakers",
  gender: "unisex",
  full_price: "1200.00",
  discount: 0,
  discounted_price: "1200.00",
  sizes: [
    { id: 10, size: 25, quantity: 5 },
    { id: 11, size: 26, quantity: 0 },
  ],
  images: [],
};

describe("ProductCard", () => {
  it("renders vendor and model name", () => {
    render(<ProductCard product={baseProduct} />);
    expect(screen.getByText("Nike")).toBeInTheDocument();
    expect(screen.getByText("Air Max")).toBeInTheDocument();
  });

  it("renders discounted price", () => {
    render(<ProductCard product={baseProduct} />);
    expect(screen.getByText("1200.00 грн")).toBeInTheDocument();
  });

  it("shows original price when discount > 0", () => {
    const discountedProduct: ProductList = {
      ...baseProduct,
      full_price: "1200.00",
      discount: 20,
      discounted_price: "960.00",
    };
    render(<ProductCard product={discountedProduct} />);
    expect(screen.getByText("960.00 грн")).toBeInTheDocument();
    expect(screen.getByText("1200.00 грн")).toBeInTheDocument();
  });

  it("renders discount badge when discount > 0", () => {
    const discounted: ProductList = { ...baseProduct, discount: 20, discounted_price: "960.00" };
    render(<ProductCard product={discounted} />);
    expect(screen.getByText("-20%")).toBeInTheDocument();
  });

  it("does not render discount badge when no discount", () => {
    render(<ProductCard product={baseProduct} />);
    expect(screen.queryByText(/-\d+%/)).not.toBeInTheDocument();
  });

  it("shows fallback emoji when no image", () => {
    render(<ProductCard product={baseProduct} />);
    expect(screen.getByText("👟")).toBeInTheDocument();
  });

  it("renders main image when images present", () => {
    const withImage: ProductList = {
      ...baseProduct,
      images: [{ id: 1, image: "/media/products/shoe.jpg", is_main: true, order: 0 }],
    };
    render(<ProductCard product={withImage} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", expect.stringContaining("shoe.jpg"));
  });

  it("renders available sizes", () => {
    render(<ProductCard product={baseProduct} />);
    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("26")).toBeInTheDocument();
  });

  it("disables out-of-stock size buttons", () => {
    render(<ProductCard product={baseProduct} />);
    const sizeButtons = screen.getAllByRole("button").filter((b) =>
      ["25", "26"].includes(b.textContent ?? "")
    );
    const outOfStock = sizeButtons.find((b) => b.textContent === "26");
    expect(outOfStock).toBeDisabled();
  });

  it("calls onAddToCart with selected size id", () => {
    const onAddToCart = vi.fn();
    render(<ProductCard product={baseProduct} onAddToCart={onAddToCart} />);

    fireEvent.click(screen.getByText("25"));
    fireEvent.click(screen.getByText("Додати в кошик"));

    expect(onAddToCart).toHaveBeenCalledWith(10);
  });

  it("does not call onAddToCart when no size selected", () => {
    const onAddToCart = vi.fn();
    render(<ProductCard product={baseProduct} onAddToCart={onAddToCart} />);
    fireEvent.click(screen.getByText("Обери розмір"));
    expect(onAddToCart).not.toHaveBeenCalled();
  });

  it("calls onToggleWishlist with product id", () => {
    const onToggleWishlist = vi.fn();
    render(<ProductCard product={baseProduct} onToggleWishlist={onToggleWishlist} />);
    fireEvent.click(screen.getByTitle("Додати до вибраного"));
    expect(onToggleWishlist).toHaveBeenCalledWith(1);
  });

  it("shows correct wishlist button state when in wishlist", () => {
    render(<ProductCard product={baseProduct} onToggleWishlist={vi.fn()} isInWishlist />);
    expect(screen.getByTitle("Видалити з вибраного")).toBeInTheDocument();
  });

  it("renders exists status message", () => {
    render(<ProductCard product={baseProduct} />);
    expect(screen.getByText("В наявності")).toBeInTheDocument();
  });

  it("shows sold-out message styling", () => {
    const soldOut: ProductList = { ...baseProduct, exists: "Товар закінчився" };
    render(<ProductCard product={soldOut} />);
    expect(screen.getByText("Товар закінчився")).toBeInTheDocument();
  });
});
