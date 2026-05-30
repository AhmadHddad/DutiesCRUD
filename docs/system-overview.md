# System Overview

This application is a shared duties workspace with a React frontend, an Express backend, and PostgreSQL for persistence.

## Runtime Topology

- Browser: renders the duties UI and sends HTTP requests to the backend.
- Frontend app: React + Vite + Ant Design + direct Axios-backed async state.
- Backend app: Express + TypeScript + `pg` + custom middleware.
- Database: PostgreSQL table `duties` with identity ids, a version column, and timestamps.
- Local infrastructure: Docker Compose runs PostgreSQL for development.

## Request Flow

1. The frontend calls the backend through `frontend/src/api/dutiesApi.ts`.
2. The backend assigns or propagates `X-Request-Id`, logs the request, applies security and CORS middleware, parses JSON, and applies API rate limiting.
3. The duties router delegates to controller, service, repository, and validation layers inside `backend/src/modules/duties`.
4. The repository talks to PostgreSQL using parameterized SQL through `pg`.
5. The backend returns JSON envelopes for data and errors.

## Main Product Flows

### List Duties

- The frontend uses `useDuties()` to request one server-side page at a time and drives pagination through the Ant Design table pager.
- The backend accepts `limit` and `offset`, defaults to `limit=50` and `offset=0`, and returns a `DutyListPage` envelope.
- If duplicate query params are sent, the backend uses the first value.

### Create Duty

- `CreateDutyForm` validates and trims the name in the frontend before submit.
- The backend performs the authoritative validation, trims the name, and ignores unexpected body fields.
- The repository inserts the row and returns the created duty.

### Edit Duty With Concurrency Protection

- `useDutyEditor()` loads one duty before editing.
- `GET /api/duties/:id` returns the duty and an `ETag` header that encodes duty id and row version.
- `PUT /api/duties/:id` requires `If-Match`.
- If the row version changed, the backend returns `412 PRECONDITION_FAILED` with `latestDuty` and the latest `ETag` so the UI can refresh in place and update the visible list row.

### Delete Duty

- The frontend sends a delete request from `DutiesTable`.
- The backend removes the row and returns `204 No Content`.

## Shared Contracts Boundary

`packages/contracts` is intentionally small. It contains API-facing types and constants shared by both sides of the application:

- `Duty`
- `DutyInput`
- `DutyListQuery`
- `DutyListPage`
- `DUTY_NAME_MAX_LENGTH`

Validation logic that is only used in one project stays local to that project.

## Data Model

The database schema is defined in `backend/src/database/schema.sql`.

- `duties.id`: PostgreSQL `bigint` identity column.
- `duties.name`: `varchar(256)` with a non-empty trimmed constraint.
- `duties.version`: numeric optimistic-concurrency version.
- `duties.created_at` / `duties.updated_at`: timestamps.
- `set_updated_at` trigger: updates `updated_at` on writes.
- `duties_created_at_id_idx`: supports descending list retrieval.

## Documentation Map

- `docs/workspace.md`: top-level repository structure and scripts.
- `docs/backend/backend-overview.md`: backend folders, middleware, and duties module boundaries.
- `docs/frontend/components-and-hooks.md`: UI components, props, and hooks.
- `docs/api.md`: markdown API reference.
- `docs/openapi.json`: OpenAPI 3.0 specification used by Swagger UI.
