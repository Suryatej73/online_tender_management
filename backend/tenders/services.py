from django.utils import timezone
from django.db import transaction
from .models import TenderStatus, TenderStatusHistory, TenderVersion


class TenderLifecycleService:
    """
    Centralized State Machine Engine for Tender Lifecycle Transitions.
    Enforces strict business rules and records all state changes.
    """

    ALLOWED_TRANSITIONS = {
        TenderStatus.DRAFT: [TenderStatus.PUBLISHED, TenderStatus.CANCELLED],
        TenderStatus.PUBLISHED: [TenderStatus.ACTIVE, TenderStatus.CANCELLED],
        TenderStatus.ACTIVE: [TenderStatus.EVALUATION, TenderStatus.CANCELLED],
        TenderStatus.EVALUATION: [TenderStatus.AWARDED, TenderStatus.CANCELLED],
        TenderStatus.AWARDED: [TenderStatus.CLOSED],
        TenderStatus.CLOSED: [],
        TenderStatus.CANCELLED: [],
    }

    @classmethod
    def is_valid_transition(cls, current_status, target_status):
        if current_status == target_status:
            return True
        allowed = cls.ALLOWED_TRANSITIONS.get(current_status, [])
        return target_status in allowed

    @classmethod
    def validate_publishing_readiness(cls, tender):
        errors = []
        if not tender.title or len(tender.title.strip()) < 5:
            errors.append("Tender title must be at least 5 characters long.")
        if not tender.description or len(tender.description.strip()) < 10:
            errors.append("Detailed tender description is required before publishing.")
        if not tender.category:
            errors.append("Tender must be assigned to a valid Tender Category.")
        if not tender.submission_deadline:
            errors.append("Submission deadline is mandatory before publishing.")
        elif tender.submission_deadline <= timezone.now():
            errors.append("Submission deadline must be in the future.")
        if tender.opening_date and tender.submission_deadline and tender.opening_date < tender.submission_deadline:
            errors.append("Bid opening date must be on or after the submission deadline.")
        if tender.budget is None or tender.budget <= 0:
            errors.append("Tender budget must be a positive number greater than zero.")

        if errors:
            raise ValueError(f"Tender publishing validation failed: {'; '.join(errors)}")

    @classmethod
    @transaction.atomic
    def transition_tender(cls, tender, target_status, user=None, reason=""):
        current_status = tender.status

        if current_status == target_status:
            return tender

        if not cls.is_valid_transition(current_status, target_status):
            raise ValueError(
                f"Invalid lifecycle transition from '{current_status}' to '{target_status}'. "
                f"Allowed target states: {cls.ALLOWED_TRANSITIONS.get(current_status, ['None'])}"
            )

        now = timezone.now()

        if target_status == TenderStatus.PUBLISHED:
            cls.validate_publishing_readiness(tender)
            if not tender.publication_date:
                tender.publication_date = now

        elif target_status == TenderStatus.ACTIVE:
            if not tender.start_date:
                tender.start_date = now

        elif target_status == TenderStatus.EVALUATION:
            if not tender.evaluation_start_date:
                tender.evaluation_start_date = now

        elif target_status == TenderStatus.AWARDED:
            if not tender.award_date:
                tender.award_date = now

        elif target_status == TenderStatus.CLOSED:
            if not tender.closed_date:
                tender.closed_date = now

        tender.status = target_status
        tender.save()

        # Record Status History
        user_name = user.full_name if user and hasattr(user, 'full_name') else (str(user) if user else "System Automated")
        TenderStatusHistory.objects.create(
            tender=tender,
            from_status=current_status,
            to_status=target_status,
            changed_by=user if user and getattr(user, 'is_authenticated', False) else None,
            changed_by_name=user_name,
            reason=reason or f"Transitioned from {current_status} to {target_status}"
        )

        # Record Initial Snapshot on Publish
        if target_status == TenderStatus.PUBLISHED and not TenderVersion.objects.filter(tender=tender, version_number=1).exists():
            from .serializers import TenderSerializer
            import json
            try:
                raw_data = TenderSerializer(tender).data
                snapshot_data = json.loads(json.dumps(raw_data, default=str))
            except Exception:
                snapshot_data = {
                    "tender_number": tender.tender_number,
                    "title": tender.title,
                    "budget": str(tender.budget),
                    "status": tender.status
                }
            TenderVersion.objects.create(
                tender=tender,
                version_number=1,
                snapshot=snapshot_data,
                changed_by=user if user and getattr(user, 'is_authenticated', False) else None,
                change_type="PUBLISHED"
            )

        return tender


# ─────────────────────────────────────────────────────────────
# Real-World Production Tender Categories & Automated Seeder
# ─────────────────────────────────────────────────────────────

