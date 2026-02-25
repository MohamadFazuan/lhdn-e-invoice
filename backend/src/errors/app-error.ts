export class AppError extends Error {
  readonly isAppError = true as const;

  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function isAppError(err: unknown): err is AppError {
  return (
    err instanceof AppError ||
    (typeof err === 'object' && err !== null && (err as any).isAppError === true)
  );
}
