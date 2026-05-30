# Workspace Overview

This repository is a small workspace with three product code areas and a few root-level orchestration files.

## Top-Level Folders

- `backend/`: Express API, PostgreSQL integration, middleware, and the duties domain module.
- `frontend/`: React application built with Vite, Ant Design, and direct API-driven local state.
- `packages/contracts/`: Shared duty types and constants used by both frontend and backend.
- `docs/`: Human-readable architecture, API, and component documentation.
- `.trae/documents/`: planning artifacts created during implementation work. These are not part of the runtime application.

## Root Scripts

The root `package.json` is the workspace entry point for local development:

- `npm run install:all`: installs root, contracts, backend, and frontend dependencies.
- `npm run db:up`: starts PostgreSQL from `docker-compose.yml`.
- `npm run db:wait`: waits for the local PostgreSQL port to accept connections.
- `npm run db:seed`: appends generated duties through the backend seed script; defaults to 1,000,000 rows and supports overrides such as `npm run db:seed -- --count=250000`.
- `npm run db:down`: stops the Docker Compose database.
- `npm run db:reset`: recreates the local Docker volume, starts PostgreSQL, waits for it, and reapplies the canonical schema.
- `npm run backend:init-db`: runs the backend database bootstrap script against `backend/src/database/schema.sql`.
- `npm run backend:dev`: starts the backend in watch mode.
- `npm run frontend:dev`: starts the Vite frontend.
- `npm run services:dev`: runs backend and frontend dev servers together.
- `npm run fullstack:dev`: starts PostgreSQL, waits for it, initializes the schema, then starts backend and frontend.
- `npm test`: runs backend tests and frontend tests.
- `npm run build`: builds shared contracts, backend TypeScript, and the frontend production bundle.

## Workspace Relationships

- The frontend calls the backend over HTTP and treats the backend as the source of truth for data validation and persistence.
- The backend owns PostgreSQL access, request validation, error envelopes, and concurrency control.
- `packages/contracts` contains only truly shared API-facing types and constants such as `Duty`, `DutyInput`, `DutyListPage`, and `DUTY_NAME_MAX_LENGTH`.

## Local Development Flow

1. Install dependencies from the repository root.
2. Start PostgreSQL with Docker Compose.
3. Apply the canonical database schema.
4. Run backend and frontend together through the root scripts.
5. Use the frontend at `http://localhost:5173` and the backend at `http://localhost:4000`.

## Supporting Files

- `docker-compose.yml`: local PostgreSQL service definition with persistence and health checks.
- `README.md`: quick start, architecture summary, and docs index.
- `requirements.md`: assignment requirements used to validate the implementation and documentation scope.
