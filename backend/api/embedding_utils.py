# backend/api/embedding_utils.py
_model = None


def get_model():
    """Returns the globally loaded SentenceTransformer model."""
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        print("Loading SentenceTransformer model 'all-MiniLM-L12-v2' (this may take a while on first run)...")
        # Load the model at application startup.
        # This makes the first request faster and prevents timeouts.
        _model = SentenceTransformer("all-MiniLM-L12-v2")
        print("Model loaded successfully.")
    return _model


def get_embedding(text: str) -> list[float]:
    """Generate embedding for a given input text."""
    model = get_model()
    # Use the pre-loaded model for efficiency.
    # Ensure the query embedding is also normalized to a unit vector.
    embedding = model.encode(text, normalize_embeddings=True)
    return embedding.tolist()


def generate_book_text_representation(book) -> str:
    """Creates the text representation of a book for embedding."""
    text_parts = [
        book.title or "",
        f"Author: {book.author}" if book.author else "",
        f"Publisher: {book.publisher}" if book.publisher else "",
        f"ISBN: {book.isbn}" if book.isbn else "",
        f"Bookshelf: {book.bookshelf.name}" if book.bookshelf else "",
        f"Copyright: {book.copyright}" if book.copyright else "",
    ]
    return ". ".join(part for part in text_parts if part)


def update_book_embedding(book):
    """Generates and saves the embedding for a single book instance."""
    text = generate_book_text_representation(book)
    embedding = get_embedding(text)
    book.embedding = embedding
    book.save(update_fields=["embedding"])
