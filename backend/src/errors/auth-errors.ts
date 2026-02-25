import { AppError } from './app-error.js';

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(403, 'FORBIDDEN', message);
  }
}

export class InvalidCredentialsError extends AppError {
  constructor() {
    super(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }
}

export class TokenExpiredError extends AppError {
  constructor() {
    super(401, 'TOKEN_EXPIRED', 'Token has expired');
  }
}

export class TokenInvalidError extends AppError {
  constructor() {
    super(401, 'TOKEN_INVALID', 'Token is invalid');
  }
}
