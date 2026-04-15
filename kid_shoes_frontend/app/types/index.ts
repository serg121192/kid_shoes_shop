export interface Vendor {
  id: number;
  name: string;
}

// Returned by list endpoint (ProductListSerializer)
export interface ProductList {
  id: number;
  vendor: string; // SlugField returns vendor name as string
  model_name: string;
  exists: string; // quantity_message
  prod_type: "Shoe" | "Sandals" | "Sneakers" | "Ugi";
  gender: "boy" | "girl" | "unisex";
  size: number;
  image: string | null;
  discount: number;
  discounted_price: string;
}

// Returned by detail endpoint (ProductRetrieveSerializer)
export interface Product extends ProductList {
  gender: "boy" | "girl" | "unisex";
  quantity: number;
  season: "Winter" | "Summer" | "Demiseason" | "Fleece Demiseason";
  description: string | null;
  in_cart: boolean;
}

export interface CartItem {
  product: ProductList;
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

export interface OrderItem {
  product: ProductList;
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
}

// WishlistSerializer returns { id, products: ProductList[] }
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
