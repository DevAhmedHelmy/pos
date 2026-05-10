import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

export function add(a: Decimal | string, b: Decimal | string): Decimal {
  return new Decimal(a).plus(new Decimal(b));
}

export function subtract(a: Decimal | string, b: Decimal | string): Decimal {
  return new Decimal(a).minus(new Decimal(b));
}

export function multiply(a: Decimal | string, b: Decimal | string): Decimal {
  return new Decimal(a).times(new Decimal(b));
}

export function divide(a: Decimal | string, b: Decimal | string): Decimal {
  return new Decimal(a).dividedBy(new Decimal(b));
}

export function round(amount: Decimal | string, decimalPlaces = 3): Decimal {
  return new Decimal(amount).toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_UP);
}

export function formatDisplay(amount: Decimal | string, locale: 'ar' | 'en' = 'ar'): string {
  const num = new Decimal(amount).toNumber();
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  }).format(num);
}

export function isZero(amount: Decimal | string): boolean {
  return new Decimal(amount).isZero();
}

export function isPositive(amount: Decimal | string): boolean {
  return new Decimal(amount).isPositive() && !new Decimal(amount).isZero();
}

export function isNegative(amount: Decimal | string): boolean {
  return new Decimal(amount).isNegative();
}

export function calculateChange(tendered: Decimal | string, total: Decimal | string): Decimal {
  const change = subtract(tendered, total);
  if (isNegative(change)) {
    return new Decimal(0);
  }
  return round(change);
}

export function calculateTax(amount: Decimal | string, taxRate: Decimal | string): Decimal {
  return round(multiply(amount, taxRate));
}

export function applyPercentDiscount(
  amount: Decimal | string,
  percentRate: Decimal | string,
): Decimal {
  const rate = new Decimal(percentRate).dividedBy(100);
  return round(multiply(amount, rate));
}
