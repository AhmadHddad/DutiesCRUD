import { NextFunction, Request, Response } from 'express';

import { AppError, NotFoundError, ValidationError } from '../errors/appErrors';
import { logger } from '../utils/logger';
import { getRequestId } from './requestId';

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

  if (isInvalidUuidDatabaseError(error)) {
    return new ValidationError('Duty id must reference an existing record.');
  }

  return new AppError('INTERNAL_ERROR', 'An unexpected error occurred.', 500, false);
}

function isInvalidUuidDatabaseError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const candidate = error as { code?: unknown; message?: unknown };
  return candidate.code === '22P02' && typeof candidate.message === 'string' && candidate.message.includes('uuid');
}
