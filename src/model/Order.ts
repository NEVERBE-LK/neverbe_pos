import { Timestamp } from "firebase/firestore";

export interface OrderItem {
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

export interface Customer {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
}

export interface Payment {
  id: string;
  amount: number;
  paymentMethodId: string;
  paymentMethod: string;
  referenceId?: string;
}

export interface Order {
  userId: string | null;
  orderId: string;
  paymentId: string;
  items: OrderItem[];
  paymentStatus: string;
  paymentMethod: string;
  paymentMethodId: string;
  total: number;
  status: string;
  shippingFee: number;
  transactionFeeCharge: number;
  fee: number;
  customer?: Customer;
  discount: number;
  from: string;
  stockId?: string;
  paymentReceived?: Payment[];

  // Promotion & Coupon tracking
  couponCode?: string;
  appliedCouponId?: string | null;
  appliedPromotionId?: string | null;
  appliedPromotionIds?: string[];
  couponDiscount?: number;
  promotionDiscount?: number;

  // Order Tracking
  trackingNumber?: string;
  estimatedDelivery?: Timestamp | string;
  statusHistory?: { status: string; date: Timestamp | string }[];

  restockedAt?: Timestamp | string;
  restocked?: boolean;
  cleanupProcessed?: boolean;

  // Anti-Spam & Risk Protection
  riskStatus?: "NORMAL" | "HIGH_RISK";
  ipqsFraudScore?: number;
  ipqsRiskLevel?: string;
  ipqsLineType?: string;
  ipqsReasons?: string[];
  deliveryFeePrepaid?: boolean;
  deliveryFeeTxnId?: string;

  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
}
