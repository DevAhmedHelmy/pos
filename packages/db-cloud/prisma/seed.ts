import { PrismaClient, RoleEnum } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

function hashPin(pin: string): string {
  return createHash('sha256').update(pin).digest('hex');
}

async function main() {
  const warehouse = await prisma.warehouse.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Main Branch',
      address: '123 Main Street, Cairo',
      isActive: true,
    },
  });

  await prisma.terminal.upsert({
    where: { id: '00000000-0000-0000-0000-000000000010' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      warehouseId: warehouse.id,
      label: 'Terminal 01',
      isActive: true,
    },
  });

  const users = [
    {
      id: '00000000-0000-0000-0000-000000000101',
      username: 'admin',
      nameAr: 'مدير النظام',
      nameEn: 'System Admin',
      pinHash: hashPin('1234'),
      role: RoleEnum.ADMIN,
    },
    {
      id: '00000000-0000-0000-0000-000000000102',
      username: 'supervisor',
      nameAr: 'المشرف',
      nameEn: 'Supervisor',
      pinHash: hashPin('2345'),
      role: RoleEnum.SUPERVISOR,
    },
    {
      id: '00000000-0000-0000-0000-000000000103',
      username: 'cashier01',
      nameAr: 'الكاشير الأول',
      nameEn: 'Cashier 01',
      pinHash: hashPin('3456'),
      role: RoleEnum.CASHIER,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: { ...user, warehouseId: warehouse.id },
    });
  }

  const products = Array.from({ length: 100 }, (_, i) => {
    const idx = i + 1;
    return {
      id: `00000000-0000-0000-0001-${String(idx).padStart(12, '0')}`,
      warehouseId: warehouse.id,
      barcode: `690${String(idx).padStart(10, '0')}`,
      sku: `SKU-${String(idx).padStart(5, '0')}`,
      nameAr: `منتج رقم ${idx}`,
      nameEn: `Product ${idx}`,
      price: (Math.random() * 100 + 1).toFixed(4),
      taxRate: '0.1500',
      unit: 'pcs',
      isActive: true,
    };
  });

  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: {},
      create: product,
    });
  }

  console.log('Seed complete: 1 warehouse, 1 terminal, 3 users, 100 products');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
