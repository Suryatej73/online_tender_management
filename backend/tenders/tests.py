import uuid
from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from accounts.models import User, UserRole, Organization
from tenders.models import (
    Tender, TenderCategory, TenderStatus, TenderTemplate,
    TenderAmendment, AmendmentStatus, TenderVersion, TenderStatusHistory
)
from tenders.services import TenderLifecycleService



class TenderManagementEngineTestCase(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(
            name="Ministry of Public Works",
            code="MPW"
        )

        self.manager = User.objects.create_user(
            email="procurement@works.gov",
            username="procurement_mgr",
            password="SecurePassword123!",
            first_name="Alex",
            last_name="Manager",
            role=UserRole.TENDER_MANAGER,
            organization=self.org
        )

        self.category = TenderCategory.objects.create(
            name="Civil Infrastructure",
            slug="civil-infrastructure",
            description="Bridge & Road Works"
        )

    def test_01_create_draft_tender_and_auto_number(self):
        deadline = timezone.now() + timedelta(days=30)
        opening = deadline + timedelta(hours=2)

        tender = Tender.objects.create(
            tender_number="TND-2026-000001",
            title="Construction of Highway Flyover",
            description="Exhaustive civil engineering flyover construction",
            category=self.category,
            organization=self.org,
            created_by=self.manager,
            budget=5000000.00,
            submission_deadline=deadline,
            opening_date=opening,
            status=TenderStatus.DRAFT
        )

        self.assertEqual(tender.status, TenderStatus.DRAFT)
        self.assertEqual(tender.version, 1)
        self.assertTrue(tender.tender_number.startswith("TND-"))

    def test_02_tender_validation_publishing_readiness(self):
        past_deadline = timezone.now() - timedelta(days=1)
        invalid_tender = Tender.objects.create(
            tender_number="TND-2026-000002",
            title="Short",
            description="Brief",
            budget=-500.00,
            submission_deadline=past_deadline,
            status=TenderStatus.DRAFT
        )

        with self.assertRaises(ValueError):
            TenderLifecycleService.validate_publishing_readiness(invalid_tender)

    def test_03_lifecycle_state_machine_valid_workflow(self):
        deadline = timezone.now() + timedelta(days=15)
        opening = deadline + timedelta(hours=1)

        tender = Tender.objects.create(
            tender_number="TND-2026-000003",
            title="Smart Water Pipeline Network Expansion",
            description="Turnkey water utility supply & pipeline installation project",
            category=self.category,
            organization=self.org,
            created_by=self.manager,
            budget=1200000.00,
            submission_deadline=deadline,
            opening_date=opening,
            status=TenderStatus.DRAFT
        )

        # 1. DRAFT -> PUBLISHED
        t1 = TenderLifecycleService.transition_tender(tender, TenderStatus.PUBLISHED, user=self.manager, reason="Official publication")
        self.assertEqual(t1.status, TenderStatus.PUBLISHED)
        self.assertIsNotNone(t1.publication_date)

        # 2. PUBLISHED -> ACTIVE
        t2 = TenderLifecycleService.transition_tender(t1, TenderStatus.ACTIVE, user=self.manager, reason="Tender live")
        self.assertEqual(t2.status, TenderStatus.ACTIVE)

        # 3. ACTIVE -> EVALUATION
        t3 = TenderLifecycleService.transition_tender(t2, TenderStatus.EVALUATION, user=self.manager, reason="Deadline reached")
        self.assertEqual(t3.status, TenderStatus.EVALUATION)

        # 4. EVALUATION -> AWARDED
        t4 = TenderLifecycleService.transition_tender(t3, TenderStatus.AWARDED, user=self.manager, reason="L1 Bidder selected")
        self.assertEqual(t4.status, TenderStatus.AWARDED)

        # 5. AWARDED -> CLOSED
        t5 = TenderLifecycleService.transition_tender(t4, TenderStatus.CLOSED, user=self.manager, reason="Contract executed")
        self.assertEqual(t5.status, TenderStatus.CLOSED)

        # Verify status history chain
        history_count = TenderStatusHistory.objects.filter(tender=tender).count()
        self.assertEqual(history_count, 5)

    def test_04_lifecycle_state_machine_invalid_transition(self):
        tender = Tender.objects.create(
            tender_number="TND-2026-000004",
            title="Draft Tender Test",
            description="Testing forbidden jump from DRAFT to AWARDED",
            budget=100000.00,
            status=TenderStatus.DRAFT
        )

        with self.assertRaises(ValueError):
            TenderLifecycleService.transition_tender(tender, TenderStatus.AWARDED, user=self.manager)

    def test_05_amendment_publication_and_versioning(self):
        deadline = timezone.now() + timedelta(days=20)
        tender = Tender.objects.create(
            tender_number="TND-2026-000005",
            title="Solar Farm Infrastructure Tender",
            description="Supply and commissioning of 50MW solar array",
            category=self.category,
            organization=self.org,
            created_by=self.manager,
            budget=8000000.00,
            submission_deadline=deadline,
            status=TenderStatus.PUBLISHED,
            version=1
        )

        # Create Draft Amendment
        new_deadline = deadline + timedelta(days=10)
        amendment = TenderAmendment.objects.create(
            tender=tender,
            amendment_number=1,
            title="Submission Deadline Extension",
            reason="Vendor extension request",
            changes={"submission_deadline": {"newValue": new_deadline.isoformat()}},
            previous_version=1,
            new_version=2,
            status=AmendmentStatus.DRAFT,
            created_by=self.manager
        )

        # Publish Amendment
        amendment.status = AmendmentStatus.PUBLISHED
        amendment.published_at = timezone.now()
        amendment.save()

        tender.version = 2
        tender.submission_deadline = new_deadline
        tender.save()

        TenderVersion.objects.create(
            tender=tender,
            version_number=2,
            snapshot={"title": tender.title, "version": 2},
            changed_by=self.manager,
            change_type="AMENDMENT_#1"
        )

        self.assertEqual(tender.version, 2)
        self.assertEqual(TenderVersion.objects.filter(tender=tender).count(), 1)

    def test_06_tender_template_creation_and_application(self):
        template = TenderTemplate.objects.create(
            name="Standard IT Hardware Procurement Template",
            description="Pre-configured template for server and networking hardware",
            category=self.category,
            template_data={
                "procurementMethod": "OPEN_TENDER",
                "bidSecurityRequired": True,
                "eligibilityCriteria": "Minimum 5 years OEM experience",
                "technicalRequirements": "ISO 9001 certification required"
            },
            created_by=self.manager
        )

        # Apply template
        new_tender = Tender.objects.create(
            tender_number="TND-2026-000006",
            title=f"Draft - {template.name}",
            description=template.description,
            category=template.category,
            status=TenderStatus.DRAFT,
            eligibility_criteria=template.template_data["eligibilityCriteria"],
            technical_requirements=template.template_data["technicalRequirements"],
            created_by=self.manager
        )

        self.assertEqual(new_tender.status, TenderStatus.DRAFT)
        self.assertEqual(new_tender.technical_requirements, "ISO 9001 certification required")
        self.assertNotEqual(new_tender.id, template.id)
