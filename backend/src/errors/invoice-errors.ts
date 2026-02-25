import { AppError } from './app-error.js';

export class InvalidTotalsError extends AppError {
  constructor(details: string) {
    super(422, 'INVALID_TOTALS', `Invoice totals are inconsistent: ${details}`);
  }
}

export class InvalidStatusTransitionError extends AppError {
  constructor(from: string, to: string) {
    super(
      422,
      'INVALID_STATUS_TRANSITION',
      `Cannot transition invoice from ${from} to ${to}`,
    );
  }
}

export class InvoiceNotEditableError extends AppError {
  constructor(status: string) {
    super(422, 'INVOICE_NOT_EDITABLE', `Invoice with status ${status} cannot be edited`);
  }
}
