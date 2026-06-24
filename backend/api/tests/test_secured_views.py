from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework import status
from api.models import User, BookRequest, Book

from django.core.cache import cache

class SecuredViewsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        cache.clear()
        
        # Create users
        self.student = User.objects.create(
            email="student@test.com",
            first_name="Test",
            last_name="Student",
            user_type="Student",
            user_id=2024001
        )
        self.librarian = User.objects.create(
            email="librarian@test.com",
            first_name="Test",
            last_name="Librarian",
            user_type="Librarian",
            user_id=2024002
        )

    def test_librarian_book_requests_unauthorized_for_anonymous(self):
        """
        Calling librarian requests endpoint anonymously returns 401.
        """
        response = self.client.get('/api/admin/get/registration-requests/') # wait, let's verify librarian book request URL
        # Ah, the url in urls.py is: path("api/librarian/get/book-requests/", views.list_book_requests)
        response = self.client.get('/api/librarian/get/book-requests/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_librarian_book_requests_forbidden_for_student(self):
        """
        Calling librarian requests endpoint as student returns 403.
        """
        session = self.client.session
        session['user_id'] = self.student.user_id
        session.save()
        
        response = self.client.get('/api/librarian/get/book-requests/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_librarian_book_requests_allowed_for_librarian(self):
        """
        Calling librarian requests endpoint as librarian returns 200.
        """
        session = self.client.session
        session['user_id'] = self.librarian.user_id
        session.save()
        
        response = self.client.get('/api/librarian/get/book-requests/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_librarian_borrow_records_unauthorized_for_anonymous(self):
        """
        Calling librarian borrow records endpoint anonymously returns 401.
        """
        response = self.client.get('/api/librarian/get/borrow-records/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_librarian_borrow_records_forbidden_for_student(self):
        """
        Calling librarian borrow records endpoint as student returns 403.
        """
        session = self.client.session
        session['user_id'] = self.student.user_id
        session.save()
        
        response = self.client.get('/api/librarian/get/borrow-records/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_librarian_borrow_records_allowed_for_librarian(self):
        """
        Calling librarian borrow records endpoint as librarian returns 200.
        """
        session = self.client.session
        session['user_id'] = self.librarian.user_id
        session.save()
        
        response = self.client.get('/api/librarian/get/borrow-records/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    @override_settings(REST_FRAMEWORK={
        "DEFAULT_THROTTLE_RATES": {
            "anon": "3/minute",
        }
    })
    def test_semantic_search_throttling_for_anonymous(self):
        """
        Verify that semantic search is throttled after 3 requests for anonymous users.
        """
        url = '/api/users/semantic-book-search/'
        data = {'query': 'test query'}
        
        # Send 3 requests (should be allowed)
        for i in range(3):
            response = self.client.post(url, data, format='json')
            # It might return 200 or 500 (depending on sentence transformer setup in testing),
            # but it should NOT be 429.
            self.assertNotEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

        # 4th request should be throttled
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_secured_views_edge_cases(self):
        """
        Verify missing fields, non-existent lookups, and copy limit edge cases.
        """
        # Login as librarian
        session = self.client.session
        session['user_id'] = self.librarian.user_id
        session.save()

        # --- Case 1: Non-existent request lookup ---
        response = self.client.delete('/api/librarian/delete/reject-book-request/99999/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        response = self.client.post('/api/librarian/post/confirm-book-pickup/99999/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # --- Case 2: Missing fields in borrow creation ---
        response = self.client.post('/api/librarian/post/borrow-book/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("User ID and Book ISBN are required.", response.data["error"])

        # --- Case 3: Insufficient copy copies block ---
        # Create a book with 0 copies
        book = Book.objects.create(
            title="Out of Stock Book",
            author="Author",
            isbn="9876543210123",
            copy=0,
            bookshelf=None
        )
        # Create a request for it
        req = BookRequest.objects.create(
            user=self.student,
            book=book,
            status=BookRequest.Status.PENDING
        )
        
        # Trying to approve it should return a 400 error
        response = self.client.post(f'/api/librarian/post/update-request-status/{req.request_id}/', {'status': 'Pending'}, format='json')
        # Wait, if we set status to Pending (no copies are checked), it succeeds
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # But setting status to Approved when copy is 0 should return 400
        response = self.client.post(f'/api/librarian/post/update-request-status/{req.request_id}/', {'status': 'Approved'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("No copies available to approve this request.", response.data["error"])


