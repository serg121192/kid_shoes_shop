export interface ProductImage {
  id: number;
  image: string;
  is_main: boolean;
  order: number;
}

export interface ProductVideo {
  id: number;
  video: string;
  title: string;
  order: number;
}

export interface Vendor {
  id: number;
  name: string;
}

export interface ProductSize {
  id: number;
  size: number;
  quantity: number;
}

export interface ProductSizeWithCart extends ProductSize {
  in_cart: boolean;
}

// Returned by list endpoint (ProductListSerializer)
export interface ProductList {
  id: number;
  vendor: string;
  model_name: string;
  exists: string; // quantity_message (aggregate across all sizes)
  prod_type: "Shoe" | "Sandals" | "Sneakers" | "Ugi";
  gender: "boy" | "girl" | "unisex";
  full_price: string;
  discount: number;
  discounted_price: string;
  sizes: ProductSize[];
  images: ProductImage[];
}

// Returned by detail endpoint (ProductRetrieveSerializer)
export interface Product extends Omit<ProductList, "sizes"> {
  sizes: ProductSizeWithCart[];
  full_price: string;
  season: "Winter" | "Summer" | "Demiseason" | "Fleece Demiseason";
  description: string | null;
  in_wishlist: boolean;
  images: ProductImage[];
  videos: ProductVideo[];
  avg_rating: number | null;
  review_count: number;
}

export interface CartProduct {
  id: number;
  vendor: string;
  model_name: string;
  discounted_price: string;
  main_image: string | null;
}

export interface CartItemProductSize {
  id: number;
  size: number;
  quantity: number;
  product: CartProduct;
}

export interface CartItem {
  product_size: CartItemProductSize;
  quantity: number;
}

export interface Cart {
  id: number;
  user: number;
  cart_items: CartItem[];
  total_price: number;
}

export interface DeliveryInfo {
  recipient_full_name: string;
  recipient_phone: string;
  delivery_type: "np_warehouse" | "np_postamat" | "np_address";
  city_name: string;
  city_ref: string;
  warehouse_address: string;
  warehouse_ref: string;
  street: string;
  building_number: string;
  apartment: string;
  tracking_number: string;
}

export interface OrderItemProductSize {
  id: number;
  size: number;
  product: Pick<ProductList, "id" | "vendor" | "model_name" | "prod_type" | "discounted_price"> & {
    main_image: string | null;
  };
}

export interface OrderItem {
  product_size: OrderItemProductSize;
  quantity: number;
  price: string;
}

export interface Order {
  id: number;
  created_at: string;
  user: string; // email (SlugField)
  status: "pending" | "processing" | "completed" | "cancelled";
  total_price: string;
  items: OrderItem[];
  delivery: DeliveryInfo | null;
  payment_method: "card_online" | "cod" | "baby_package" | "school_package" | "bank_transfer";
  is_paid: boolean;
}

export interface Review {
  id: number;
  user_name: string;
  rating: number;
  text: string;
  created_at: string;
  is_own: boolean;
}

export interface Wishlist {
  id: number;
  products: ProductList[];
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  is_staff: boolean;
}

export interface TokenPair {
  access: string;
  refresh: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
