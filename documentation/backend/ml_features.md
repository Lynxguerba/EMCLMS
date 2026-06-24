# Machine Learning Features

EMCLMS integrates modern AI capabilities to enhance resource discovery and document processing.

## 1. Semantic Book Search

Instead of traditional keyword matching, EMCLMS uses vector embeddings to understand the context of books.

- **Model:** `all-MiniLM-L12-v2` via the `sentence-transformers` library.
- **Workflow:**
    1.  When a book is added or updated, a text representation (Title + Author + Description + Bookshelf) is generated.
    2.  The `SentenceTransformer` model converts this text into a 384-dimensional vector.
    3.  This vector is stored in the `embedding` field of the `Book` model.
- **Search Logic:**
    - User queries are converted into embeddings in real-time.
    - The backend performs a cosine similarity search using PostgreSQL's `pgvector` to find the closest matching books.

## 2. Optical Character Recognition (OCR)

The system allows users to extract text from images and PDF documents to facilitate easier content entry and searchability.

- **Engine:** [Tesseract OCR](https://github.com/tesseract-ocr/tesseract).
- **Library:** `pytesseract` (Python wrapper) and `Pillow` for image preprocessing.
- **Supported Formats:** JPG, PNG, and multi-page PDFs.
- **Workflow:**
    1.  Files are uploaded to the `api/ocr/upload/` endpoint.
    2.  The backend pre-processes the image (resizing, grayscale) to improve accuracy.
    3.  Tesseract extracts the text, which is then returned to the frontend as a JSON response.

## 3. Automated Embeddings Management

A custom Django management command is available to batch-process embeddings for existing library data:

```bash
python manage.py generate_book_embeddings
```

This command iterates through all books in the database that lack an embedding, generates them using the local model, and saves them to the database.
