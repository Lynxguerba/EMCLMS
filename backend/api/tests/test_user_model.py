from django.test import TestCase
from django.utils import timezone
from api.models import User
from django.contrib.auth.hashers import check_password


class UserModelTest(TestCase):
    def test_user_id_generation_first_user_of_year(self):
        """
        Tests that the user_id is correctly generated for the first user
        created in a given year.
        """
        current_year = timezone.now().year
        user = User(
            email="test1@gmail.com",
            user_type="Student",
            first_name="John",
            last_name="Doe",
        )
        user.set_password("password123")
        user.save()

        expected_user_id = int(f"{current_year}000")
        self.assertEqual(user.user_id, expected_user_id)

    def test_user_id_generation_subsequent_users(self):
        """
        Tests that the user_id increments correctly for subsequent users
        created in the same year.
        """
        # Create a first user to establish a base ID
        user1 = User(
            email="test2@gmail.com",
            user_type="Student",
            first_name="Jane",
            last_name="Smith",
        )
        user1.set_password("password123")
        user1.save()

        user2 = User(
            email="test3@gmail.com",
            user_type="Instructor",
            first_name="Peter",
            last_name="Jones",
        )
        user2.set_password("password456")
        user2.save()

        self.assertEqual(user2.user_id, user1.user_id + 1)

    def test_set_password_hashes_password(self):
        """
        Tests that the set_password method correctly hashes the password.
        """
        user = User(
            email="test4@gmail.com",
            user_type="Administrator",
            first_name="Admin",
            last_name="User",
        )
        raw_password = "securepassword"
        user.set_password(raw_password)
        user.save()

        self.assertNotEqual(user.password_hash, raw_password)
        self.assertTrue(check_password(raw_password, user.password_hash))
