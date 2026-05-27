import { NextFunction, Request, Response } from 'express';

export function createCorsMiddleware(allowedOrigin: string) {
  return function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
    const requestOrigin = req.header('origin');
    const responseOrigin = resolveAllowedOrigin(allowedOrigin, requestOrigin);

    if (responseOrigin !== undefined) {
      res.setHeader('Access-Control-Allow-Origin', responseOrigin);
      res.setHeader('Vary', 'Origin');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Request-Id');
    res.setHeader('Access-Control-Expose-Headers', 'X-Request-Id');

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    next();
  };
}

function resolveAllowedOrigin(allowedOrigin: string, requestOrigin: string | undefined): string | undefined {
  if (allowedOrigin === '*') {
    return '*';
  }

  if (requestOrigin === allowedOrigin) {
    return allowedOrigin;
  }

  if (requestOrigin === undefined) {
    return allowedOrigin;
  }

  return undefined;
}
