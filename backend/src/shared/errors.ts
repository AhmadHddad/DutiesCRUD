import { NextFunction, Request, Response } from 'express';

import { logger } from './logger';
import { getRequestId } from './requestId';

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
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

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} was not found.`));
}

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction): void {
  const requestId = getRequestId(req);
  const appError = toAppError(error);

  if (appError.statusCode >= 500) {
    logger.error('request_failed', {
      requestId,
      method: req.method,
      path: req.originalUrl,
      error
    });
  }

  res.status(appError.statusCode).json({
    error: {
      code: appError.code,
      message: appError.expose ? appError.message : 'An unexpected error occurred.',
      requestId
    }
  });
}

function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  return new AppError('INTERNAL_ERROR', 'An unexpected error occurred.', 500, false);
}
