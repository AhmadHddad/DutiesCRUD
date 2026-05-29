# Nexplore Duties

End-to-end to-do application for reading, creating, updating, and deleting shared duties.

The repository contains two independent TypeScript projects:

- `backend`: Node.js, Express, PostgreSQL, and plain SQL through `pg`.
- `frontend`: React, Vite, Ant Design, and client-side hooks.

## Screenshots

Create a new duty:

![Create duty](frontend/screenshots/duties-add.png)

Edit an existing duty:

![Edit duty](frontend/screenshots/duties-edit.png)

Delete a duty:

![Delete duty](frontend/screenshots/duties-delete.png)

## Architecture

The backend keeps an intentional domain-oriented `src/modules/` boundary so additional domains can grow without flattening the service. The duties domain stays isolated behind route, controller, service, repository, validation, and SQL/database layers, while Express request lifecycle code now lives under `src/middleware/`, reusable error types under `src/errors/`, and logger-style utilities under `src/utils/`.

The frontend remains independent from backend internals. API calls are isolated in `src/api`, state is handled with React hooks, Ant Design components provide the table, forms, modal, loading, empty, and error states, and shared duty contracts are consumed from `packages/contracts/`.

Requests flow from the frontend into the Express backend, through request-id logging, security, CORS, JSON parsing, and rate limiting, and finally into the duties route/controller/service/repository pipeline before reaching PostgreSQL. Single-duty reads and updates use `ETag` and `If-Match` for optimistic concurrency so stale edits can be detected and refreshed without losing the latest server state.

## Docs Map

- [Workspace overview](docs/workspace.md)
- [System overview](docs/system-overview.md)
- [Backend overview](docs/backend/backend-overview.md)
- [Frontend components and hooks](docs/frontend/components-and-hooks.md)
- [API reference](docs/api.md)
- [OpenAPI spec](docs/openapi.json)
- Swagger UI (when the backend is running): [http://localhost:4000/docs](http://localhost:4000/docs)

## Workspace Overview

- `backend`: Express API, PostgreSQL access, middleware, validation, and the duties domain module.
- `frontend`: React application, feature components, hooks, and the API client.
- `packages/contracts`: shared duty contracts and constants used by both projects.
- `docs`: architecture, API, workspace, and frontend/backend reference documentation.
- `.trae/documents`: planning artifacts created during implementation work; not part of the shipped application.

## Requirements Coverage

- Shared list with no authentication: the duties list is shared across users and the application does not implement user authentication.
- Required operations: the application supports reading, creating, and updating duties. Delete is also implemented as an optional enhancement.
- Frontend stack and constraints: the frontend is a client-side-only React application written in strict TypeScript with hooks, form validation, and no Redux-style state manager.
- Backend stack and constraints: the backend is a Node.js Express API written in strict TypeScript, uses PostgreSQL with plain parameterized SQL through `pg`, and does not use an ORM.
- Testing: Jest is used for both backend and frontend automated tests.
- Repository structure: frontend and backend remain independent projects, while `packages/contracts` contains only genuinely shared duty contracts and constants.
- Documentation deliverables: this README includes setup and run instructions, build and serve commands, tests, API details, and screenshots that cover list, create, update, and delete flows.
- Submission deliverables: publish the repository publicly and preserve the full commit history when preparing the final handoff.

## Backend Constraints

- The backend keeps direct visibility of PostgreSQL and SQL usage: repositories execute plain SQL queries through `pg`, and no ORM is used.
- Duty input validation is implemented in backend code without depending on shared frontend validation helpers.
- Support middleware such as `dotenv`, `helmet`, and `express-rate-limit` remains in place for configuration loading and HTTP protections, while shared contracts stay limited to cross-project types and constants.

## Prerequisites

- Node.js 20 or newer.
- npm 10 or newer.
- Docker Desktop or Docker Engine for local PostgreSQL.

## Install

From the repository root:

```sh
npm run install:all
```

The default backend configuration already points to the Docker Compose database:

```text
postgres://duties:duties@localhost:5432/duties
```

Optional environment files can be created from:

- `backend/.env.example`
- `frontend/.env.example`

## Run Locally

Start the full stack from the repository root:

```sh
npm run fullstack:dev
```

This command:

- starts PostgreSQL with Docker Compose
- waits for the database port to accept connections
- initializes the database schema
- launches backend and frontend together

You can still run each part separately if needed:

```sh
npm run db:up
npm run db:wait
npm run backend:init-db
npm run backend:dev
npm run frontend:dev
```

Reset the local database from scratch:

```sh
npm run db:reset
```

`npm run db:reset` is destructive and removes all local PostgreSQL data stored in the Docker volume.

Open [http://localhost:5173](http://localhost:5173). The backend listens on [http://localhost:4000](http://localhost:4000).

## Build And Serve

Backend:

```sh
npm --prefix backend run build
npm --prefix backend run serve
```

Frontend:

```sh
npm --prefix frontend run build
npm --prefix frontend run serve
```

These commands use npm scripts and work on Windows, macOS, and Linux.

## Tests

Automated tests use Jest in both projects.

Run all tests:

```sh
npm test
```

Run projects separately:

```sh
npm --prefix backend test
npm --prefix frontend test
```

Build verification:

```sh
npm run build
```

## API

All API errors use:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Duty name is required.",
    "requestId": "..."
  }
}
```

Endpoints:

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Service and database health. |
| `GET` | `/api/duties` | List duties. Supports optional `limit` and `offset` query params. Defaults to `limit=50` and `offset=0`, requires `limit >= 1`, `limit <= 100`, and `offset >= 0`. If a query param is repeated, the first value is used. |
| `GET` | `/api/duties/:id` | Get one duty and return an `ETag` header for optimistic concurrency. |
| `POST` | `/api/duties` | Create a duty with `{ "name": "..." }`. |
| `PUT` | `/api/duties/:id` | Update a duty with `{ "name": "..." }` and an `If-Match` header containing the latest duty `ETag`. |
| `DELETE` | `/api/duties/:id` | Delete a duty. |

Further API docs:

- [Markdown API reference](docs/api.md)
- [OpenAPI spec](docs/openapi.json)
- Swagger UI (backend running): [http://localhost:4000/docs](http://localhost:4000/docs)

Duty shape:

```ts
interface Duty {
  id: string;
  name: string;
}
```

## Operational Notes

- Duty names are trimmed and must be between 1 and 256 characters.
- Duty names are treated as plain text on the backend. The API intentionally does not HTML-sanitize or strip tag-like input such as `learn about <a> and 5 < 2 and 3>2`, because that would mutate valid user text and change the intended value.
- Safe HTML escaping is handled at render time in the frontend, where duty names are displayed as text rather than injected as raw HTML. This preserves the original text while still preventing HTML execution in the UI.
- Unexpected request-body fields are ignored by backend duty validation; only the validated `name` field is extracted.
- Route IDs must be positive integer strings.
- `GET /api/duties/:id` and `PUT /api/duties/:id` participate in optimistic concurrency using `ETag` and `If-Match`.
- `PUT /api/duties/:id` can return `412 PRECONDITION_FAILED` with `latestDuty` details and the newest `ETag` when an edit is stale.
- SQL uses parameterized queries only.
- Request logs are emitted as JSON with request ID, method, path, status, and duration.
- `X-Request-Id` is accepted from clients or generated by the API and returned in responses.
