import { NextFunction, Request, Response } from 'express';
import rateLimit, { Options } from 'express-rate-limit';
import helmet from 'helmet';

import { AppConfig } from '../config/env';
import { RateLimitError } from '../errors/appErrors';

export function createSecurityMiddleware() {
  return helmet({
    crossOriginEmbedderPolicy: false
  });
}

export function createApiRateLimiter(config: AppConfig) {
  return createRateLimiter(config.rateLimitWindowMs, config.rateLimitMaxRequests);
}

export function createDutyWriteRateLimiter(config: AppConfig) {
  return createRateLimiter(
    config.rateLimitWindowMs,
    config.writeRateLimitMaxRequests,
    'Too many write requests. Please slow down.'
  );
}

function createRateLimiter(windowMs: number, limit: number, message?: string) {
  // Route 429 handling through the shared error pipeline so rate limits use the
  // same JSON envelope and request-id-aware responses as the rest of the API.
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler(_req: Request, _res: Response, next: NextFunction, _options: Options) {
      next(new RateLimitError(message));
    }
  });
}
