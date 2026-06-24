# Architecture Overview

The Evangelical Mission College Learning Management System (EMCLMS) is designed as a decoupled full-stack application. It provides a robust platform for academic management, digital library services, and AI-enhanced resource discovery.

## System Design

### Frontend (SPA)
The frontend is a Single Page Application (SPA) built with React. It communicates with the backend exclusively via RESTful APIs. It is divided into several dashboards:
- **Student Dashboard:** Course tracking, activity submission, and library search.
- **Instructor Dashboard:** Course management, grading, and content creation.
- **Administrator Dashboard:** User approval, system logs, and overall analytics.
- **Accounting Dashboard:** Student balance management, ledger tracking, and fee collection.

- **Backend (REST API):** The Django backend serves as the central "source of truth."
- **Authentication:** JWT or Session-based secure access.
- **Business Logic:** Course cloning, automated grading status, and enrollment validation.
- **Media Management:** Handling file uploads via Cloudinary or local storage.

## Data Flow

1.  **User Interaction:** A user performs an action (e.g., submitting an assignment) in the React UI.
2.  **API Request:** The frontend sends a JSON payload to the Django REST Framework (DRF) endpoint.
3.  **Processing:** Django validates the request, applies business logic (e.g., checking if the deadline has passed), and updates the PostgreSQL database.
4.  **Notification:** The system may trigger a `Notification` entry for relevant users.
5.  **Feedback:** DRF returns a success/error response, and the React UI updates the state accordingly.

## Key Features

- **Semantic Library Search:** Unlike traditional keyword search, EMCLMS uses vector embeddings to understand the *meaning* of book titles and descriptions.
- **Course Cloning:** Instructors can easily duplicate entire course structures (sections, contents, and file references) for new semesters with a single click.
- **Dynamic Reporting:** Real-time generation of student progress reports and library usage statistics using specialized templates.
