# Frontend Components

The EMCLMS frontend is built with React 19, leveraging a combination of Material UI for structural components and Tailwind CSS for utility-based styling.

## UI Frameworks
- **Material UI (MUI) v7:** Used for complex components like `Box`, `CircularProgress`, `Avatar`, and the overall `theme.ts` configuration.
- **Tailwind CSS v4:** Primary tool for layout, spacing, and decorative styling (e.g., gradients, transitions, and hover effects).
- **Lucide React:** Standardized icon set used across all dashboards.

## Core Layout Components
While most pages are located in `src/pages`, they share common layout elements:
- **Sidebar:** A role-based navigation component that adapts its links based on whether the user is an Admin, Student, Instructor, or Librarian.
- **Navbar:** Top navigation bar handling sidebar toggles and user profile display.

## Dashboard Structures
Each user role has a dedicated dashboard optimized for their specific tasks:
- **Admin Dashboard:** Focused on system-wide analytics using `MUI X Charts` (Bar and Pie charts) and recent activity feeds.
- **Instructor Dashboard:** Prioritizes course management and quick access to grading tasks.
- **Student Dashboard:** Highlights enrolled courses, upcoming deadlines, and academic performance.
- **Librarian Dashboard:** Specialized for book inventory and borrow/return transactions.

## Reusable Components
- **CustomSelect:** A highly-styled, accessible dropdown component that replaces native HTML select elements. It features rounded corners (`rounded-xl`), smooth animations, and icon integration, used primarily in the Admin user management filters.
- **CourseEditModal:** A standardized modal for updating course titles and descriptions, accessible to both Admins and Instructors.
- **AdminBulkUserUploadModal:** A complex modal for batch importing users via CSV/Excel or manual entry, featuring real-time validation and error reporting.
- **AccountingFees:** Centralized UI for configuring institutional fee rates.
- **AccountingBulkChargeModal:** Handles applying a selected fee definition across multiple student accounts simultaneously.
- **AccountingTransactionModal:** Dual-purpose modal for recording individual student payments or manual charges. It features an advanced **Specific Fee Allocation** system where accountants can manually or automatically distribute a new payment across outstanding charges. It also supports **Credit Re-allocation**, allowing unused funds from previous payments to be applied to new ledger entries.
- **LibrarianManageBookshelvesModal:** Handles the creation, renaming, and deletion of library bookshelves.

- **PasswordStrengthBar:** A utility component used in registration and profile settings to ensure password security.
- **Theme Provider:** Located in `src/theme.ts`, it defines the primary/secondary colors and typography that maintain visual consistency.

## Utilities
- **imageUtils.ts:** Handles profile picture URL resolution and fallback logic.
- **fileUtils.ts:** Provides helpers for file type validation and size formatting for uploads.
