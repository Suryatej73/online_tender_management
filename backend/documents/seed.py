from documents.models import DocumentType


DEFAULT_DOCUMENT_TYPES = [
    {
        "name": "Tender Specification",
        "code": "TENDER_SPEC",
        "description": "Technical specifications and statement of work for procurement notice.",
        "allowed_extensions": [".pdf", ".docx"],
        "max_file_size": 25 * 1024 * 1024,
        "requires_ocr": True,
        "requires_verification": False,
        "expiry_required": False,
        "versioning_enabled": True
    },
    {
        "name": "Bill of Quantities (BOQ)",
        "code": "BOQ",
        "description": "Itemized bill of quantities schedule and unit rate pricing sheet.",
        "allowed_extensions": [".xlsx", ".xls", ".csv", ".pdf"],
        "max_file_size": 20 * 1024 * 1024,
        "requires_ocr": True,
        "requires_verification": True,
        "expiry_required": False,
        "versioning_enabled": True
    },
    {
        "name": "GST Registration Certificate",
        "code": "GST_CERT",
        "description": "Government GST / Tax identification certificate for vendor registration.",
        "allowed_extensions": [".pdf", ".jpg", ".png"],
        "max_file_size": 10 * 1024 * 1024,
        "requires_ocr": True,
        "requires_verification": True,
        "expiry_required": True,
        "versioning_enabled": True
    },
    {
        "name": "Company Incorporation Certificate",
        "code": "COMPANY_REG",
        "description": "Articles of incorporation / Registrar of Companies certificate.",
        "allowed_extensions": [".pdf"],
        "max_file_size": 15 * 1024 * 1024,
        "requires_ocr": True,
        "requires_verification": True,
        "expiry_required": False,
        "versioning_enabled": True
    },
    {
        "name": "Technical Bid Proposal",
        "code": "TECH_PROPOSAL",
        "description": "Two-envelope Technical Proposal containing methodology and OEM compliance.",
        "allowed_extensions": [".pdf", ".docx"],
        "max_file_size": 50 * 1024 * 1024,
        "requires_ocr": True,
        "requires_verification": True,
        "expiry_required": False,
        "versioning_enabled": True
    },
    {
        "name": "Financial Bid Proposal",
        "code": "FIN_PROPOSAL",
        "description": "Two-envelope Financial Bid proposal with commercial quote.",
        "allowed_extensions": [".pdf", ".xlsx"],
        "max_file_size": 25 * 1024 * 1024,
        "requires_ocr": False,
        "requires_verification": True,
        "expiry_required": False,
        "versioning_enabled": True
    },
    {
        "name": "Bank Guarantee / EMD",
        "code": "BANK_GUARANTEE",
        "description": "Earnest Money Deposit or Performance Bank Guarantee instrument.",
        "allowed_extensions": [".pdf"],
        "max_file_size": 10 * 1024 * 1024,
        "requires_ocr": True,
        "requires_verification": True,
        "expiry_required": True,
        "versioning_enabled": True
    },
    {
        "name": "Contract Agreement",
        "code": "CONTRACT",
        "description": "Legally binding procurement contract agreement signed between buyer and supplier.",
        "allowed_extensions": [".pdf"],
        "max_file_size": 30 * 1024 * 1024,
        "requires_ocr": True,
        "requires_verification": True,
        "expiry_required": True,
        "versioning_enabled": True
    }
]


def seed_default_document_types():
    created_count = 0
    for dt in DEFAULT_DOCUMENT_TYPES:
        _, created = DocumentType.objects.get_or_create(
            code=dt['code'],
            defaults=dt
        )
        if created:
            created_count += 1
    return created_count
