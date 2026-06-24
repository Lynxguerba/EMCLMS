from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from api.models import User, Book, Bookshelf, BookRequest, BorrowRecord
from django.utils import timezone

class BookRequestsTest(APITestCase):
    def setUp(self):
        self.librarian_password = "librarianpassword"
        self.librarian_user = User.objects.create(
            email="librarian@test.com",
            user_type="Librarian",
            first_name="Lib",
            last_name="Rarian"
        )
        self.librarian_user.set_password(self.librarian_password)
        self.librarian_user.save()

        self.student1_password = "studentpassword1"
        self.student1 = User.objects.create(
            email="student1@test.com",
            user_type="Student",
            first_name="Student",
            last_name="One"
        )
        self.student1.set_password(self.student1_password)
        self.student1.save()

        self.student2_password = "studentpassword2"
        self.student2 = User.objects.create(
            email="student2@test.com",
            user_type="Student",
            first_name="Student",
            last_name="Two"
        )
        self.student2.set_password(self.student2_password)
        self.student2.save()
        
        self.bookshelf = Bookshelf.objects.create(name="Test Shelf")
        self.book = Book.objects.create(
            title="Test Book",
            author="Test Author",
            isbn="1234567890",
            copy=1,
            bookshelf=self.bookshelf
        )

    def _login(self, user, password):
        self.client.post(reverse("login"), {"email": user.email, "password": password})

    def test_submit_request_when_no_copies(self):
        """Test that a student can submit a request even if copies are 0."""
        self.book.copy = 0
        self.book.save()

        self._login(self.student1, self.student1_password)
        url = reverse("submit_borrow_request")
        response = self.client.post(url, {"book_id": self.book.no, "reason": "Need it"}, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(BookRequest.objects.filter(user=self.student1, book=self.book).exists())

    def test_auto_cancel_others_on_approval(self):
        """Test that approving a request for the last copy cancels other pending requests."""
        # Book has 1 copy
        # Student 1 requests
        BookRequest.objects.create(user=self.student1, book=self.book, status=BookRequest.Status.PENDING)
        # Student 2 requests
        BookRequest.objects.create(user=self.student2, book=self.book, status=BookRequest.Status.PENDING)

        self._login(self.librarian_user, self.librarian_password)
        
        # Get request id for student 1
        req1 = BookRequest.objects.get(user=self.student1)
        url = reverse("update_request_status", kwargs={"request_id": req1.request_id})
        
        response = self.client.post(url, {"status": "Approved"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.book.refresh_from_db()
        self.assertEqual(self.book.copy, 0)

        # Student 1 request should be Approved
        req1.refresh_from_db()
        self.assertEqual(req1.status, BookRequest.Status.APPROVED)

        # Student 2 request should be deleted (cancelled)
        self.assertFalse(BookRequest.objects.filter(user=self.student2, book=self.book).exists())

    def test_manual_borrow_cancels_pending_requests(self):
        """Test that a manual borrow that takes the last copy cancels pending requests."""
        # Book has 1 copy
        # Student 1 requests
        BookRequest.objects.create(user=self.student1, book=self.book, status=BookRequest.Status.PENDING)

        self._login(self.librarian_user, self.librarian_password)
        
        url = reverse("librarian_create_borrow_record")
        response = self.client.post(url, {
            "user_id": self.student2.user_id,
            "book_isbn": self.book.isbn,
            "days": 7
        }, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.book.refresh_from_db()
        self.assertEqual(self.book.copy, 0)

        # Student 1 request should be deleted (cancelled)
        self.assertFalse(BookRequest.objects.filter(user=self.student1, book=self.book).exists())
