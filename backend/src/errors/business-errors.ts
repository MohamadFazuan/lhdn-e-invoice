import { AppError } from './app-error.js';

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, 'NOT_FOUND', `${resource} not found`);
  }
}

export class OwnershipError extends AppError {
  constructor() {
    super(403, 'OWNERSHIP_VIOLATION', 'Resource does not belong to your account');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'CONFLICT', message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(422, 'VALIDATION_ERROR', message);
  }
}