DEFAULT_TENDER_CATEGORIES = [
    {
        "name": "Civil Works & Infrastructure",
        "slug": "civil-works-infrastructure",
        "description": "Construction, rehabilitation of roads, bridges, public buildings, water supply, and civil infrastructure.",
        "subcategories": [
            {"name": "Roads, Highways & Bridges", "slug": "roads-highways-bridges"},
            {"name": "Building Construction & Renovation", "slug": "building-construction-renovation"},
            {"name": "Water Supply & Drainage Systems", "slug": "water-supply-drainage"},
            {"name": "Urban Planning & Public Works", "slug": "urban-planning-public-works"},
        ]
    },
    {
        "name": "Information Technology & Software",
        "slug": "information-technology-software",
        "description": "Enterprise software development, cloud infrastructure, networking, and IT managed services.",
        "subcategories": [
            {"name": "Enterprise Software & Cloud Platforms", "slug": "enterprise-software-cloud"},
            {"name": "Hardware Supply & Data Center Equipment", "slug": "hardware-datacenter"},
            {"name": "Cybersecurity & Identity Management", "slug": "cybersecurity-identity"},
            {"name": "Telecommunications & Fiber Networks", "slug": "telecommunications-fiber"},
        ]
    },
    {
        "name": "Healthcare & Medical Equipment",
        "slug": "healthcare-medical-equipment",
        "description": "Hospital medical devices, pharmaceuticals, laboratory diagnostics, and clinical consumables.",
        "subcategories": [
            {"name": "Diagnostic & Imaging Machinery", "slug": "diagnostic-imaging-machinery"},
            {"name": "Pharmaceuticals & Clinical Vaccines", "slug": "pharmaceuticals-vaccines"},
            {"name": "Hospital Furniture & Sterilization", "slug": "hospital-furniture-sterilization"},
        ]
    },
    {
        "name": "Electrical & Energy Systems",
        "slug": "electrical-energy-systems",
        "description": "Power grid equipment, renewable energy installations, transformers, and industrial electrical works.",
        "subcategories": [
            {"name": "Solar & Renewable Power Stations", "slug": "solar-renewable-power"},
            {"name": "Transmission Lines & Substations", "slug": "transmission-substations"},
            {"name": "Industrial Backup Generators & UPS", "slug": "backup-generators-ups"},
        ]
    },
    {
        "name": "Consulting & Professional Services",
        "slug": "consulting-professional-services",
        "description": "Architectural design, structural audits, financial auditing, project management, and legal advisory.",
        "subcategories": [
            {"name": "Architectural & Structural Engineering", "slug": "architectural-structural-engineering"},
            {"name": "Financial Audit & Spend Assessment", "slug": "financial-audit-spend"},
            {"name": "Environmental Impact Studies", "slug": "environmental-impact-studies"},
        ]
    },
    {
        "name": "Facilities Management & Maintenance",
        "slug": "facilities-management-maintenance",
        "description": "Commercial facility operations, corporate security, janitorial services, and HVAC maintenance.",
        "subcategories": [
            {"name": "HVAC, Elevator & Mechanical Maintenance", "slug": "hvac-elevator-maintenance"},
            {"name": "Corporate Physical Security & CCTV", "slug": "corporate-security-cctv"},
            {"name": "Industrial Janitorial & Waste Management", "slug": "janitorial-waste-management"},
        ]
    },
    {
        "name": "Industrial Goods & Raw Materials",
        "slug": "industrial-goods-raw-materials",
        "description": "Manufacturing machinery, steel fabrication, industrial chemicals, and commercial supplies.",
        "subcategories": [
            {"name": "Heavy Machinery & Fleet Vehicles", "slug": "heavy-machinery-fleet"},
            {"name": "Structural Steel & Construction Materials", "slug": "structural-steel-materials"},
            {"name": "Office Furniture & Technical Stationery", "slug": "office-furniture-stationery"},
        ]
    },
    {
        "name": "Transportation & Logistics",
        "slug": "transportation-logistics",
        "description": "Freight forwarding, passenger transport, supply chain warehousing, and fleet operations.",
        "subcategories": [
            {"name": "Freight Forwarding & Customs Clearance", "slug": "freight-customs-clearance"},
            {"name": "Fleet Leasing & Operational Transport", "slug": "fleet-leasing-transport"},
            {"name": "Cold Chain & Temperature-Controlled Storage", "slug": "cold-chain-storage"},
        ]
    }
]


def seed_default_categories():
    """
    Ensure standard enterprise procurement categories exist in the database.
    Self-healing routine that safely runs if categories are missing.
    """
    try:
        from .models import TenderCategory
        from django.utils.text import slugify

        created_count = 0
        for cat_data in DEFAULT_TENDER_CATEGORIES:
            slug = cat_data.get('slug') or slugify(cat_data['name'])
            parent_cat, created = TenderCategory.objects.get_or_create(
                slug=slug,
                defaults={
                    'name': cat_data['name'],
                    'description': cat_data.get('description', ''),
                    'is_active': True
                }
            )
            if created:
                created_count += 1
            for sub_data in cat_data.get('subcategories', []):
                sub_slug = sub_data.get('slug') or slugify(sub_data['name'])
                _, sub_created = TenderCategory.objects.get_or_create(
                    slug=sub_slug,
                    defaults={
                        'name': sub_data['name'],
                        'description': f"Subcategory of {parent_cat.name}",
                        'parent_category': parent_cat,
                        'is_active': True
                    }
                )
                if sub_created:
                    created_count += 1
        return created_count
    except Exception:
        return 0
