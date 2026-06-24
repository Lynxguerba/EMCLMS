import sys
import os
import django
from django.db import connection
from django.contrib.auth.hashers import make_password

# --- Setup ---
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from api.models import (
    PasswordReset,
    User,
    Course,
    Section,
    Content,
    Enrollment,
    Grade,
    Book,
    CourseSchoolYear,
    Bookshelf,
    CourseRecommendedBook,
    Notification,
    StudentLog,
    InstructorLog,
)

def reset_sequence_for_model(model):
    """
    Deletes all records from the model and resets its auto-increment sequence.
    """
    with connection.cursor() as cursor:
        table = model._meta.db_table
        pk = model._meta.pk.column
        # Check if the table has a sequence
        cursor.execute(f"SELECT pg_get_serial_sequence('{table}', '{pk}')")
        result = cursor.fetchone()
        seq = result[0] if result else None
        
        # Delete all objects. Django's cascade delete will handle related objects,
        # but we call this for every model to ensure sequences are reset.
        model.objects.all().delete()
        
        if seq:
            cursor.execute(f"ALTER SEQUENCE {seq} RESTART WITH 1")
    print(f"Cleared {model.__name__}")

def clear_database():
    print("🗑️  Clearing database...")
    # Delete in order of dependency (most dependent first) to minimize cascade complexity, 
    # though Django handles it. Resetting sequences for all.
    
    models_to_clear = [
        Grade,
        Content,
        Section,
        Enrollment,
        CourseRecommendedBook,
        Notification,
        StudentLog,
        InstructorLog,
        PasswordReset,
        Course,
        Book,
        Bookshelf,
        CourseSchoolYear,
        User
    ]

    for model in models_to_clear:
        reset_sequence_for_model(model)
        
    print("✅ Database cleared.")

def create_admin():
    print("👤 Creating admin user...")
    admin_user = User.objects.create(
        email="admin@gmail.com",
        first_name="System",
        last_name="Administrator",
        user_type="Administrator",
        program="",
    )
    admin_user.set_password("asd123ASD")
    admin_user.save()
    print(f"✅ Admin created: {admin_user.email} / asd123ASD")

def create_superadmin():
    print("👤 Creating superadmin user...")
    superadmin_user = User.objects.create(
        email="superadmin@gmail.com",
        first_name="System",
        last_name="Superadmin",
        user_type="Superadmin",
        program="",
    )
    superadmin_user.set_password("asd123ASD")
    superadmin_user.save()
    print(f"✅ Superadmin created: {superadmin_user.email} / asd123ASD")

def main():
    clear_database()
    create_admin()
    create_superadmin()
    print("🎉 Reset complete.")

if __name__ == "__main__":
    main()
