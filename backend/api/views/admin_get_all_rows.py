from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.apps import apps
from django.db import models
from ..models import User 
from ..utils import is_admin_or_superadmin


@api_view(["GET"])
def admin_get_all_rows(request):
    # Auth
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=404)

    if not is_admin_or_superadmin(user):
        return Response({"detail": "Forbidden"}, status=403)

    # Get table from query param
    table = request.GET.get("table")
    if not table:
        return Response({"detail": "Please provide ?table="}, status=400)

    try:
        # Dynamically fetch model by table name
        model = apps.get_model("api", table)
    except LookupError:
        return Response({"detail": f"Invalid table '{table}'"}, status=400)

    # Fetch rows
    if table == "Book":
        queryset = model.objects.select_related("bookshelf").all()
    else:
        queryset = model.objects.all()

    # Get file/image field names to handle them specially
    file_fields = [
        f.name for f in model._meta.fields 
        if isinstance(f, (models.FileField, models.ImageField))
    ]

    data = []
    for obj in queryset:
        row = {}
        # Get all standard fields
        for field in obj._meta.fields:
            field_name = field.name
            
            if field_name in file_fields:
                value = getattr(obj, field_name)
                if value:
                    try:
                        row[field_name] = value.url
                    except ValueError:
                        row[field_name] = None
                else:
                    row[field_name] = None
            elif isinstance(field, models.ForeignKey):
                # Use the database column name (e.g. 'course_id') to get the PK
                val = getattr(obj, field.attname)
                row[field_name] = val
                row[field_name + "_id"] = val
            else:
                row[field_name] = getattr(obj, field_name)

        # Handle bookshelf name specifically for Book table
        if table == "Book" and hasattr(obj, "bookshelf") and obj.bookshelf:
            row["bookshelf__name"] = obj.bookshelf.name
        
        data.append(row)

    return Response(data, status=200)
