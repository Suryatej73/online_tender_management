from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from django.contrib.auth import get_user_model
from datetime import timedelta
import json

from accounts.models import UserRole
from tenders.models import (
    TenderStatus, TenderCategory, TenderTemplate,
    Tender, BOQItem, TenderAmendment, TenderDocument
)


User = get_user_model()


class TenderCategoryTests(TestCase):
    """Tests for Tender Category CRUD."""

    def setUp(self):
        self.category = TenderCategory.objects.create(
            name="IT Infrastructure",
            code="IT_INFRA",
            description="Information Technology systems and servers"
        )

    def test_category_list(self):
        """Test listing categories."""
        url = reverse('tender_category_list_create')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreaterEqual(len(data), 1)
        self.assertEqual(data[0]['name'], 'IT Infrastructure')

    def test_category_create(self):
        """Test creating a new category."""
        url = reverse('tender_category_list_create')
        response = self.client.post(url, data={
            'name': 'Civil Works',
            'code': 'CIVIL',
            'description': 'Roads and bridges'
        }, content_type='application/json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['code'], 'CIVIL')

    def test_category_detail(self):
        """Test fetching category detail."""
        url = reverse('tender_category_detail', kwargs={'pk': self.category.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['name'], 'IT Infrastructure')

    def test_category_deactivate(self):
        """Test soft-deactivating a category."""
        url = reverse('tender_category_detail', kwargs={'pk': self.category.pk})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 200)
        self.category.refresh_from_db()
        self.assertFalse(self.category.is_active)


class TenderTemplateTests(TestCase):
    """Tests for Tender Template CRUD."""

    def setUp(self):
        self.category = TenderCategory.objects.create(name="IT Procurement", code="IT")
        self.template = TenderTemplate.objects.create(
            name="Standard IT Template",
            description="Standard template for IT procurement",
            category=self.category,
            default_terms="Payment: 30/70 split",
            default_requirements="ISO 9001 required"
        )

    def test_template_list(self):
        url = reverse('tender_template_list_create')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreaterEqual(len(data), 1)

    def test_template_create(self):
        url = reverse('tender_template_list_create')
        response = self.client.post(url, data={
            'name': 'Civil Works Template',
            'description': 'For construction projects',
            'default_terms': 'Milestone-based payment',
        }, content_type='application/json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['name'], 'Civil Works Template')

    def test_template_detail(self):
        url = reverse('tender_template_detail', kwargs={'pk': self.template.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['default_terms'], 'Payment: 30/70 split')

    def test_create_tender_from_template(self):
        """Test creating a tender pre-populated from a template."""
        url = reverse('tender_create_from_template', kwargs={'pk': self.template.pk})
        response = self.client.post(url, data={
            'title': 'Server Procurement via Template',
            'submission_deadline': (timezone.now() + timedelta(days=30)).isoformat(),
            'estimated_cost': 500000,
        }, content_type='application/json')
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data['title'], 'Server Procurement via Template')
        self.assertIsNotNone(data['tender_number'])


class TenderCRUDTests(TestCase):
    """Tests for Tender CRUD operations."""

    def setUp(self):
        self.category = TenderCategory.objects.create(name="IT", code="IT")
        self.tender = Tender.objects.create(
            title="Data Center Server Procurement",
            description="Supply and install 50 high-performance servers",
            category=self.category,
            estimated_cost=1250000,
            emd_amount=25000,
            submission_deadline=timezone.now() + timedelta(days=30),
            status=TenderStatus.DRAFT,
        )

    def test_tender_list_with_metrics(self):
        """Test tender list returns metrics and list data."""
        url = reverse('tender_list_create')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('metrics', data)
        self.assertIn('tenders', data)
        self.assertEqual(data['metrics']['total'], 1)
        self.assertEqual(data['metrics']['draft'], 1)
        self.assertEqual(data['count'], 1)

    def test_tender_create(self):
        """Test creating a new tender."""
        url = reverse('tender_list_create')
        response = self.client.post(url, data={
            'title': 'Highway Construction',
            'description': 'Build a 50km highway',
            'estimated_cost': 8500000,
            'emd_amount': 170000,
            'submission_deadline': (timezone.now() + timedelta(days=60)).isoformat(),
            'is_two_envelope': True,
        }, content_type='application/json')
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertIsNotNone(data['tender_number'])
        self.assertIn('TDR-', data['tender_number'])
        self.assertEqual(data['status'], 'DRAFT')

    def test_tender_detail(self):
        """Test fetching a single tender detail."""
        url = reverse('tender_detail', kwargs={'pk': self.tender.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['title'], 'Data Center Server Procurement')

    def test_tender_update_draft(self):
        """Test updating a Draft tender."""
        url = reverse('tender_detail', kwargs={'pk': self.tender.pk})
        response = self.client.patch(url, data={
            'title': 'Updated: Data Center Server Procurement',
        }, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['title'], 'Updated: Data Center Server Procurement')

    def test_tender_update_non_draft_fails(self):
        """Test that non-draft tenders cannot be directly edited."""
        self.tender.status = TenderStatus.PUBLISHED
        self.tender.save()
        url = reverse('tender_detail', kwargs={'pk': self.tender.pk})
        response = self.client.patch(url, data={
            'title': 'Should fail',
        }, content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_tender_soft_delete(self):
        """Test soft-deleting a Draft tender."""
        url = reverse('tender_detail', kwargs={'pk': self.tender.pk})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 200)
        self.tender.refresh_from_db()
        self.assertTrue(self.tender.is_deleted)

    def test_tender_search(self):
        """Test search filtering across title, description, tender_number."""
        url = reverse('tender_list_create')
        response = self.client.get(url, {'search': 'Data Center'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['count'], 1)

        response = self.client.get(url, {'search': 'nonexistent'})
        self.assertEqual(response.json()['count'], 0)

    def test_tender_status_filter(self):
        """Test filtering by status."""
        url = reverse('tender_list_create')
        response = self.client.get(url, {'status': 'DRAFT'})
        self.assertEqual(response.json()['count'], 1)

        response = self.client.get(url, {'status': 'PUBLISHED'})
        self.assertEqual(response.json()['count'], 0)

    def test_tender_category_filter(self):
        """Test filtering by category."""
        url = reverse('tender_list_create')
        response = self.client.get(url, {'category': 'IT'})
        self.assertEqual(response.json()['count'], 1)

    def test_tender_cost_range_filter(self):
        """Test filtering by estimated cost range."""
        url = reverse('tender_list_create')
        response = self.client.get(url, {'min_cost': 1000000})
        self.assertEqual(response.json()['count'], 1)

        response = self.client.get(url, {'max_cost': 500000})
        self.assertEqual(response.json()['count'], 0)

    def test_tender_sorting(self):
        """Test sorting results."""
        Tender.objects.create(
            title="Another Tender",
            description="Desc",
            estimated_cost=999999,
            submission_deadline=timezone.now() + timedelta(days=15),
            status=TenderStatus.DRAFT,
        )
        url = reverse('tender_list_create')
        response = self.client.get(url, {'sort_by': '-estimated_cost'})
        data = response.json()
        self.assertEqual(data['tenders'][0]['title'], 'Data Center Server Procurement')


class TenderLifecycleTests(TestCase):
    """Tests for Tender lifecycle state machine."""

    def setUp(self):
        self.tender = Tender.objects.create(
            title="Lifecycle Test Tender",
            description="Testing lifecycle transitions",
            estimated_cost=500000,
            submission_deadline=timezone.now() + timedelta(days=30),
            status=TenderStatus.DRAFT,
        )

    def test_draft_to_published(self):
        """Test transitioning from Draft to Published."""
        url = reverse('tender_lifecycle', kwargs={'pk': self.tender.pk})
        response = self.client.post(url, data={'status': 'PUBLISHED'}, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.tender.refresh_from_db()
        self.assertEqual(self.tender.status, TenderStatus.PUBLISHED)
        self.assertIsNotNone(self.tender.published_at)

    def test_published_to_active(self):
        """Test transitioning from Published to Active."""
        self.tender.status = TenderStatus.PUBLISHED
        self.tender.published_at = timezone.now()
        self.tender.save()
        url = reverse('tender_lifecycle', kwargs={'pk': self.tender.pk})
        response = self.client.post(url, data={'status': 'ACTIVE'}, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.tender.refresh_from_db()
        self.assertEqual(self.tender.status, TenderStatus.ACTIVE)
        self.assertIsNotNone(self.tender.activated_at)

    def test_active_to_evaluation(self):
        """Test transitioning from Active to Evaluation."""
        self.tender.status = TenderStatus.ACTIVE
        self.tender.activated_at = timezone.now()
        self.tender.save()
        url = reverse('tender_lifecycle', kwargs={'pk': self.tender.pk})
        response = self.client.post(url, data={'status': 'EVALUATION'}, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.tender.refresh_from_db()
        self.assertEqual(self.tender.status, TenderStatus.EVALUATION)

    def test_evaluation_to_awarded(self):
        """Test transitioning from Evaluation to Awarded."""
        self.tender.status = TenderStatus.EVALUATION
        self.tender.save()
        url = reverse('tender_lifecycle', kwargs={'pk': self.tender.pk})
        response = self.client.post(url, data={'status': 'AWARDED'}, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.tender.refresh_from_db()
        self.assertEqual(self.tender.status, TenderStatus.AWARDED)

    def test_awarded_to_closed(self):
        """Test transitioning from Awarded to Closed."""
        self.tender.status = TenderStatus.AWARDED
        self.tender.save()
        url = reverse('tender_lifecycle', kwargs={'pk': self.tender.pk})
        response = self.client.post(url, data={'status': 'CLOSED'}, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.tender.refresh_from_db()
        self.assertEqual(self.tender.status, TenderStatus.CLOSED)

    def test_invalid_transition_fails(self):
        """Test that invalid transitions are rejected."""
        url = reverse('tender_lifecycle', kwargs={'pk': self.tender.pk})
        # Draft → Active (skipping Published) should fail
        response = self.client.post(url, data={'status': 'ACTIVE'}, content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.json())

    def test_cancel_from_draft(self):
        """Test cancelling a Draft tender."""
        url = reverse('tender_lifecycle', kwargs={'pk': self.tender.pk})
        response = self.client.post(url, data={'status': 'CANCELLED'}, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.tender.refresh_from_db()
        self.assertEqual(self.tender.status, TenderStatus.CANCELLED)

    def test_cancel_from_active(self):
        """Test cancelling an Active tender."""
        self.tender.status = TenderStatus.ACTIVE
        self.tender.save()
        url = reverse('tender_lifecycle', kwargs={'pk': self.tender.pk})
        response = self.client.post(url, data={'status': 'CANCELLED'}, content_type='application/json')
        self.assertEqual(response.status_code, 200)

    def test_closed_is_terminal(self):
        """Test that Closed tender cannot transition further."""
        self.tender.status = TenderStatus.CLOSED
        self.tender.save()
        url = reverse('tender_lifecycle', kwargs={'pk': self.tender.pk})
        response = self.client.post(url, data={'status': 'ACTIVE'}, content_type='application/json')
        self.assertEqual(response.status_code, 400)


class BOQTests(TestCase):
    """Tests for Bill of Quantities management."""

    def setUp(self):
        self.tender = Tender.objects.create(
            title="BOQ Test Tender",
            description="Testing BOQ",
            estimated_cost=100000,
            submission_deadline=timezone.now() + timedelta(days=30),
            status=TenderStatus.DRAFT,
        )

    def test_add_boq_item(self):
        """Test adding a BOQ item to a tender."""
        url = reverse('boq_item_list_create', kwargs={'tender_pk': self.tender.pk})
        response = self.client.post(url, data={
            'item_number': 1,
            'description': 'High-Performance Server',
            'unit': 'Unit',
            'quantity': 10,
            'unit_price': 5000,
        }, content_type='application/json')
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(float(data['total_price']), 50000)

    def test_list_boq_items(self):
        """Test listing BOQ items with total value."""
        BOQItem.objects.create(
            tender=self.tender, item_number=1, description='Server', quantity=5, unit_price=10000
        )
        BOQItem.objects.create(
            tender=self.tender, item_number=2, description='Switch', quantity=2, unit_price=2000
        )
        url = reverse('boq_item_list_create', kwargs={'tender_pk': self.tender.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['item_count'], 2)
        self.assertEqual(float(data['total_boq_value']), 54000)

    def test_update_boq_item(self):
        """Test updating a BOQ item."""
        item = BOQItem.objects.create(
            tender=self.tender, item_number=1, description='Server', quantity=5, unit_price=10000
        )
        url = reverse('boq_item_detail', kwargs={'tender_pk': self.tender.pk, 'item_pk': item.pk})
        response = self.client.patch(url, data={'quantity': 10}, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        item.refresh_from_db()
        self.assertEqual(item.quantity, 10)
        self.assertEqual(float(item.total_price), 100000)

    def test_delete_boq_item(self):
        """Test deleting a BOQ item."""
        item = BOQItem.objects.create(
            tender=self.tender, item_number=1, description='Server', quantity=5, unit_price=10000
        )
        url = reverse('boq_item_detail', kwargs={'tender_pk': self.tender.pk, 'item_pk': item.pk})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.tender.boq_items.count(), 0)


class AmendmentTests(TestCase):
    """Tests for Tender Amendment management."""

    def setUp(self):
        self.tender = Tender.objects.create(
            title="Amendment Test Tender",
            description="Testing amendments",
            estimated_cost=500000,
            submission_deadline=timezone.now() + timedelta(days=30),
            status=TenderStatus.PUBLISHED,
            published_at=timezone.now(),
        )

    def test_create_amendment(self):
        """Test creating an amendment on a published tender."""
        url = reverse('tender_amendment_list', kwargs={'tender_pk': self.tender.pk})
        response = self.client.post(url, data={
            'title': 'Extended Deadline',
            'description': 'Submission deadline extended by 7 days',
            'changes_summary': 'deadline extended from Aug 28 to Sep 4',
            'previous_values': {'deadline': '2026-08-28'},
            'new_values': {'deadline': '2026-09-04'},
        }, content_type='application/json')
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data['amendment_number'], 1)
        # Tender version should be bumped
        self.tender.refresh_from_db()
        self.assertEqual(self.tender.version, 2)

    def test_list_amendments(self):
        """Test listing amendments for a tender."""
        TenderAmendment.objects.create(
            tender=self.tender, title="First Amendment", description="Desc",
            changes_summary="Changed terms"
        )
        url = reverse('tender_amendment_list', kwargs={'tender_pk': self.tender.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['amendment_count'], 1)

    def test_cannot_amend_draft(self):
        """Test that amendments cannot be created on Draft tenders."""
        self.tender.status = TenderStatus.DRAFT
        self.tender.save()
        url = reverse('tender_amendment_list', kwargs={'tender_pk': self.tender.pk})
        response = self.client.post(url, data={
            'title': 'Should Fail',
            'description': 'Cannot amend draft',
            'changes_summary': 'test',
        }, content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_amendment_auto_numbering(self):
        """Test that amendment numbers auto-increment."""
        for i in range(3):
            TenderAmendment.objects.create(
                tender=self.tender, title=f"Amendment {i+1}", description="Desc",
                changes_summary="test"
            )
        url = reverse('tender_amendment_list', kwargs={'tender_pk': self.tender.pk})
        response = self.client.get(url)
        self.assertEqual(response.json()['amendment_count'], 3)


class TenderDashboardTests(TestCase):
    """Tests for the Tender Dashboard analytics endpoint."""

    def setUp(self):
        Tender.objects.create(
            title="Dashboard Test 1", description="Desc1",
            estimated_cost=100000, submission_deadline=timezone.now() + timedelta(days=5),
            status=TenderStatus.ACTIVE
        )
        Tender.objects.create(
            title="Dashboard Test 2", description="Desc2",
            estimated_cost=200000, submission_deadline=timezone.now() + timedelta(days=60),
            status=TenderStatus.PUBLISHED
        )

    def test_dashboard_response(self):
        """Test dashboard endpoint returns summary and recent tenders."""
        url = reverse('tender_dashboard')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('summary', data)
        self.assertIn('upcoming_deadlines', data)
        self.assertIn('recent_tenders', data)
        self.assertEqual(data['summary']['total_tenders'], 2)
        self.assertIn('status_breakdown', data['summary'])
        self.assertIn('categories', data['summary'])
