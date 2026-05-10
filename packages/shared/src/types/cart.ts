import type { ProductSnapshot } from './product';

export type DiscountType = 'pct' | 'fixed';

export interface Discount {
  type: DiscountType;
  value: string;
}

export interface CartItem {
  id: string;
  productLocalId: string;
  snapshot: ProductSnapshot;
  quantity: string;
  unitPrice: string;
  discount: Discount | null;
  tax: string;
  lineTotal: string;
}

export interface CartTotals {
  subtotal: string;
  invoiceDiscount: Discount | null;
  tax: string;
  total: string;
}
