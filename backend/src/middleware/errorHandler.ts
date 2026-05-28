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

  // Only server-side failures are logged here. Client-facing messages and
  // headers still flow from AppError so the API keeps one consistent envelope.
  if (appError.statusCode >= 500) {
    logger.error('request_failed', {
      requestId,
      method: req.method,
      path: req.originalUrl,
      error
    });
  }

  if (appError.headers !== undefined) {
    for (const [headerName, headerValue] of Object.entries(appError.headers)) {
      res.setHeader(headerName, headerValue);
    }
  }

  const errorBody: {
    code: string;
    message: string;
    requestId: string;
    details?: Record<string, unknown>;
  } = {
    code: appError.code,
    message: appError.expose ? appError.message : 'An unexpected error occurred.',
    requestId
  };

  if (appError.details !== undefined) {
    errorBody.details = appError.details;
  }

  res.status(appError.statusCode).json({
    error: errorBody
  });
}

function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  return new AppError('INTERNAL_ERROR', 'An unexpected error occurred.', 500, false);
}
