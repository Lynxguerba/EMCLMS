from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from api.models import User, Book, Bookshelf

class LibrarianViewsTest(APITestCase):
    def setUp(self):
        """Set up users and a bookshelf for librarian view tests."""
        self.librarian_password = "librarianpassword"
        self.librarian_user = User(
            user_id=2025020,
            email="librarian@test.com",
            user_type="Librarian",
        )
        self.librarian_user.set_password(self.librarian_password)
        self.librarian_user.save()

        self.student_password = "studentpassword"
        self.student_user = User(
            user_id=2025021,
            email="student_librarian@test.com",
            user_type="Student",
        )
        self.student_user.set_password(self.student_password)
        self.student_user.save()
        
        self.bookshelf = Bookshelf.objects.create(name="Test Shelf")

        self.login_url = reverse("login")
    
    def _login_user(self, email, password):
        """Helper to log in a user."""
        self.client.post(self.login_url, {"email": email, "password": password})

    def test_add_book_as_librarian_success(self):
        """
        Tests that a librarian can successfully add a new book.
        """
        self._login_user(self.librarian_user.email, self.librarian_password)
        url = reverse("librarian_add_new_book")
        data = {
            "title": "Test Book",
            "author": "Test Author",
            "publisher": "Test Publisher",
            "copyright": "2023",
            "isbn": "1234567890123",
            "copy": "1",
            "bookshelf": self.bookshelf.name,
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Book.objects.filter(title="Test Book").exists())

    def test_add_book_as_student_forbidden(self):
        """
        Tests that a non-librarian user is forbidden from adding a book.
        """
        self._login_user(self.student_user.email, self.student_password)
        url = reverse("librarian_add_new_book")
        data = {"title": "Forbidden Book"}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_add_book_unauthenticated_unauthorized(self):
        """
        Tests that an unauthenticated user is unauthorized to add a book.
        """
        url = reverse("librarian_add_new_book")
        data = {"title": "Unauthorized Book"}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_add_book_missing_title(self):
        """
        Tests that adding a book with a missing title returns a 400 Bad Request.
        """
        self._login_user(self.librarian_user.email, self.librarian_password)
        url = reverse("librarian_add_new_book")
        data = {"author": "Test Author"}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_add_book_duplicate_isbn(self):
        """
        Tests that adding a book with a duplicate ISBN returns a 400 Bad Request.
        """
        self._login_user(self.librarian_user.email, self.librarian_password)
        Book.objects.create(title="Existing Book", author="Author", isbn="1234567890123", bookshelf=self.bookshelf)
        url = reverse("librarian_add_new_book")
        data = {"title": "New Book", "author": "Author", "isbn": "1234567890123"}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_all_rows_as_librarian_success_for_book(self):
        """
        Tests that a librarian can successfully get all rows for the 'book' table.
        """
        self._login_user(self.librarian_user.email, self.librarian_password)
        Book.objects.create(title="Book 1", author="Author 1", bookshelf=self.bookshelf)
        Book.objects.create(title="Book 2", author="Author 2", bookshelf=self.bookshelf)
        
        url = reverse("librarian_get_all_rows") + "?table=book"
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # 2 created here + books from other tests
        expected_books = Book.objects.count()
        self.assertEqual(len(response.data), expected_books)

    def test_get_all_rows_as_librarian_success_for_bookshelf(self):
        """
        Tests that a librarian can successfully get all rows for the 'bookshelf' table.
        """
        self._login_user(self.librarian_user.email, self.librarian_password)
        Bookshelf.objects.create(name="Shelf 2")
        
        url = reverse("librarian_get_all_rows") + "?table=bookshelf"
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        expected_shelves = Bookshelf.objects.count()
        self.assertEqual(len(response.data), expected_shelves)

    def test_get_all_rows_as_student_forbidden(self):
        """
        Tests that a non-librarian user is forbidden from getting all rows.
        """
        self._login_user(self.student_user.email, self.student_password)
        url = reverse("librarian_get_all_rows") + "?table=book"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_all_rows_unauthenticated_unauthorized(self):
        """
        Tests that an unauthenticated user is unauthorized to get all rows.
        """
        url = reverse("librarian_get_all_rows") + "?table=book"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_all_rows_no_table_provided(self):
        """
        Tests that not providing a table returns a 400 Bad Request.
        """
        self._login_user(self.librarian_user.email, self.librarian_password)
        url = reverse("librarian_get_all_rows")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_all_rows_invalid_table(self):
        """
        Tests that providing an invalid table returns a 403 Forbidden.
        """
        self._login_user(self.librarian_user.email, self.librarian_password)
        url = reverse("librarian_get_all_rows") + "?table=invalid_table"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_book_as_librarian_success(self):
        """
        Tests that a librarian can successfully update a book.
        """
        self._login_user(self.librarian_user.email, self.librarian_password)
        book = Book.objects.create(title="Original Title", author="Original Author", bookshelf=self.bookshelf)
        
        url = reverse("librarian_update_book", kwargs={"book_id": book.no})
        data = {
            "title": "Updated Title",
            "author": "Updated Author",
            "publisher": "Updated Publisher",
            "copyright": "2024",
            "isbn": "0987654321098",
            "copy": "2",
            "bookshelf": self.bookshelf.name,
        }
        response = self.client.put(url, data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        book.refresh_from_db()
        self.assertEqual(book.title, "Updated Title")

    def test_update_book_as_student_forbidden(self):
        """
        Tests that a non-librarian user is forbidden from updating a book.
        """
        self._login_user(self.student_user.email, self.student_password)
        book = Book.objects.create(title="Original Title", author="Original Author", bookshelf=self.bookshelf)
        
        url = reverse("librarian_update_book", kwargs={"book_id": book.no})
        data = {"title": "Forbidden Update"}
        response = self.client.put(url, data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_book_unauthenticated_unauthorized(self):
        """
        Tests that an unauthenticated user is unauthorized to update a book.
        """
        book = Book.objects.create(title="Original Title", author="Original Author", bookshelf=self.bookshelf)
        
        url = reverse("librarian_update_book", kwargs={"book_id": book.no})
        data = {"title": "Unauthorized Update"}
        response = self.client.put(url, data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_book_not_found(self):
        """
        Tests that updating a non-existent book returns a 404 Not Found.
        """
        self._login_user(self.librarian_user.email, self.librarian_password)
        url = reverse("librarian_update_book", kwargs={"book_id": 999})
        data = {"title": "Not Found Update"}
        response = self.client.put(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_book_missing_title(self):
        """
        Tests that updating a book with a missing title returns a 400 Bad Request.
        """
        self._login_user(self.librarian_user.email, self.librarian_password)
        book = Book.objects.create(title="Original Title", author="Original Author", bookshelf=self.bookshelf)
        
        url = reverse("librarian_update_book", kwargs={"book_id": book.no})
        data = {"author": "Missing Title"}
        response = self.client.put(url, data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_book_duplicate_isbn(self):
        """
        Tests that updating a book with a duplicate ISBN returns a 400 Bad Request.
        """
        self._login_user(self.librarian_user.email, self.librarian_password)
        Book.objects.create(title="Existing Book", author="Author", isbn="1112223334445", bookshelf=self.bookshelf)
        book_to_update = Book.objects.create(title="Book to Update", author="Author", bookshelf=self.bookshelf)

        url = reverse("librarian_update_book", kwargs={"book_id": book_to_update.no})
        data = {
            "title": "Updated Title",
            "author": "Updated Author",
            "isbn": "1112223334445"
        }
        response = self.client.put(url, data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_book_count_all_types(self):
        """Tests all argument types for librarian_get_book_count."""
        self._login_user(self.librarian_user.email, self.librarian_password)
        Book.objects.create(title="Book 1", author="Author 1", bookshelf=self.bookshelf, recommendation_count=10)
        
        types = ["total-book", "total-search", "most-searched", "borrowed-today", "overdue-count"]
        for t in types:
            url = reverse("librarian_get_book_count", kwargs={"argument_type": t})
            response = self.client.get(url)
            self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_recent_activity_success(self):
        """Tests that librarian_get_recent_activity returns data correctly."""
        self._login_user(self.librarian_user.email, self.librarian_password)
        from api.models import BorrowRecord
        from django.utils import timezone
        
        book = Book.objects.create(title="Recent Book", author="Author", bookshelf=self.bookshelf)
        BorrowRecord.objects.create(
            user=self.student_user,
            book=book,
            due_date=timezone.now() + timezone.timedelta(days=7)
        )
        
        url = reverse("librarian_get_recent_activity")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreater(len(response.data), 0)
        self.assertEqual(response.data[0]["action"], "borrowed")

    def test_update_bookshelf_as_librarian_success(self):
        """
        Tests that a librarian can successfully update a bookshelf name.
        """
        self._login_user(self.librarian_user.email, self.librarian_password)
        bookshelf = Bookshelf.objects.create(name="Old Name")
        
        url = reverse("librarian_update_bookshelf", kwargs={"bookshelf_id": bookshelf.bookshelf_id})
        data = {"name": "New Name"}
        response = self.client.put(url, data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        bookshelf.refresh_from_db()
        self.assertEqual(bookshelf.name, "New Name")

    def test_update_bookshelf_as_student_forbidden(self):
        """
        Tests that a non-librarian user is forbidden from updating a bookshelf.
        """
        self._login_user(self.student_user.email, self.student_password)
        bookshelf = Bookshelf.objects.create(name="Old Name 2")
        
        url = reverse("librarian_update_bookshelf", kwargs={"bookshelf_id": bookshelf.bookshelf_id})
        data = {"name": "Forbidden Update"}
        response = self.client.put(url, data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_bookshelf_default_allowed(self):
        """
        Tests that the 'Default' bookshelf (ID 1) can now be renamed.
        """
        self._login_user(self.librarian_user.email, self.librarian_password)
        # Ensure ID 1 exists
        default_shelf, created = Bookshelf.objects.get_or_create(bookshelf_id=1, defaults={"name": "Default"})
        
        url = reverse("librarian_update_bookshelf", kwargs={"bookshelf_id": 1})
        data = {"name": "Renamed Default"}
        response = self.client.put(url, data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Renamed Default")
        
        # Verify in DB
        default_shelf.refresh_from_db()
        self.assertEqual(default_shelf.name, "Renamed Default")

    def test_update_bookshelf_duplicate_name(self):
        """
        Tests that updating a bookshelf to an existing name returns 400.
        """
        self._login_user(self.librarian_user.email, self.librarian_password)
        Bookshelf.objects.create(name="Existing Name")
        bookshelf = Bookshelf.objects.create(name="Old Name 3")
        
        url = reverse("librarian_update_bookshelf", kwargs={"bookshelf_id": bookshelf.bookshelf_id})
        data = {"name": "Existing Name"}
        response = self.client.put(url, data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_bookshelf_default_allowed(self):
        """
        Tests that the 'Default' bookshelf (ID 1) can now be deleted.
        """
        self._login_user(self.librarian_user.email, self.librarian_password)
        # Ensure ID 1 exists and is NOT referenced by any book
        default_shelf, created = Bookshelf.objects.get_or_create(bookshelf_id=1, defaults={"name": "Default"})
        Book.objects.filter(bookshelf=default_shelf).delete()
        
        url = reverse("librarian_delete_bookshelf", kwargs={"bookshelf_id": 1})
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Bookshelf.objects.filter(bookshelf_id=1).exists())
