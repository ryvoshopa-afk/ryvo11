export type Language = 'ar' | 'en' | 'fr';
export type Theme = 'light' | 'dark';

export interface Product {
  id: string;
  name_ar: string;
  name_en: string;
  name_fr: string;

  description_ar: string;
  description_en: string;
  description_fr: string;

  features_ar: string; // Comma-separated or serialized
  features_en: string;
  features_fr: string;

  tag_ar: string;
  tag_en: string;
  tag_fr: string;

  image: string; // Primary image URL
  additional_images?: string[]; // Extra product images for gallery
  video_url?: string; // Optional product demonstration video
  price: number;
  stock: number;
  category: string;
  rating_sum: number;
  rating_count: number;
  is_featured?: boolean;
  cod_available?: boolean;
  is_digital?: boolean;
  digital_file_url?: string;
  digital_delivery_text?: string;
  color_images?: {
    black?: string;
    white?: string;
    red?: string;
  };
  supplier_id?: string;
  supplier_url?: string;
  supplier_sku?: string;
  supplier_purchase_price?: number;
  supplier_shipping_cost?: number;
  supplier_profit_margin?: number;
  supplier_product_id?: string;
  cost_price?: number;
  gateway_fee?: number;
  packaging_cost?: number;
  marketing_cost?: number;
  additional_expenses?: number;
  calculated_cost?: number;
  calculated_profit?: number;
  calculated_profit_percentage?: number;
  sync_status?: 'synced' | 'pending' | 'failed';
  weight?: number; // Weight in kg
  width?: number; // Width in cm
  height?: number; // Height in cm
  length?: number; // Length in cm
  shipping_class?: 'standard' | 'heavy_bike' | 'oversized_car' | 'digital';
  variants?: any[];
  colors?: { name: string; image: string }[];
  supplier_original_price?: number;
  supplier_name?: string;
  supplier_id_number?: string;
  warehouse_name?: string;
  country_shipped_from?: string;
  is_verified_inventory?: boolean;
  supports_custom_packaging?: boolean;
  can_be_merged?: boolean;
  processing_time?: string;
  estimated_shipping_time?: string;
  shipping_carrier?: string;
  warehouse_stock_status?: string;
  uses_ryvo_packaging?: boolean;
  ryvo_packaging_status?: 'available' | 'out_of_stock';
  ryvo_packaging_warehouse?: string;
}

export interface PriceAuditLog {
  id: string;
  productId: string;
  productName: string;
  oldPrice: number;
  newPrice: number;
  oldCost: number;
  newCost: number;
  editedBy: string; // user email
  timestamp: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  color?: string; // Selected color: أحمر | أبيض | أسود
}

export interface OrderItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  color?: string; // Selected color
  supplier_id?: string;
  supplier_order_id?: string;
  supplier_status?: string;
  supplier_tracking_number?: string;
  vendor_id?: string;
  cost_price?: number;
  shipping_fee?: number;
  item_status?: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shipping_carrier?: string;
}

export interface Order {
  id: string;
  user_email: string;
  customer_name: string;
  address: string;
  phone: string;
  payment_method: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  date: string;
  csrf_token_verified: boolean;
  status_history?: {
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    timestamp: string;
  }[];
  total_weight?: number; // Total weight in kg
  vendor_ids?: string[]; // Unique vendors in this order
  payout_status?: 'unpaid' | 'paid' | 'withheld';
  vendor_splits?: {
    vendor_id: string;
    subtotal: number;
    shipping_fee: number;
    commission_deducted: number;
    payout_amount: number;
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  }[];
  shipping_details?: {
    total_weight: number;
    package_volume: number; // sum(w * h * l)
    customs_required: boolean;
  };
}

export interface User {
  email: string;
  name: string;
  role: 'customer' | 'admin' | 'affiliate' | 'super_admin' | 'manager' | 'support' | 'warehouse' | 'marketing' | 'finance';
  favorites: string[]; // List of product IDs
  token?: string;
  password?: string; // Opt customer password storage
  allowedPanels?: {
    products: boolean;
    orders: boolean;
    customers: boolean;
    emails: boolean;
    storeCustomization: boolean;
  };
  points?: number;
  points_history?: {
    id: string;
    reason_ar: string;
    reason_en: string;
    points: number;
    date: string;
  }[];
  wallet_balance?: number;
  wallet_history?: {
    id: string;
    type: 'charge' | 'points_convert' | 'payment';
    amount: number;
    description_ar: string;
    description_en: string;
    date: string;
  }[];
  city?: string;
  district?: string;
  street?: string;
  postal_code?: string;
  phone?: string;
}

export interface Affiliate {
  id: string;
  name: string;
  email: string;
  code: string;
  discount_percent: number;
  commission_percent: number;
  usage_count: number;
  total_commission: number;
}

export interface HeroSlide {
  category: string;
  title_ar: string;
  title_en: string;
  title_fr: string;
  desc_ar: string;
  desc_en: string;
  desc_fr: string;
  bg: string;
  image: string;
}

export interface SimulatedEmail {
  id: string;
  to: string;
  subject: string;
  body: string;
  date: string;
  time: string;
  read: boolean;
}

export interface Review {
  id: string;
  product_id: string;
  product_name: string;
  name: string;
  rating: number;
  text: string;
  date: string;
  attached_photo?: string;
  is_best?: boolean; // best reviews pinned/highlighted
}

export interface WheelSegment {
  id: string;
  textAr: string;
  textEn: string;
  type: 'points' | 'coupon' | 'retry';
  value: number;
  couponCode: string;
  isAllowedWinner: boolean;
}

export interface WheelSettings {
  isEnabled: boolean;
  segments: WheelSegment[];
}

export interface Supplier {
  id: string;
  name: string;
  url: string;
  type: 'AliExpress' | 'CJ' | 'Local' | 'Other';
  apiKey?: string;
  email?: string;
  password?: string;
  connectionStatus: 'connected' | 'disconnected';
  totalSynced?: number;
}

