# Testing Guide

This guide explains how to run the automated tests for EMCLMS to ensure code quality and prevent regressions.

## Backend Testing (Django)

The backend uses Django's built-in testing framework. There are over 130 tests covering API endpoints, models, and business logic.

### Prerequisites
- Ensure your virtual environment is activated.
- A test database will be automatically created and destroyed during the process.

### Running All Tests
```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
python manage.py test
```

### Running Specific Tests
To run tests for a specific file or module:
```bash
python manage.py test api.tests.test_auth_views
```

---

## Frontend Quality Checks

Currently, the frontend focus is on type safety and linting. Automated UI tests are planned for future implementation.

### Linting & Type Checking
To check for code style issues and TypeScript errors:
```bash
cd frontend
npm run lint
```

---

## Continuous Integration (CI) Standards

- **Pass Before PR:** All backend tests must pass 100% before a Pull Request is opened.
- **No Lint Errors:** Ensure `npm run lint` passes without errors.
- **Test New Features:** When adding a new API endpoint or complex logic, you are expected to add a corresponding test case in `backend/api/tests/`.
