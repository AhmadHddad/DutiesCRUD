export type ErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly expose: boolean;

  public constructor(code: ErrorCode, message: string, statusCode: number, expose = true) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.expose = expose;
  }
}

export class ValidationError extends AppError {
  public constructor(message: string) {
    super('VALIDATION_ERROR', message, 400);
  }
}

export class NotFoundError extends AppError {
  public constructor(message: string) {
    super('NOT_FOUND', message, 404);
  }
}

export class ServiceUnavailableError extends AppError {
  public constructor(message: string) {
    super('SERVICE_UNAVAILABLE', message, 503);
  }
}

export class RateLimitError extends AppError {
  public constructor(message = 'Too many requests. Please try again later.') {
    super('TOO_MANY_REQUESTS', message, 429);
  }
}
