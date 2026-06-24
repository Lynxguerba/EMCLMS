# Coding Standards & Contribution

To maintain a clean and consistent codebase, please follow these guidelines when contributing to EMCLMS.

## General Principles
- **KISS (Keep It Simple, Stupid):** Avoid over-engineering. Choose the simplest solution that effectively solves the problem.
- **Readability (Clean Code):** Write code that is easy for others (and your future self) to understand. Use meaningful names and keep functions focused.
- **YAGNI (You Ain't Gonna Need It):** Don't implement functionality until it is actually necessary. Focus on current requirements to avoid codebase bloat.
- **DRY (Don't Repeat Yourself):** Extract reusable logic into utility functions or custom hooks to avoid duplication.
- **Type Safety:** Always define interfaces for API responses and component props in the frontend. Use Python type hints in the backend where appropriate.

## Frontend (React/TypeScript)
- **Component Structure:** Use functional components and hooks.
- **Styling:** Prefer Tailwind CSS utility classes for layout and spacing. Use MUI for complex interactive components.
- **File Naming:** Use `PascalCase` for components (e.g., `AdminDashboard.tsx`) and `camelCase` for utilities/hooks.
- **Linting:** Ensure `npm run lint` passes before submitting any changes.

## Backend (Django)
- **PEP 8:** Adhere to standard Python styling guidelines.
- **URL Naming:** Follow the project convention: `api/<usertype>/<method>/<description>/`.
- **Atomic Transactions:** Use `transaction.atomic()` when performing multiple related database operations (e.g., course cloning).
- **Security:** Never trust client-side data. Always validate permissions and inputs on the server.

## Git Workflow
- **Branching:** Create feature-specific branches (e.g., `feature/semantic-search-fix`).
- **Commit Messages:** Use clear, descriptive commit messages (e.g., "Add cosine similarity check to book search").
- **Pull Requests:** Ensure your code is tested locally and follows the setup guides before opening a PR.

## Documentation
- **Continuous Updates:** Documentation is a first-class citizen. Always update the relevant documentation files (in the `documentation/` directory) whenever new changes, features, or architectural shifts emerge.
- **Consistency:** Ensure that any changes in the codebase are reflected in the API endpoints, database schema, or frontend component docs as applicable.

## Workflow & Change Management (MANDATORY AGENT PROTOCOL)

To maintain project integrity and avoid unauthorized modifications, follow this **three-step protocol** strictly:

1.  **Analyze (No Code Changes):** When you identify a bug, performance issue, or potential improvement, analyze the root cause and identify the affected components. **Do not modify any source code yet.**
2.  **Report to `todo.md`:** Immediately add the findings as a specific task in `documentation/contribution/todo.md`. This is the single source of truth for pending work.
3.  **Wait for Explicit Authorization:** You are **FORBIDDEN** from implementing any task in `todo.md` until the user provides a direct instruction to proceed with that specific task (e.g., "Implement task X" or "Fix Y").

**Implementing changes immediately upon discovery or without explicit tasking is a violation of project standards.**
