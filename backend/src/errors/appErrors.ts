export type ErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'PRECONDITION_REQUIRED'
  | 'PRECONDITION_FAILED'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE';

interface AppErrorOptions {
  details?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly expose: boolean;
  public readonly details?: Record<string, unknown>;
  public readonly headers?: Record<string, string>;

  public constructor(code: ErrorCode, message: string, statusCode: number, expose = true, options: AppErrorOptions = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.expose = expose;
    this.details = options.details;
    this.headers = options.headers;
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

export class PreconditionRequiredError extends AppError {
  public constructor(message: string) {
    super('PRECONDITION_REQUIRED', message, 428);
  }
}

export class PreconditionFailedError extends AppError {
  public constructor(message: string, options: AppErrorOptions = {}) {
    super('PRECONDITION_FAILED', message, 412, true, options);
  }
}
