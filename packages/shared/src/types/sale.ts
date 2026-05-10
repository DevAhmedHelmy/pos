import type { CartItem, Discount } from './cart';
import type { SaleStatus } from '../constants/payment-methods';

export interface Sale {
  localId: string;
  remoteId?: string;
  shiftId: string;
  cashierId: string;
  warehouseId: string;
  status: SaleStatus;
  subtotal: string;
  invoiceDiscount: string;
  tax: string;
  total: string;
  paidCash: string;
  paidCard: string;
  changeDue: string;
  holdRef?: string;
  receiptNumber?: string;
  createdAt: string;
  completedAt?: string;
  cancelledAt?: string;
  updatedAt: string;
  syncStatus: string;
  version: number;
}

export interface SaleItem {
  localId: string;
  saleId: string;
  productLocalId: string;
  snapshot: CartItem['snapshot'];
  quantity: string;
  unitPrice: string;
  discount: Discount | null;
  tax: string;
  lineTotal: string;
  createdAt: string;
}

export interface Payment {
  localId: string;
  saleId: string;
  method: string;
  amount: string;
  reference?: string;
  createdAt: string;
}

export interface Refund {
  localId: string;
  remoteId?: string;
  originalSaleId: string;
  cashierId: string;
  supervisorId: string;
  items: RefundItem[];
  total: string;
  receiptNumber: string;
  createdAt: string;
  syncStatus: string;
  version: number;
}

export interface RefundItem {
  saleItemId: string;
  quantity: string;
  amount: string;
  reason: string;
}
