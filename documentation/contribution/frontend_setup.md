# Frontend Setup Guide

Follow these steps to set up the React development environment for the EMCLMS frontend.

## Prerequisites
- **Node.js 20+** (LTS recommended)
- **npm** or **pnpm**

## Local Development Setup

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Configuration:**
    Create a `.env` file in the `frontend/` directory (referencing `.env.example` if available) and set the backend API base URL:
    ```env
    VITE_API_BASE_URL=http://127.0.0.1:8000
    ```

4.  **Run Development Server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173`.

## Available Scripts

- `npm run dev`: Starts the Vite development server with Hot Module Replacement (HMR).
- `npm run build`: Compiles the TypeScript code and builds the production-ready assets in the `dist/` folder.
- `npm run lint`: Runs ESLint to check for code quality and style issues.
- `npm run preview`: Locally previews the production build.

## Key Technologies Used
- **Vite:** Next-generation frontend tooling.
- **TypeScript:** For type-safe development.
- **Tailwind CSS:** For styling (processed via `@tailwindcss/vite`).
- **Material UI:** For complex UI components.
- **TanStack Query (v5):** For server-state management and data fetching.

## Troubleshooting

### Browser Extension Noise
During development, you may see errors in the browser console from extensions like **Bitwarden** (e.g., `Could not establish connection`). These are caused by the extension's scripts and are not related to the EMCLMS codebase. You can safely ignore these or use a private/incognito window to minimize console noise.
