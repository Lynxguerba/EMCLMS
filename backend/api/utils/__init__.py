# backend/api/utils/__init__.py

def is_admin_or_superadmin(user) -> bool:
    """
    Check if a user has administrative privileges (either 'Administrator' or 'Superadmin').
    """
    return user.user_type in ["Administrator", "Superadmin"]


def is_superadmin(user) -> bool:
    """
    Check if a user is a Superadmin.
    """
    return user.user_type == "Superadmin"
