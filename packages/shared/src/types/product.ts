export interface Product {
  localId: string;
  remoteId?: string;
  barcode: string;
  sku: string;
  nameAr: string;
  nameEn: string;
  price: string;
  taxRate: string;
  unit: string;
  warehouseId: string;
  isActive: boolean;
  syncStatus: string;
  syncedAt?: string;
  updatedAt: string;
}

export interface ProductSnapshot {
  barcode: string;
  sku: string;
  nameAr: string;
  nameEn: string;
  price: string;
  taxRate: string;
  unit: string;
  warehouseId: string;
}
