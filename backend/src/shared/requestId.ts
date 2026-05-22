import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

import { logger } from './logger';

const REQUEST_ID_HEADER = 'x-request-id';

type RequestWithRequestId = Request & {
  requestId?: string;
};

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incomingRequestId = req.header(REQUEST_ID_HEADER);
  const requestId = incomingRequestId && incomingRequestId.trim() !== '' ? incomingRequestId : randomUUID();

  (req as RequestWithRequestId).requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);

  next();
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startedAt = Date.now();

  res.on('finish', () => {
    logger.info('request_completed', {
      requestId: getRequestId(req),
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt
    });
  });

  next();
}

export function getRequestId(req: Request): string {
  return (req as RequestWithRequestId).requestId ?? 'unknown';
}
