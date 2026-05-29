# Frontend Components And Hooks

The frontend is organized so view components, async state, transport, labels, and shared contracts stay separate.

## Frontend Structure

- `src/App.tsx`: root composition layer.
- `src/components`: visual building blocks and feature UI.
- `src/hooks`: React Query state, mutation, and edit orchestration.
- `src/api/dutiesApi.ts`: Axios transport layer.
- `src/i18n/dutiesLabels.ts`: centralized UI copy and aria labels.
- `src/components/dutySchema.ts`: frontend-only validation helpers for duty names.
- `packages/contracts`: shared API-facing types and constants.

## Component Reference

### `DutiesPageHeader`

- **File:** `frontend/src/components/DutiesPageHeader.tsx`
- **Used by:** `App.tsx`
- **Purpose:** renders the page title, subtitle, and refresh button.
- **Props:**
  - `isRefreshing: boolean` - disables the refresh button while a refresh is in flight.
  - `onRefresh(): void` - triggers a list refresh.

### `CreateDutySection`

- **File:** `frontend/src/components/CreateDutySection.tsx`
- **Used by:** `App.tsx`
- **Purpose:** wraps the create form in a section with a heading.
- **Props:**
  - `isSubmitting: boolean` - forwards create-mutation state to the form.
  - `onCreate(name: string): Promise<void>` - creates a new duty from the normalized name.

### `CreateDutyForm`

- **File:** `frontend/src/components/CreateDutyForm.tsx`
- **Used by:** `CreateDutySection`
- **Purpose:** collects a new duty name and submits it.
- **Props:**
  - `isSubmitting: boolean` - drives the submit button loading state.
  - `onCreate(name: string): Promise<void>` - called with the trimmed duty name after validation.
- **Behavior:** uses Ant Design `Form`, enforces max length, trims on submit, and resets after a successful create.

### `DutiesSection`

- **File:** `frontend/src/components/DutiesSection.tsx`
- **Used by:** `App.tsx`
- **Purpose:** wraps the table and summary text for the duties list.
- **Props:**
  - `duties: Duty[]`
  - `hasNextPage: boolean`
  - `isFetchingNextPage: boolean`
  - `isLoading: boolean`
  - `isMutating: boolean`
  - `loadedCount: number`
  - `onDelete(id: string): Promise<void>`
  - `onEdit(id: string): void`
  - `onLoadMore(): Promise<void>`
  - `total: number`

### `DutiesTable`

- **File:** `frontend/src/components/DutiesTable.tsx`
- **Used by:** `DutiesSection`
- **Purpose:** renders the list, edit/delete actions, empty state, and infinite-scroll behavior.
- **Props:**
  - `duties: Duty[]`
  - `hasNextPage: boolean`
  - `isFetchingNextPage: boolean`
  - `isLoading: boolean`
  - `isMutating: boolean`
  - `loadedCount: number`
  - `total: number`
  - `onDelete(id: string): Promise<void>`
  - `onEdit(id: string): void`
  - `onLoadMore(): Promise<void>`
- **Behavior:** attaches a scroll listener to the Ant Design table body and requests the next page near the bottom.

### `DutyEditorManager`

- **File:** `frontend/src/components/DutyEditorManager.tsx`
- **Used by:** `App.tsx`
- **Purpose:** lazy-loads the edit modal and connects it to `useDutyEditor()`.
- **Props:**
  - `dutyId: string | null` - the duty currently being edited, or `null` when closed.
  - `onClose(): void` - closes the modal after a successful save or user cancel.
- **Behavior:** does not render anything when `dutyId` is `null`.

### `EditDutyModal`

- **File:** `frontend/src/components/EditDutyModal.tsx`
- **Used by:** `DutyEditorManager`
- **Purpose:** edits an existing duty and handles refresh-after-conflict UX.
- **Props:**
  - `duty: Duty | null`
  - `conflictMessage: string | null`
  - `error: string | null`
  - `isLoading: boolean`
  - `isRefreshing: boolean`
  - `isSaving: boolean`
  - `open: boolean`
  - `onCancel(): void`
  - `onRefresh(): void`
  - `onSave(name: string): Promise<boolean>`
- **Behavior:** disables save while data is unavailable, displays stale-edit warnings, and repopulates the form when a fresh duty arrives.

## Hooks Reference

### `useDuties()`

- **File:** `frontend/src/hooks/useDuties.ts`
- **Purpose:** central list state manager for duties.
- **Responsibilities:**
  - loads paginated duties with `useInfiniteQuery`
  - exposes flattened `duties`, `total`, `loadedCount`, and loading flags
  - creates duties
  - deletes duties
  - refetches the list
  - formats API and mutation errors into user-facing strings
- **Important return values:** `duties`, `error`, `total`, `loadedCount`, `isLoading`, `isRefreshing`, `isFetchingNextPage`, `hasNextPage`, `isMutating`, `loadDuties`, `loadMore`, `addDuty`, `removeDuty`

### `useDutyEditor()`

- **File:** `frontend/src/hooks/useDutyEditor.ts`
- **Purpose:** owns the edit modal fetch/save workflow for a single duty.
- **Responsibilities:**
  - fetches a duty by id
  - stores and updates the latest `ETag`
  - submits updates with `If-Match`
  - handles `412 PRECONDITION_FAILED` by storing `latestDuty` and a conflict message
  - merges refreshed duty data back into the paginated list cache
- **Important return values:** `duty`, `error`, `conflictMessage`, `isLoading`, `isFetching`, `isRefreshing`, `isSaving`, `refreshDuty`, `saveDuty`

## Transport Layer

`frontend/src/api/dutiesApi.ts` is the only place that knows HTTP-level details:

- base URL from `VITE_API_BASE_URL` with a local default of `http://localhost:4000`
- pagination query construction
- create/update/delete requests
- `ETag` extraction from read/update responses
- `If-Match` submission for updates
- translation of `412` responses into `DutyPreconditionFailedError`

## Labels And Validation

- `frontend/src/i18n/dutiesLabels.ts` centralizes visible strings and aria labels.
- `frontend/src/components/dutySchema.ts` keeps frontend-only validation lightweight: trim the value, require non-empty input, and enforce `DUTY_NAME_MAX_LENGTH`.
