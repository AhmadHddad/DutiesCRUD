import { NextFunction, Request, Response } from 'express';

import { AppError, NotFoundError } from '../errors/appErrors';
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

  return new AppError('INTERNAL_ERROR', 'An unexpected error occurred.', 500, false);
}
