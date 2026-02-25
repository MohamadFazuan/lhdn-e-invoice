import { AppError } from './app-error.js';

export class LHDNTokenError extends AppError {
  constructor(detail: string) {
    super(502, 'LHDN_TOKEN_ERROR', `Failed to obtain LHDN token: ${detail}`);
  }
}

export class LHDNSubmissionError extends AppError {
  constructor(detail: string) {
    super(502, 'LHDN_SUBMISSION_ERROR', `LHDN submission failed: ${detail}`);
  }
}

export class LHDNCredentialsMissingError extends AppError {
  constructor() {
    super(
      422,
      'LHDN_CREDENTIALS_MISSING',
      'LHDN client credentials not configured for this business',
    );
  }
}
