import type { Role } from '../constants/roles';

export interface User {
  localId: string;
  remoteId: string;
  username: string;
  nameAr: string;
  nameEn: string;
  role: Role;
  warehouseId: string;
  isActive: boolean;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: Omit<User, 'localId'>;
}

export interface JwtPayload {
  sub: string;
  role: Role;
  warehouseId: string;
  terminalId: string;
  iat: number;
  exp: number;
}
