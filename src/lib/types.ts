export type BookLanguage = 'Bangla' | 'English' | 'Arabic' | 'Urdu';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  created_at: string;
  book_count?: number;
}

export interface BookPackage {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  price: number;
  original_price: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Extended fields
  author: string | null;
  language: BookLanguage | null;
  category_id: string | null;
  features: string[];
  tags: string[];
  islamic_topic: string | null;
  page_count: number;
  preview_url: string | null;
  is_featured: boolean;
  is_bestseller: boolean;
  rating: number;
  review_count: number;
  sales_count: number;
  view_count: number;
  // Computed/relation fields
  book_count?: number;
  books?: Book[];
  category?: Category | null;
  gallery_images?: PackageGalleryImage[];
  previews?: PackagePreview[];
  savings?: number;
}

export interface PackageGalleryImage {
  id: string;
  package_id: string;
  image_url: string;
  display_order: number;
  created_at: string;
}

export interface PackagePreview {
  id: string;
  package_id: string;
  title: string;
  file_url: string;
  file_size: string;
  display_order: number;
  created_at: string;
}

export interface PackageItem {
  id: string;
  package_id: string;
  book_id: string;
  created_at: string;
  book?: Book;
}

export interface Book {
  id: string;
  title: string;
  slug: string;
  author: string;
  description: string;
  short_description: string;
  price: number;
  discount_price: number | null;
  category_id: string | null;
  language: BookLanguage;
  pages: number;
  publisher: string;
  publication_date: string | null;
  file_size: string;
  cover_url: string;
  preview_url: string | null;
  file_url: string;
  rating: number;
  review_count: number;
  sales_count: number;
  view_count: number;
  download_count: number;
  is_featured: boolean;
  is_bestseller: boolean;
  is_new_arrival: boolean;
  status: 'published' | 'draft' | 'coming_soon' | 'archived';
  created_at: string;
  category?: Category | null;
}

export interface Review {
  id: string;
  book_id: string;
  user_id: string;
  rating: number;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  user?: { full_name: string; avatar_url: string | null };
  book?: { title: string; cover_url: string };
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  min_order: number;
  max_uses: number;
  used_count: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  order_number: string;
  total: number;
  subtotal: number;
  discount: number;
  coupon_code: string | null;
  payment_method: 'bkash' | 'nagad' | 'rocket';
  payment_status: 'pending' | 'pending_verification' | 'approved' | 'rejected' | 'failed' | 'refunded';
  order_status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded';
  txn_id: string | null;
  sender_mobile: string;
  payment_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  created_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  book_id: string;
  book_title: string;
  book_cover: string;
  price: number;
  quantity: number;
  package_id?: string | null;
  is_package: boolean;
  book?: Book;
  package?: BookPackage;
}

export interface Download {
  id: string;
  user_id: string;
  book_id: string;
  order_id: string;
  ip_address: string | null;
  created_at: string;
  book?: Book;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  book_id: string;
  created_at: string;
  book?: Book;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_url: string;
  author: string;
  category: string;
  tags: string[];
  status: 'published' | 'draft';
  published_at: string;
  created_at: string;
}

export interface CartItem {
  book?: Book;
  package?: BookPackage;
  quantity: number;
  isPackage: boolean;
}

export interface PaymentMethod {
  id: 'bkash' | 'nagad' | 'rocket';
  name: string;
  color: string;
  logo: string;
  description?: string;
}

// Payment method settings from database
export interface PaymentMethodSettings {
  id: string;
  name: string;
  is_enabled: boolean;
  account_number: string;
  account_type: 'Personal' | 'Agent' | 'Merchant';
  color: string;
  logo: string;
  display_order: number;
}

// Default fallback payment number (used only if no settings exist)
export const DEFAULT_PAYMENT_NUMBER = '01985270188';

// Static fallback (used only if database fetch fails)
export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'bkash',
    name: 'bKash',
    color: '#e2136e',
    logo: 'bK',
    description: 'Mobile Financial Service',
  },
  {
    id: 'nagad',
    name: 'Nagad',
    color: '#f16822',
    logo: 'N',
    description: 'Mobile Financial Service',
  },
  {
    id: 'rocket',
    name: 'Rocket',
    color: '#8b2685',
    logo: 'R',
    description: 'Mobile Financial Service',
  },
];

export function formatBDT(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' ৳';
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function discountPercent(price: number, discountPrice: number | null): number {
  if (!discountPrice || discountPrice >= price) return 0;
  return Math.round(((price - discountPrice) / price) * 100);
}

export function effectivePrice(book: Book): number {
  const price = book.price ?? 0;
  const discountPrice = book.discount_price;
  return discountPrice && discountPrice < price ? discountPrice : price;
}

export function packageEffectivePrice(pkg: BookPackage): number {
  return pkg.price ?? 0;
}

export function packageOriginalPrice(pkg: BookPackage): number {
  if (pkg.original_price && pkg.original_price > pkg.price) {
    return pkg.original_price;
  }
  // Calculate from books if available
  if (pkg.books && pkg.books.length > 0) {
    return pkg.books.reduce((sum, book) => sum + effectivePrice(book), 0);
  }
  return pkg.price;
}

export function packageSavings(pkg: BookPackage): number {
  const original = packageOriginalPrice(pkg);
  return original - pkg.price;
}

export function packageSavingsPercent(pkg: BookPackage): number {
  const original = packageOriginalPrice(pkg);
  if (original <= 0) return 0;
  return Math.round(((original - pkg.price) / original) * 100);
}
