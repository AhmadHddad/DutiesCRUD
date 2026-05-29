# Backend Overview

The backend is an Express application built around clear runtime boundaries instead of a flat `src/` directory.

## Folder Responsibilities

### `src/config`

- `env.ts`: loads environment variables and applies defaults for `PORT`, `DATABASE_URL`, `CORS_ORIGIN`, `LOG_LEVEL`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`, and `WRITE_RATE_LIMIT_MAX_REQUESTS`.

### `src/database`

- `pool.ts`: owns the process-wide PostgreSQL connection pool.
- `init.ts`: initializes the database by reading and applying `schema.sql` through a temporary pool.
- `schema.sql`: canonical schema for the `duties` table, timestamps, version column, trigger, and index.

### `src/errors`

- `appErrors.ts`: shared application error types and HTTP status mappings.

### `src/middleware`

- `requestId.ts`: accepts or generates `X-Request-Id`, stores it on the request, returns it in the response, and logs request completion metadata.
- `security.ts`: applies Helmet and both global API and write-specific rate limiting.
- `cors.ts`: sets allow/expose headers and handles `OPTIONS` requests.
- `errorHandler.ts`: transforms thrown errors into the shared JSON error envelope.
- `asyncHandler.ts`: wraps async request handlers so thrown errors flow into the shared error pipeline.

### `src/modules/duties`

This folder holds the duties domain end to end.

- `duty.routes.ts`: defines the route table.
- `duty.controller.ts`: reads request data and sends HTTP responses.
- `duty.validation.ts`: validates ids, query params, and request bodies.
- `duty.etag.ts`: creates and parses domain-specific ETags for optimistic concurrency.
- `duty.service.ts`: enforces business behavior such as not-found and stale-update responses.
- `duty.repository.ts`: executes plain SQL through `pg`.
- `duty.types.ts`: internal backend types/contracts for the duties module.

### `src/utils`

- `logger.ts`: structured logging helper used by request logging and operational scripts.

### `src/server.ts`

- Starts the HTTP server, logs startup, and shuts down gracefully on process signals.

## Request Lifecycle

The middleware order in `createApp()` is intentional:

1. `requestIdMiddleware`
2. `requestLogger`
3. `createSecurityMiddleware()`
4. `createCorsMiddleware()`
5. `express.json({ limit: '64kb' })`
6. `/api` rate limiter
7. `/health` route and `/api/duties` routes
8. not-found handler
9. shared error handler

This ordering ensures request IDs and logging exist before security, parsing, and route execution.

## Security And Transport Notes

- Helmet sets standard security headers. `crossOriginEmbedderPolicy` is disabled for compatibility with the current frontend usage.
- Global API requests are rate-limited with configurable defaults.
- Write operations have a stricter rate limit and return `Too many write requests. Please slow down.` when exceeded.
- CORS allows `GET,POST,PUT,DELETE,OPTIONS` and allows `Content-Type`, `X-Request-Id`, and `If-Match` request headers.
- CORS exposes `X-Request-Id` and `ETag` so the frontend can read them.
- JSON request bodies are capped at `64kb`.

## Error Envelope

All backend errors use the same JSON shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Duty name is required.",
    "requestId": "...",
    "details": {}
  }
}
```

Common error codes:

- `VALIDATION_ERROR`
- `NOT_FOUND`
- `PRECONDITION_REQUIRED`
- `PRECONDITION_FAILED`
- `TOO_MANY_REQUESTS`
- `INTERNAL_ERROR`
- `SERVICE_UNAVAILABLE`

## Duties Module Notes

- Route ids must be positive integer strings.
- Duty names are treated as plain text and are not HTML-sanitized by the backend.
- Pagination defaults to `limit=50` and `offset=0`.
- Repeated query params use the first value.
- The repository uses parameterized SQL only.
- Optimistic concurrency is driven by the `version` column and `ETag` / `If-Match` headers.

## Operations

- Use `npm --prefix backend run init-db` to apply the canonical schema.
- Use `npm --prefix backend run dev` for local watch mode.
- Use `npm --prefix backend run build` and `npm --prefix backend run serve` for compiled execution.
