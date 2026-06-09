// ================================
// 🔹 POS-SPECIFIC TYPES
// ================================

import { Timestamp } from "firebase/firestore";

export interface POSCartItem {
  itemId: string;
  variantId: string;
  name: string;
  variantName: string;
  thumbnail: string;
  size: string;
  discount: number;
  type: string;
  quantity: number;
  price: number;
  bPrice: number;
  stockId: string;
  createdAt?: Timestamp | string;
}

export interface POSOrderItem {
  itemId: string;
  variantId: string;
  name: string;
  variantName: string;
  size: string;
  quantity: number;
  thumbnail: string;
  price: number;
  bPrice: number;
  discount: number;
}

export interface POSPayment {
  id: string;
  amount: number;
  paymentMethodId: string;
  cardNumber: string;
  paymentMethod: string;
  referenceId?: string; // Payment reference ID entered by cashier (for KOKO, etc.)
}

export interface POSPaymentMethod {
  paymentId: string;
  name: string;
  status: string;
  fee: number;
  customerFee?: number;
  available: string[];
  createdAt: string | Timestamp;
}

export interface POSOrder {
  orderId: string;
  paymentId?: string;
  items: POSOrderItem[];
  paymentStatus: string;
  paymentMethod: string;
  paymentMethodId?: string;
  discount: number;
  status: string;
  stockId: string | null;
  fee: number;
  total: number;
  transactionFeeCharge: number;
  shippingFee: number;
  paymentReceived?: POSPayment[];
  from: string;
  createdAt?: string | Timestamp;
}

export interface POSStock {
  id: string;
  name: string;
  label: string;
  isActive?: boolean;
}

export interface POSVariant {
  id: string;
  name?: string;
  variantName?: string;
  variantId?: string;
  color?: string;
  thumbnail?: string;
  images?: string[];
  sizes?: string[];
}

export interface POSProduct {
  id: string;
  name: string;
  sku?: string;
  brand?: string;
  category?: string;
  sellingPrice: number;
  buyingPrice: number;
  marketPrice?: number;
  discount?: number;
  thumbnail?: string;
  variants?: POSVariant[];
  status: boolean;
  isDeleted: boolean;
  totalStock?: number;
}

export interface POSSize {
  size: string;
  stock: number;
}
