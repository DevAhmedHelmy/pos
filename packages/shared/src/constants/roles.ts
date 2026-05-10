export const Role = {
  CASHIER: 'cashier',
  SUPERVISOR: 'supervisor',
  ADMIN: 'admin',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const RolePermissions: Record<Role, string[]> = {
  cashier: [
    'shift:open',
    'shift:close:own',
    'sale:create',
    'sale:cancel:own',
    'sale:hold',
    'sale:resume',
    'payment:cash',
    'payment:card',
    'payment:split',
    'receipt:print',
    'receipt:reprint:own',
    'discount:apply:below_threshold',
    'product:search',
  ],
  supervisor: [
    'shift:open',
    'shift:close:any',
    'sale:create',
    'sale:cancel:any',
    'sale:hold',
    'sale:resume',
    'payment:cash',
    'payment:card',
    'payment:split',
    'receipt:print',
    'receipt:reprint:any',
    'discount:apply:any',
    'refund:process',
    'product:search',
    'supervisor:pin',
  ],
  admin: ['*'],
};

export function hasPermission(role: Role, permission: string): boolean {
  const perms = RolePermissions[role];
  return perms.includes('*') || perms.includes(permission);
}