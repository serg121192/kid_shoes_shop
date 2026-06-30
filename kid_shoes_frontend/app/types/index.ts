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
  prod_type: "Shoe" | "Boots" | "Sandals" | "Sneakers" | "DressShoes" | "Booties" | "Ugi";
  gender: "boy" | "girl" | "unisex";
  full_price: string;
  discount: number;
  discounted_price: string;
  sizes: ProductSize[];
  main_image?: string | null;
  images?: ProductImage[];
  slug: string;
  is_published?: boolean;
}

// Returned by detail endpoint (ProductRetrieveSerializer)
export interface Product extends Omit<ProductList, "sizes"> {
  sizes: ProductSizeWithCart[];
  full_price: string;
  seasons: ("Winter" | "Summer" | "Demiseason" | "Fleece Demiseason")[];
  description: string | null;
  seo_description: string | null;
  in_wishlist: boolean;
  images: ProductImage[];
  videos: ProductVideo[];
  avg_rating: number | null;
  review_count: number;
  seo_h1: string;
  seo_title: string;
  slug: string;
}

export interface CartProduct {
  id: number;
  vendor: string;
  model_name: string;
  slug: string;
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
  delivery_type: "np_warehouse" | "np_postamat" | "np_address" | "pickup";
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
  product: Pick<ProductList, "id" | "vendor" | "model_name" | "slug" | "prod_type" | "discounted_price"> & {
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
  user: string | null;
  created_by?: string | null;
  status: "pending" | "processing" | "completed" | "received" | "refused" | "cancelled";
  total_price: string;
  items: OrderItem[];
  delivery: DeliveryInfo | null;
  sale_channel?: "online" | "store";
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
  is_seller: boolean;
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
