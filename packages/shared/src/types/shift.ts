import type { ShiftStatus } from '../constants/payment-methods';

export interface Shift {
  localId: string;
  remoteId?: string;
  cashierId: string;
  terminalId: string;
  warehouseId: string;
  status: ShiftStatus;
  openAt: string;
  closeAt?: string;
  openingCash: string;
  closingCash?: string;
  totalSales: string;
  totalRefunds: string;
  totalCash: string;
  totalCard: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: string;
  version: number;
}

export interface ShiftSummary {
  shift: Shift;
  totalSales: string;
  totalRefunds: string;
  totalCash: string;
  totalCard: string;
  expectedCash: string;
  transactionCount: number;
}
