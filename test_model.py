import time
import numpy as np
from sentence_transformers import SentenceTransformer

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
    if query.lower() in title.lower():
        display_score += 10

    # 3. Final Polish
    # Ensure it doesn't exceed 100% and stays as a float
    return min(float(display_score), 99.9)

# 1. Load Model
print("--- Loading all-mpnet-base-v2 model ---")
start = time.time()
model = SentenceTransformer("all-mpnet-base-v2")
print(f"Model loaded in {time.time() - start:.2f} seconds\n")

# 2. Mock Data for Testing
books = [
    {"title": "Python Programming for Beginners", "author": "John Smith"},
    {"title": "Deep Learning with Neural Networks", "author": "Alice Doe"},
    {"title": "Introduction to Computer Science", "author": "Bob Ross"},
    {"title": "Data Science from Scratch", "author": "Joel Grus"},
    {"title": "Advanced Calculus", "author": "Maria Garcia"},
    {"title": "Numerical Analysis", "author": "Sarah Connor"},
]

# Pre-generate embeddings (Normalized)
print("--- Pre-computing book embeddings ---")
book_titles = [b['title'] for b in books]
book_embeddings = model.encode(book_titles, normalize_embeddings=True)

def run_test_search(query):
    print(f"\n--- Searching for: '{query}' ---")
    
    # Encode query (Normalized)
    query_embedding = model.encode(query, normalize_embeddings=True)
    
    # Compute Raw Cosine Similarities (Dot Product)
    raw_similarities = np.dot(book_embeddings, query_embedding)
    
    results = []
    for idx, raw_score in enumerate(raw_similarities):
        title = books[idx]['title']
        calibrated_score = calibrate_similarity_score(raw_score, query, title)
        results.append({
            "title": title,
            "raw": round(float(raw_score) * 100, 2),
            "calibrated": round(calibrated_score, 2)
        })
    
    # Sort by calibrated score
    results.sort(key=lambda x: x['calibrated'], reverse=True)
    
    # Print Comparison Table
    print(f"{'Book Title':<40} | {'Raw %':<10} | {'Calibrated %':<15}")
    print("-" * 75)
    for r in results:
        print(f"{r['title']:<40} | {r['raw']:<10} | {r['calibrated']:<15}")

# 3. Test Cases
run_test_search("Python")
run_test_search("Neural Networks")
run_test_search("Math")
run_test_search("Calculs")  # Typo test
