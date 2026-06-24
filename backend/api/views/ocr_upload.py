# backend/api/views/ocr_upload.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from api.utils.ocr_helpers import extract_text_from_image
from PIL import UnidentifiedImageError
import pytesseract


class OCRUploadView(APIView):
    """
    REST endpoint that accepts an image file and returns extracted text using OCR.
    """

    def post(self, request):
        file = request.FILES.get("file")

        if not file:
            return Response(
                {"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Process directly from in-memory or temporary uploaded file object.
            # This avoids storage backend path issues (e.g., Cloudinary).
            text = extract_text_from_image(file)
            return Response({"text": text}, status=status.HTTP_200_OK)
        except UnidentifiedImageError:
            return Response(
                {"error": "Invalid image file"}, status=status.HTTP_400_BAD_REQUEST
            )
        except pytesseract.pytesseract.TesseractNotFoundError:
            return Response(
                {"error": "Tesseract OCR engine is not installed on the server"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
