# State Management & Data Handling

EMCLMS uses a hybrid approach to state management, prioritizing built-in React features for local UI state and **TanStack Query** for server-side state.

## Server State (TanStack Query)
As of the latest infrastructure update, the application has transitioned to [TanStack Query v5](https://tanstack.com/query/latest) for all API interactions. This handles caching, background re-validation, and loading/error states automatically.

### Centralized Query Hooks
All API queries are centralized in `src/hooks/useQueries.ts`.
- **Query Keys:** Managed via the `queryKeys` object to prevent "magic strings" and ensure consistent cache invalidation.
- **Hooks:** Custom hooks (e.g., `useStudentCourses`) wrap the `useQuery` logic to provide a clean interface for components.

### Global Mutation Policy
To ensure UI consistency, all data-modifying actions (POST/PUT/DELETE) must use the `useGlobalMutation` hook.
- **Policy:** Every mutation must explicitly define which `queryKeys` it invalidates upon success. This triggers automatic background refetching of stale data, eliminating the need for manual state synchronization.

## Local State Management
Individual pages and components continue to manage their own UI-specific state (e.g., modal toggles, form inputs) using:
- **`useState`:** For simple toggles and inputs.
- **`AuthContext`:** For global user session data (fetched once at the root).

## Server Communication
- **Axios:** Used as the underlying fetcher for TanStack Query.
- **Base URL:** Configured via `import.meta.env.VITE_API_BASE_URL`.
- **Credentials:** Requests are made with `{ withCredentials: true }` to support session-based authentication.
- **Interceptors:** A global Axios interceptor in `main.tsx` handles `401 Unauthorized` errors by redirecting users to the login page.
