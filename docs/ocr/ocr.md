# OCR Processing & Intelligence Pipeline

## 1. Pipeline Architecture
```
Uploaded File ➔ Celery Task ➔ OCRProvider ➔ Text Extraction ➔ Confidence Score ➔ Database & Search Index
```

## 2. Confidence Evaluation & Quality Control
- Extracted text is assigned a confidence score between `0.0%` and `100.0%`.
- If confidence is `< 70%`, status is marked `REVIEW_REQUIRED`.
- Extracted text is stored in `DocumentOCR` records linked to the specific document version.
- Extracted text is searchable via the `/api/v1/documents/?search=<keyword>` endpoint.
