import { readFileSync } from 'node:fs';
import path from 'node:path';

import { Request, Response, Router } from 'express';
import swaggerUi from 'swagger-ui-express';

interface OpenApiDocument {
  openapi: string;
  info: {
    title: string;
    version: string;
  };
}

export function createDocsRouter(): Router {
  const router = Router();
  const spec = loadOpenApiSpec();

  router.get('/openapi.json', (_req: Request, res: Response) => {
    res.status(200).json(spec);
  });

  router.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));

  return router;
}

function loadOpenApiSpec(): OpenApiDocument {
  const specPath = path.resolve(__dirname, '..', '..', '..', 'docs', 'openapi.json');
  const rawSpec = readFileSync(specPath, 'utf8');
  const parsedSpec = JSON.parse(rawSpec) as unknown;

  if (!isOpenApiDocument(parsedSpec)) {
    throw new Error(`OpenAPI spec at ${specPath} is invalid.`);
  }

  return parsedSpec;
}

function isOpenApiDocument(value: unknown): value is OpenApiDocument {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as {
    openapi?: unknown;
    info?: {
      title?: unknown;
      version?: unknown;
    };
  };

  return (
    typeof candidate.openapi === 'string' &&
    typeof candidate.info?.title === 'string' &&
    typeof candidate.info?.version === 'string'
  );
}
