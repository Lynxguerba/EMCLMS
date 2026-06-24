# backend/api/utils/ocr_helpers.py
import pytesseract
from PIL import Image
import os
from typing import BinaryIO, Union

# Explicit path for Windows reliability
if os.name == 'nt':
    pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


def extract_text_from_image(image_source: Union[str, BinaryIO]) -> str:
    """
    Extract text content from an image using Tesseract OCR.
    Accepts either a filesystem path or a file-like object.
    """
    if isinstance(image_source, str):
        if not os.path.exists(image_source):
            raise FileNotFoundError(f"Image not found: {image_source}")
        image = Image.open(image_source)
    else:
        image = Image.open(image_source)

    text = pytesseract.image_to_string(image)
    return text.strip()
