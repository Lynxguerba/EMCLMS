from rest_framework.decorators import api_view, parser_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone
from datetime import datetime
from decimal import Decimal, InvalidOperation
from ..models import User, Content, Section, ContentFile, Enrollment, Grade, Notification


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
def instructor_add_content(request):
    # --- Auth ---
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=404)

    if user.user_type != "Instructor":
        return Response({"detail": "Forbidden"}, status=403)

    # --- Extract fields ---
    content_title = request.data.get("content_title")
    content_description = request.data.get("content_description", "")
    content_type = request.data.get("content_type")
    total_score = request.data.get("total_score")
    due_date_val = request.data.get("due_date")
    section_id = request.data.get("section_id")

    if not section_id:
        return Response({"detail": "Missing section_id"}, status=400)

    try:
        section = Section.objects.get(pk=section_id)
    except Section.DoesNotExist:
        return Response({"detail": "Section not found"}, status=404)

    if not content_title or not content_type:
        return Response({"detail": "Missing required fields"}, status=400)

    # --- Parse due_date ---
    parsed_due_date = None
    if due_date_val not in [None, "", "null"]:
        try:
            parsed = datetime.fromisoformat(due_date_val)
            if parsed.tzinfo is None:
                parsed_due_date = timezone.make_aware(
                    parsed, timezone.get_current_timezone()
                )
            else:
                parsed_due_date = parsed
        except Exception:
            parsed_due_date = None

    # --- Validate total_score ---
    parsed_total_score = None
    if total_score not in [None, "", "null"]:
        try:
            parsed_total_score = Decimal(total_score)
            # Check if the number of digits before the decimal point exceeds the allowed precision
            # max_digits=10, decimal_places=2 means 8 digits before decimal
            if parsed_total_score.as_tuple().exponent < -2: # More than 2 decimal places
                return Response({"detail": "Total score has too many decimal places (max 2)."}, status=400)
            if len(parsed_total_score.as_tuple().digits) - abs(parsed_total_score.as_tuple().exponent) > 8:
                return Response({"detail": "Total score is too large (max 8 digits before decimal)."}, status=400)
        except InvalidOperation:
            return Response({"detail": "Invalid total_score format."}, status=400)

    # --- Create content ---
    new_content = Content.objects.create(
        section=section,
        content_title=content_title,
        content_description=content_description,
        content_type=content_type,
        due_date=parsed_due_date,
        order_in_section=(Content.objects.filter(section=section).count() + 1),
        created_at=timezone.now(),
        updated_at=timezone.now(),
        total_score=parsed_total_score,
    )

    # --- Handle file uploads ---
    files = request.FILES.getlist("files")
    
    try:
        for f in files:
            ContentFile.objects.create(content=new_content, file=f)
    except Exception as e:
        new_content.delete() # Rollback content creation
        return Response({"detail": f"Error uploading files: {str(e)}"}, status=400)

    # --- Create pending grade entries for all active students if Activity ---
    course = section.course
    active_enrollments = Enrollment.objects.filter(course=course).select_related("student")
    
    if content_type == "Activity":
        grade_objects = [
            Grade(
                content=new_content,
                user=enrollment.student,
                score=None,
                normalized_score=None,  # new field
                feedback="",
                graded_at=None,
                status="Pending",
            )
            for enrollment in active_enrollments
        ]
        Grade.objects.bulk_create(grade_objects)

    # --- Notify students ---
    title = "New Course Content"
    message = f"New content '{new_content.content_title}' has been added to the course {course.course_code} ({course.course_title})."
    
    notifications = [
        Notification(
            user=enrollment.student,
            title=title,
            message=message,
            status=Notification.Status.UNREAD,
        )
        for enrollment in active_enrollments
    ]
    Notification.objects.bulk_create(notifications)

    # --- Prepare response with related files ---
    files_data = [
        {
            "id": f.id,
            "file": f.file.url,
            "uploaded_at": f.uploaded_at,
        }
        for f in new_content.files.all()
    ]

    return Response(
        {
            "detail": "Content added successfully",
            "content_id": new_content.content_id,
            "section_id": new_content.section.section_id,
            "content_title": new_content.content_title,
            "content_description": new_content.content_description,
            "content_type": new_content.content_type,
            "due_date": new_content.due_date,
            "is_active": new_content.is_active,
            "order_in_section": new_content.order_in_section,
            "created_at": new_content.created_at,
            "updated_at": new_content.updated_at,
            "total_score": new_content.total_score,
            "files": files_data,
        },
        status=201,
    )
