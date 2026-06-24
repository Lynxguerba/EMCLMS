# Tech Stack

The Evangelical Mission College Learning Management System (EMCLMS) is built using a modern full-stack architecture with a focus on performance, scalability, and AI-driven features.

## Frontend
- **Framework:** [React 19](https://react.dev/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **UI Libraries:**
  - [Material UI (MUI) v7](https://mui.com/) - Core UI components and theming.
  - [Tailwind CSS v4](https://tailwindcss.com/) - Utility-first styling.
  - [Lucide React](https://lucide.dev/) - Icon set.
- **State & Routing:**
  - [React Router 7](https://reactrouter.com/) - Client-side routing.
  - [Axios](https://axios-http.com/) - API requests.
- **Data Visualization:**
  - [Recharts](https://recharts.org/) & [Chart.js](https://www.chartjs.org/) - Dashboards and analytics.
  - [MUI X Charts](https://mui.com/x/react-charts/) - Specialized MUI data viz.
- **Utility Libraries:**
  - [date-fns](https://date-fns.org/) - Date manipulation.
  - [xlsx](https://sheetjs.com/) - Excel file processing.
  - [jsPDF](https://github.com/parallax/jsPDF) - PDF generation.

## Backend
- **Framework:** [Django 5.2](https://www.djangoproject.com/)
- **API Engine:** [Django REST Framework (DRF) 3.16](https://www.django-rest-framework.org/)
- **Language:** Python 3.x
- **Database:** [PostgreSQL](https://www.postgresql.org/) with `pgvector` for semantic search.
- **Asynchronous & Real-time:**
  - [Gunicorn](https://gunicorn.org/) - WSGI HTTP Server.
  - [WhiteNoise](http://whitenoise.evans.io/) - Static file serving.

## AI & Machine Learning
- **Semantic Search:** [Sentence-Transformers](https://www.sbert.net/) for generating book embeddings.
- **Deep Learning:** [PyTorch](https://pytorch.org/) & [Hugging Face Transformers](https://huggingface.co/docs/transformers/index).
- **OCR & Document Processing:**
  - [pytesseract](https://github.com/madmaze/pytesseract) - Optical Character Recognition.
  - [pypdf](https://pypdf.readthedocs.io/) - PDF manipulation.
  - [xhtml2pdf](https://github.com/xhtml2pdf/xhtml2pdf) - HTML to PDF conversion.

## Infrastructure & Storage
- **Cloud Storage:** [Cloudinary](https://cloudinary.com/) - Management of images and media assets.
- **Environment Management:** `python-dotenv` for configuration.
