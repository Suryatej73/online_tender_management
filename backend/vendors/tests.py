import uuid
from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from accounts.models import User, UserRole, Organization
from vendors.models import (
    Vendor, VendorDocument, VendorCategory, VendorCategoryAssignment,
    VendorCertification, VendorExperience, VendorRating, VendorReview,
    VendorPerformanceRecord, VendorStatusHistory, VendorBlacklist,
    VendorSuspension, VendorAuditLog, VendorNotification,
    VendorStatus, DocumentStatus, DocumentType, ReviewStatus, BlacklistStatus,
)
from vendors.services import (
    VendorStatusService, VendorPerformanceService, VendorDocumentService,
)


class VendorModelsTestCase(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(
            name="Ministry of Public Works",
            code="MPW"
        )
        self.admin = User.objects.create_user(
            email="admin@vendorx.gov",
            username="admin",
            password="AdminPass123!",
            first_name="Admin",
            last_name="User",
            role=UserRole.SUPER_ADMIN,
        )
        self.vendor_user = User.objects.create_user(
            email="vendor@test.com",
            username="vendor1",
            password="VendorPass123!",
            first_name="Test",
            last_name="Vendor",
            role=UserRole.VENDOR,
        )
        self.category = VendorCategory.objects.create(
            name="IT Services",
            slug="it-services",
            description="Information Technology Services"
        )
        self.vendor = Vendor.objects.create(
            company_name="TechCorp Solutions",
            registration_number="REG-TC-001",
            email="contact@techcorp.com",
            phone="+91-9876543210",
            business_type="Private Limited",
            industry="Information Technology",
            description="Leading IT solutions provider",
            year_established=2010,
            city="Hyderabad",
            state="Telangana",
            country="India",
            user=self.vendor_user,
            status=VendorStatus.PENDING_VERIFICATION,
        )

    def test_01_vendor_creation(self):
        self.assertEqual(self.vendor.status, VendorStatus.PENDING_VERIFICATION)
        self.assertEqual(self.vendor.company_name, "TechCorp Solutions")
        self.assertTrue(str(self.vendor.id))

    def test_02_vendor_status_enum(self):
        for status_val, _ in VendorStatus.choices:
            self.vendor.status = status_val
            self.vendor.save()
            self.assertEqual(self.vendor.status, status_val)

    def test_03_vendor_profile_completion(self):
        completion = self.vendor.calculate_profile_completion()
        self.assertGreater(completion, 0)
        self.assertLessEqual(completion, 100)
        self.assertEqual(completion, self.vendor.profile_completion)

    def test_04_vendor_category(self):
        self.assertEqual(str(self.category), "IT Services")

    def test_05_vendor_str(self):
        self.assertIn("TechCorp Solutions", str(self.vendor))

    def test_06_vendor_document_model(self):
        doc = VendorDocument.objects.create(
            vendor=self.vendor,
            document_type=DocumentType.COMPANY_REGISTRATION,
            file_name="reg_cert.pdf",
            file_url="/files/reg_cert.pdf",
            file_size=1024,
            expiry_date=(timezone.now() + timedelta(days=365)).date(),
        )
        self.assertEqual(doc.status, DocumentStatus.PENDING)
        self.assertFalse(doc.is_expired)
        self.assertGreater(doc.days_until_expiry, 300)

    def test_07_expired_document_detection(self):
        doc = VendorDocument.objects.create(
            vendor=self.vendor,
            document_type=DocumentType.TAX_CERTIFICATE,
            file_name="tax_cert.pdf",
            file_url="/files/tax_cert.pdf",
            expiry_date=(timezone.now() - timedelta(days=10)).date(),
        )
        self.assertTrue(doc.is_expired)
        self.assertEqual(doc.days_until_expiry, 0)

    def test_08_vendor_certification(self):
        cert = VendorCertification.objects.create(
            vendor=self.vendor,
            name="ISO 9001:2015",
            issuing_authority="ISO",
            issue_date=timezone.now().date() - timedelta(days=365),
            expiry_date=timezone.now().date() + timedelta(days=365),
        )
        self.assertEqual(cert.name, "ISO 9001:2015")
        self.assertEqual(self.vendor.certifications.count(), 1)

    def test_09_vendor_experience(self):
        exp = VendorExperience.objects.create(
            vendor=self.vendor,
            project_name="Data Center Setup",
            client_name="Government of Telangana",
            project_value=5000000.00,
            start_date=timezone.now().date() - timedelta(days=365),
            end_date=timezone.now().date() - timedelta(days=30),
            is_completed=True,
        )
        self.assertEqual(self.vendor.experience_records.count(), 1)

    def test_10_vendor_rating(self):
        rating = VendorRating.objects.create(
            vendor=self.vendor,
            rated_by=self.admin,
            organization=self.org,
            overall_performance=5,
            quality_of_work=4,
            technical_capability=5,
            timeliness=3,
            communication=4,
            professionalism=5,
            compliance=4,
            value_for_money=5,
        )
        self.assertEqual(rating.average_score, 4.38)
        self.assertEqual(self.vendor.ratings.count(), 1)

    def test_11_vendor_review(self):
        review = VendorReview.objects.create(
            vendor=self.vendor,
            review_by=self.admin,
            organization=self.org,
            comment="Excellent work on the data center project",
            review_status=ReviewStatus.PUBLISHED,
        )
        self.assertEqual(review.review_status, ReviewStatus.PUBLISHED)
        self.assertEqual(self.vendor.reviews.count(), 1)

    def test_12_vendor_audit_log(self):
        log = VendorAuditLog.objects.create(
            vendor=self.vendor,
            user=self.admin,
            action='REGISTRATION',
            description='Vendor registered',
        )
        self.assertEqual(self.vendor.audit_logs.count(), 1)

    def test_13_vendor_notification(self):
        notif = VendorNotification.objects.create(
            vendor=self.vendor,
            title="Registration Received",
            message="Your vendor registration is pending verification",
        )
        self.assertFalse(notif.is_read)
        self.assertEqual(self.vendor.notifications.count(), 1)


class VendorStatusServiceTestCase(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin@status.test",
            username="status_admin",
            password="AdminPass123!",
            first_name="Status",
            last_name="Admin",
            role=UserRole.SUPER_ADMIN,
        )
        self.vendor = Vendor.objects.create(
            company_name="StatusTest Corp",
            registration_number="REG-STATUS-001",
            email="status@test.com",
            status=VendorStatus.PENDING_VERIFICATION,
        )

    def test_01_valid_transition_pending_to_verified(self):
        v = VendorStatusService.verify_vendor(self.vendor, user=self.admin, reason="Documents verified")
        self.assertEqual(v.status, VendorStatus.VERIFIED)
        self.assertIsNotNone(v.verified_at)

    def test_02_valid_transition_pending_to_rejected(self):
        v = VendorStatusService.reject_vendor(self.vendor, user=self.admin, reason="Invalid documents")
        self.assertEqual(v.status, VendorStatus.REJECTED)

    def test_03_valid_transition_verified_to_suspended(self):
        self.vendor.status = VendorStatus.VERIFIED
        self.vendor.save()
        v = VendorStatusService.suspend_vendor(
            self.vendor, user=self.admin,
            reason="Compliance violation", remarks="Multiple violations found"
        )
        self.assertEqual(v.status, VendorStatus.SUSPENDED)
        self.assertEqual(self.vendor.suspensions.count(), 1)

    def test_04_valid_transition_verified_to_blacklisted(self):
        self.vendor.status = VendorStatus.VERIFIED
        self.vendor.save()
        v = VendorStatusService.blacklist_vendor(
            self.vendor, user=self.admin,
            reason="Fraudulent documents", is_permanent=True
        )
        self.assertEqual(v.status, VendorStatus.BLACKLISTED)
        self.assertEqual(self.vendor.blacklist_records.count(), 1)

    def test_05_invalid_transition_blacklisted(self):
        self.vendor.status = VendorStatus.BLACKLISTED
        self.vendor.save()
        with self.assertRaises(ValueError):
            VendorStatusService.transition_vendor(self.vendor, VendorStatus.VERIFIED, user=self.admin)

    def test_06_reinstatement(self):
        self.vendor.status = VendorStatus.SUSPENDED
        self.vendor.save()
        v = VendorStatusService.reinstate_vendor(self.vendor, user=self.admin, reason="Issue resolved")
        self.assertEqual(v.status, VendorStatus.VERIFIED)

    def test_07_status_history_recorded(self):
        VendorStatusService.verify_vendor(self.vendor, user=self.admin)
        history = VendorStatusHistory.objects.filter(vendor=self.vendor)
        self.assertEqual(history.count(), 1)
        self.assertEqual(history.first().to_status, VendorStatus.VERIFIED)

    def test_08_eligibility_check_verified(self):
        self.vendor.status = VendorStatus.VERIFIED
        self.vendor.save()
        eligible, reason = VendorStatusService.check_eligibility(self.vendor)
        self.assertTrue(eligible)

    def test_09_eligibility_check_pending(self):
        eligible, reason = VendorStatusService.check_eligibility(self.vendor)
        self.assertFalse(eligible)
        self.assertIn("PENDING_VERIFICATION", reason)


class VendorPerformanceServiceTestCase(TestCase):
    def setUp(self):
        self.vendor = Vendor.objects.create(
            company_name="PerfTest Corp",
            registration_number="REG-PERF-001",
            email="perf@test.com",
            status=VendorStatus.VERIFIED,
        )

    def test_01_performance_no_records(self):
        score = VendorPerformanceService.calculate_performance_score(self.vendor)
        self.assertEqual(score, 0.0)

    def test_02_performance_with_records(self):
        VendorPerformanceRecord.objects.create(
            vendor=self.vendor,
            quality_score=4.5,
            timeliness_score=4.0,
            technical_score=4.5,
            communication_score=4.0,
            compliance_score=4.0,
            overall_rating=4.2,
            is_completed=True,
        )
        score = VendorPerformanceService.calculate_performance_score(self.vendor)
        self.assertGreater(score, 0)

    def test_03_update_vendor_aggregates(self):
        VendorPerformanceRecord.objects.create(
            vendor=self.vendor,
            quality_score=4.5,
            timeliness_score=4.0,
            technical_score=4.5,
            communication_score=4.0,
            compliance_score=4.0,
            overall_rating=4.2,
            is_completed=True,
        )
        VendorRating.objects.create(
            vendor=self.vendor,
            overall_performance=4,
            quality_of_work=5,
            technical_capability=4,
            timeliness=4,
            communication=3,
            professionalism=4,
            compliance=5,
            value_for_money=4,
        )
        updated = VendorPerformanceService.update_vendor_aggregates(self.vendor)
        self.assertEqual(updated.completed_projects, 1)
        self.assertGreater(float(updated.rating_count), 0)


class VendorAPITestCase(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="Test Org", code="TST")
        self.admin = User.objects.create_user(
            email="api_admin@test.com",
            username="api_admin",
            password="AdminPass123!",
            first_name="API",
            last_name="Admin",
            role=UserRole.SUPER_ADMIN,
        )
        self.vendor_user = User.objects.create_user(
            email="api_vendor@test.com",
            username="api_vendor",
            password="VendorPass123!",
            first_name="API",
            last_name="Vendor",
            role=UserRole.VENDOR,
        )
        self.vendor = Vendor.objects.create(
            company_name="API Test Corp",
            registration_number="REG-API-001",
            email="api@apitest.com",
            status=VendorStatus.PENDING_VERIFICATION,
        )
        self.verified_vendor = Vendor.objects.create(
            company_name="Verified API Corp",
            registration_number="REG-API-002",
            email="verified@apitest.com",
            status=VendorStatus.VERIFIED,
            verified_at=timezone.now(),
        )

    def test_01_vendor_dashboard(self):
        response = self.client.get('/api/v1/vendors/dashboard/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertIn('total_vendors', data['data'])

    def test_02_vendor_list(self):
        response = self.client.get('/api/v1/vendors/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertIn('data', data)
        self.assertIn('pagination', data)

    def test_03_vendor_create(self):
        response = self.client.post('/api/v1/vendors/', {
            'company_name': 'New Vendor Inc',
            'registration_number': 'REG-NEW-001',
            'email': 'new@vendor.com',
            'phone': '+91-9999999999',
            'business_type': 'LLP',
            'industry': 'Construction',
        }, content_type='application/json')
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertTrue(data['success'])

    def test_04_vendor_create_duplicate_email(self):
        response = self.client.post('/api/v1/vendors/', {
            'company_name': 'Duplicate Email Corp',
            'registration_number': 'REG-DUP-001',
            'email': 'api@apitest.com',
        }, content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_05_vendor_detail(self):
        response = self.client.get(f'/api/v1/vendors/{self.vendor.id}/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['data']['company_name'], 'API Test Corp')

    def test_06_vendor_detail_not_found(self):
        response = self.client.get(f'/api/v1/vendors/{uuid.uuid4()}/')
        self.assertEqual(response.status_code, 404)

    def test_07_vendor_update(self):
        response = self.client.put(f'/api/v1/vendors/{self.vendor.id}/', {
            'company_name': 'Updated Corp',
            'city': 'Mumbai',
        }, content_type='application/json')
        self.assertEqual(response.status_code, 200)

    def test_08_vendor_verify(self):
        response = self.client.post(f'/api/v1/vendors/{self.vendor.id}/verify/', {
            'reason': 'All documents verified'
        }, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.vendor.refresh_from_db()
        self.assertEqual(self.vendor.status, VendorStatus.VERIFIED)

    def test_09_vendor_reject(self):
        response = self.client.post(f'/api/v1/vendors/{self.vendor.id}/reject/', {
            'reason': 'Invalid documents submitted'
        }, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.vendor.refresh_from_db()
        self.assertEqual(self.vendor.status, VendorStatus.REJECTED)

    def test_10_pending_vendors_list(self):
        response = self.client.get('/api/v1/vendors/pending/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])

    def test_11_vendor_documents_upload(self):
        response = self.client.post(f'/api/v1/vendors/{self.vendor.id}/documents/', {
            'document_type': 'COMPANY_REGISTRATION',
            'file_name': 'registration.pdf',
            'file_url': '/files/registration.pdf',
            'file_size': 2048,
        }, content_type='application/json')
        self.assertEqual(response.status_code, 201)

    def test_12_vendor_documents_list(self):
        VendorDocument.objects.create(
            vendor=self.vendor,
            document_type=DocumentType.BUSINESS_LICENSE,
            file_name="license.pdf",
        )
        response = self.client.get(f'/api/v1/vendors/{self.vendor.id}/documents/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['count'], 1)

    def test_13_document_verify(self):
        doc = VendorDocument.objects.create(
            vendor=self.vendor,
            document_type=DocumentType.CERTIFICATION,
            file_name="cert.pdf",
        )
        response = self.client.post(f'/api/v1/documents/{doc.id}/verify/', {
            'action': 'verify',
            'remarks': 'Document verified'
        }, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        doc.refresh_from_db()
        self.assertEqual(doc.status, DocumentStatus.VERIFIED)

    def test_14_document_reject(self):
        doc = VendorDocument.objects.create(
            vendor=self.vendor,
            document_type=DocumentType.OTHER,
            file_name="other.pdf",
        )
        response = self.client.post(f'/api/v1/documents/{doc.id}/verify/', {
            'action': 'reject',
            'remarks': 'Insufficient information'
        }, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        doc.refresh_from_db()
        self.assertEqual(doc.status, DocumentStatus.REJECTED)

    def test_15_vendor_suspend(self):
        response = self.client.post(f'/api/v1/vendors/{self.verified_vendor.id}/suspend/', {
            'reason': 'Policy violation',
            'remarks': 'Multiple policy violations reported',
        }, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.verified_vendor.refresh_from_db()
        self.assertEqual(self.verified_vendor.status, VendorStatus.SUSPENDED)

    def test_16_vendor_suspend_requires_reason(self):
        response = self.client.post(f'/api/v1/vendors/{self.verified_vendor.id}/suspend/', {
            'reason': '',
        }, content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_17_vendor_blacklist(self):
        response = self.client.post(f'/api/v1/vendors/{self.verified_vendor.id}/blacklist/', {
            'reason': 'Fraudulent documents',
            'description': 'Submitted fake ISO certification',
            'is_permanent': True,
        }, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.verified_vendor.refresh_from_db()
        self.assertEqual(self.verified_vendor.status, VendorStatus.BLACKLISTED)

    def test_18_vendor_blacklist_requires_reason(self):
        response = self.client.post(f'/api/v1/vendors/{self.verified_vendor.id}/blacklist/', {
            'reason': '',
        }, content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_19_vendor_reinstate(self):
        self.verified_vendor.status = VendorStatus.SUSPENDED
        self.verified_vendor.save()
        response = self.client.post(f'/api/v1/vendors/{self.verified_vendor.id}/reinstate/', {
            'reason': 'Issue resolved',
        }, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.verified_vendor.refresh_from_db()
        self.assertEqual(self.verified_vendor.status, VendorStatus.VERIFIED)

    def test_20_vendor_rating(self):
        response = self.client.post(f'/api/v1/vendors/{self.verified_vendor.id}/ratings/', {
            'overall_performance': 5,
            'quality_of_work': 4,
            'technical_capability': 5,
            'timeliness': 4,
            'communication': 5,
            'professionalism': 4,
            'compliance': 5,
            'value_for_money': 4,
        }, content_type='application/json')
        self.assertEqual(response.status_code, 201)

    def test_21_vendor_rating_list(self):
        VendorRating.objects.create(
            vendor=self.verified_vendor,
            overall_performance=4,
            quality_of_work=4,
            technical_capability=4,
            timeliness=3,
            communication=4,
            professionalism=5,
            compliance=4,
            value_for_money=4,
        )
        response = self.client.get(f'/api/v1/vendors/{self.verified_vendor.id}/ratings/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('summary', data)

    def test_22_vendor_review(self):
        response = self.client.post(f'/api/v1/vendors/{self.verified_vendor.id}/reviews/', {
            'comment': 'Excellent work quality and timely delivery',
        }, content_type='application/json')
        self.assertEqual(response.status_code, 201)

    def test_23_vendor_review_list(self):
        VendorReview.objects.create(
            vendor=self.verified_vendor,
            review_by=self.admin,
            comment="Good work",
            review_status=ReviewStatus.PUBLISHED,
        )
        response = self.client.get(f'/api/v1/vendors/{self.verified_vendor.id}/reviews/')
        self.assertEqual(response.status_code, 200)

    def test_24_review_moderate(self):
        review = VendorReview.objects.create(
            vendor=self.verified_vendor,
            review_by=self.admin,
            comment="Test review",
            review_status=ReviewStatus.PENDING,
        )
        response = self.client.post(f'/api/v1/reviews/{review.id}/moderate/', {
            'status': 'PUBLISHED',
            'remarks': 'Appropriate review',
        }, content_type='application/json')
        self.assertEqual(response.status_code, 200)

    def test_25_review_vendor_respond(self):
        review = VendorReview.objects.create(
            vendor=self.verified_vendor,
            review_by=self.admin,
            comment="Needs improvement on deadlines",
            review_status=ReviewStatus.PUBLISHED,
        )
        response = self.client.post(
            f'/api/v1/vendors/{self.verified_vendor.id}/reviews/{review.id}/respond/',
            {'response': 'We have improved our processes'},
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        review.refresh_from_db()
        self.assertEqual(review.vendor_response, 'We have improved our processes')

    def test_26_vendor_performance(self):
        VendorPerformanceRecord.objects.create(
            vendor=self.verified_vendor,
            quality_score=4.5,
            timeliness_score=4.0,
            technical_score=4.5,
            communication_score=4.0,
            compliance_score=4.0,
            overall_rating=4.2,
            is_completed=True,
        )
        response = self.client.get(f'/api/v1/vendors/{self.verified_vendor.id}/performance/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('performance_score', data['data'])

    def test_27_vendor_categories(self):
        response = self.client.get('/api/v1/vendor-categories/')
        self.assertEqual(response.status_code, 200)

    def test_28_vendor_category_create(self):
        response = self.client.post('/api/v1/vendor-categories/', {
            'name': 'Construction',
            'slug': 'construction',
            'description': 'Civil construction services',
        }, content_type='application/json')
        self.assertEqual(response.status_code, 201)

    def test_29_vendor_certifications(self):
        response = self.client.post(f'/api/v1/vendors/{self.vendor.id}/certifications/', {
            'name': 'ISO 27001',
            'issuing_authority': 'ISO',
        }, content_type='application/json')
        self.assertEqual(response.status_code, 201)

    def test_30_vendor_experience(self):
        response = self.client.post(f'/api/v1/vendors/{self.vendor.id}/experience/', {
            'project_name': 'Smart City Project',
            'client_name': 'Government',
            'project_value': 10000000,
            'is_completed': True,
        }, content_type='application/json')
        self.assertEqual(response.status_code, 201)

    def test_31_vendor_notifications(self):
        VendorNotification.objects.create(
            vendor=self.vendor,
            title="Welcome",
            message="Registration received",
        )
        response = self.client.get(f'/api/v1/vendors/{self.vendor.id}/notifications/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['unread_count'], 1)

    def test_32_vendor_audit_logs(self):
        VendorAuditLog.objects.create(
            vendor=self.vendor,
            user=self.admin,
            action='REGISTRATION',
            description='Test audit',
        )
        response = self.client.get(f'/api/v1/vendors/{self.vendor.id}/audit-logs/')
        self.assertEqual(response.status_code, 200)

    def test_33_vendor_eligibility(self):
        response = self.client.get(f'/api/v1/vendors/{self.verified_vendor.id}/eligibility/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('eligible', data['data'])

    def test_34_vendor_delete(self):
        response = self.client.delete(f'/api/v1/vendors/{self.vendor.id}/')
        self.assertEqual(response.status_code, 200)
        self.vendor.refresh_from_db()
        self.assertTrue(self.vendor.is_deleted)

    def test_35_vendor_search(self):
        response = self.client.get('/api/v1/vendors/?search=API+Test')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])

    def test_36_vendor_status_filter(self):
        response = self.client.get(f'/api/v1/vendors/?status=VERIFIED')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        for v in data['data']:
            self.assertEqual(v['status'], 'VERIFIED')

    def test_37_blacklist_appeal(self):
        bl = VendorBlacklist.objects.create(
            vendor=self.verified_vendor,
            reason="Test blacklisting",
            status=BlacklistStatus.ACTIVE,
        )
        response = self.client.post(f'/api/v1/blacklist/{bl.id}/appeal/', {
            'appeal_remarks': 'This is a mistake, please review',
        }, content_type='application/json')
        self.assertEqual(response.status_code, 200)

    def test_38_all_audit_logs(self):
        VendorAuditLog.objects.create(
            vendor=self.vendor,
            user=self.admin,
            action='ADMIN_ACTION',
            description='Test',
        )
        response = self.client.get('/api/v1/vendor-audit-logs/')
        self.assertEqual(response.status_code, 200)
