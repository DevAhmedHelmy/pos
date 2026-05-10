export const PaymentMethod = {
  CASH: 'cash',
  CARD: 'card',
  SPLIT_CASH: 'split-cash',
  SPLIT_CARD: 'split-card',
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const SaleStatus = {
  DRAFT: 'draft',
  HELD: 'held',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const;

export type SaleStatus = (typeof SaleStatus)[keyof typeof SaleStatus];

export const ShiftStatus = {
  OPEN: 'open',
  CLOSED: 'closed',
} as const;

export type ShiftStatus = (typeof ShiftStatus)[keyof typeof ShiftStatus];
