# backend/api/management/commands/generate_book_embeddings.py

from django.core.management.base import BaseCommand
from api.models import Book
from api.embedding_utils import update_book_embedding


class Command(BaseCommand):
    help = "Generate sentence embeddings for books"

    def handle(self, *args, **kwargs):
        books = Book.objects.all()
        total = books.count()
        self.stdout.write(f"Generating embeddings for {total} books...")

        for i, book in enumerate(books):
            self.stdout.write(f"Processing book {i + 1}/{total}: {book.title}...", ending="\r")
            update_book_embedding(book)
            self.stdout.flush()

        self.stdout.write("\n")
        self.stdout.write(self.style.SUCCESS(f"Successfully updated embeddings for {total} books"))
