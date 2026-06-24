from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response
from rest_framework import status
from ..models import Book
from ..embedding_utils import get_embedding
from ..throttles import SemanticSearchRateThrottle
import numpy as np


def calibrate_similarity_score(raw_score, query, title):
    """
    Stretches the typical 0.3-0.8 cosine similarity range into a 70-95% range
    and adds a bonus for exact keyword matches in the title.
    """
    # 1. Score Stretching (Min-Max Calibration)
    # Maps 0.3 -> 70% and 0.8 -> 95%
    if raw_score > 0.3:
        display_score = 70 + (raw_score - 0.3) * 50  # (95-70)/(0.8-0.3) = 50
    else:
        # For lower scores, scale linearly to 70%
        display_score = (raw_score / 0.3) * 70 if raw_score > 0 else 0

    # 2. Keyword Bonus
    # If the user's query appears exactly in the title, add a 10% bonus
    if query and title and query.lower() in title.lower():
        display_score += 10

    # 3. Final Polish
    # Ensure it doesn't exceed 99.9% and stays as a float
    return min(float(display_score), 99.9)


@api_view(["POST"])
@throttle_classes([SemanticSearchRateThrottle])
def semantic_search_books(request):
    try:
        query = request.data.get("query", "").strip()

        if not query:
            return Response({"error": "Query is required"}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Get query embedding (returns list[float])
        query_embedding = np.array(get_embedding(query), dtype=np.float32)

        # 2. Fetch all book embeddings efficiently (only ID and vector)
        books_data = list(Book.objects.exclude(embedding=None).values_list("no", "embedding"))

        if not books_data:
            return Response({"results": []})

        # 3. Create Numpy Matrix
        book_ids = [b[0] for b in books_data]
        embeddings_matrix = np.array([b[1] for b in books_data], dtype=np.float32)

        # 4. Compute Cosine Similarity (Dot Product)
        similarities = np.dot(embeddings_matrix, query_embedding)

        # 5. Get Top N Results (e.g., Top 50)
        top_n = 50
        sorted_indices = np.argsort(similarities)[-top_n:][::-1]

        top_ids = [book_ids[i] for i in sorted_indices]
        top_scores = {book_ids[i]: similarities[i] for i in sorted_indices}

        # 6. Fetch full details for the top results
        top_books = Book.objects.filter(no__in=top_ids).select_related("bookshelf")
        results_map = {b.no: b for b in top_books}

        final_results = []
        for book_id in top_ids:
            book = results_map.get(book_id)
            if book:
                raw_sim = float(top_scores[book_id])
                calibrated_sim = calibrate_similarity_score(raw_sim, query, book.title)

                final_results.append(
                    {
                        "id": book.no,
                        "title": book.title,
                        "author": book.author,
                        "publisher": book.publisher,
                        "copyright": book.copyright,
                        "isbn": book.isbn,
                        "copy": book.copy,
                        "bookshelf__name": book.bookshelf.name if book.bookshelf else None,
                        "similarity": round(calibrated_sim, 2),
                        "file_path": book.file_path.name if book.file_path else None,
                    }
                )

        # 7. Re-sort final results based on the new calibrated score
        # (Since keyword boosts might change the semantic order)
        final_results.sort(key=lambda x: x["similarity"], reverse=True)

        return Response({"results": final_results})
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
