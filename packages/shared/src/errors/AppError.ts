export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_TOKEN_EXPIRED'
  | 'AUTH_TOKEN_INVALID'
  | 'AUTH_USER_INACTIVE'
  | 'AUTH_PIN_INVALID'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'SYNC_ERROR'
  | 'SYNC_CONFLICT'
  | 'PRINT_ERROR'
  | 'CRITICAL_ERROR'
  | 'CART_EMPTY'
  | 'INSUFFICIENT_PAYMENT'
  | 'PRODUCT_NOT_FOUND'
  | 'SHIFT_ALREADY_OPEN'
  | 'SHIFT_NOT_OPEN'
  | 'REFUND_ALREADY_PROCESSED'
  | 'SUPERVISOR_REQUIRED'
  | 'HELD_SALES_LIMIT_EXCEEDED';

export interface AppErrorDetails {
  field?: string;
  [key: string]: unknown;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: AppErrorDetails;

  constructor(message: string, code: ErrorCode, statusCode = 500, details?: AppErrorDetails) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: AppErrorDetails) {
    super(message, 'VALIDATION_ERROR', 422, details);
  }
}

export class AuthError extends AppError {
  constructor(message: string, code: ErrorCode = 'AUTH_TOKEN_INVALID') {
    super(message, code, 401);
  }
}

export class PermissionError extends AppError {
  constructor(message: string) {
    super(message, 'PERMISSION_DENIED', 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 'NOT_FOUND', 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: AppErrorDetails) {
    super(message, 'CONFLICT', 409, details);
  }
}

export class SyncError extends AppError {
  constructor(message: string, details?: AppErrorDetails) {
    super(message, 'SYNC_ERROR', 500, details);
  }
}

export class PrintError extends AppError {
  constructor(message: string) {
    super(message, 'PRINT_ERROR', 500);
  }
}

export class CriticalError extends AppError {
  constructor(message: string, details?: AppErrorDetails) {
    super(message, 'CRITICAL_ERROR', 500, details);
  }
}