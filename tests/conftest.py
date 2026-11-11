"""Isolated fixtures for TenderX unit and API tests."""
from datetime import timedelta
from decimal import Decimal
import os
import uuid
from urllib.error import URLError
from urllib.request import urlopen
import pytest


def pytest_addoption(parser):
    parser.addoption("--run-selenium", action="store_true", default=False,
                     help="run browser tests (requires Chrome and a running frontend)")
    parser.addoption("--manual-selenium-session", action="store_true", default=False,
                     help="run manager UI flows after manually completing login and OTP")


def pytest_ignore_collect(collection_path, config):
    """Avoid importing Selenium at all unless browser tests were requested."""
    return "/tests/selenium" in str(collection_path) and not config.getoption("--run-selenium")


def pytest_collection_modifyitems(config, items):
    """Skip browser tests cleanly when the independently-run Vite app is absent."""
    if not config.getoption("--run-selenium"):
        return
    try:
        urlopen(os.getenv("TENDERX_FRONTEND_URL", "http://localhost:5173"), timeout=3)
    except (URLError, OSError):
        skip = pytest.mark.skip(reason="Selenium requires a running frontend at http://localhost:5173")
        for item in items:
            if "/selenium/" in str(item.fspath):
                item.add_marker(skip)


@pytest.fixture
def api_client():
    from rest_framework.test import APIClient
    return APIClient()


@pytest.fixture
def make_user(db):
    from accounts.models import User
    def make(role):
        suffix = uuid.uuid4().hex[:10]
        user = User.objects.create(email=f"{suffix}@example.test", username=suffix,
            first_name="Test", last_name="User", role=role, is_active=True, is_email_verified=True)
        user.set_password("SafeTestPass123!")
        user.save(update_fields=["password"])
        return user
    return make


@pytest.fixture
def manager(make_user):
    from accounts.models import UserRole
    return make_user(UserRole.TENDER_MANAGER)


@pytest.fixture
def vendor_user(make_user):
    from accounts.models import UserRole
    return make_user(UserRole.VENDOR)


@pytest.fixture
def category(db):
    from tenders.models import TenderCategory
    suffix = uuid.uuid4().hex[:8]
    return TenderCategory.objects.create(name=f"Category {suffix}", slug=f"category-{suffix}")


@pytest.fixture
def tender_payload(category):
    from django.utils import timezone
    deadline = timezone.now() + timedelta(days=14)
    return {"title": "Automated Procurement Test", "description": "Detailed tender description for automated testing.",
        "category": str(category.id), "budget": "125000.00", "currency": "INR",
        "submission_deadline": deadline.isoformat(), "opening_date": (deadline + timedelta(hours=1)).isoformat()}


@pytest.fixture
def draft_tender(db, manager, category):
    from tenders.models import Tender, TenderStatus
    return Tender.objects.create(tender_number=f"TST-{uuid.uuid4().hex[:10]}", title="Automated Draft Tender",
        description="Detailed tender description for automated testing.", category=category, created_by=manager,
        status=TenderStatus.DRAFT, budget=Decimal("125000.00"))


@pytest.fixture
def authenticated_client(api_client, manager):
    api_client.force_authenticate(manager)
    return api_client


@pytest.fixture
def vendor_profile(db, vendor_user):
    from vendors.models import Vendor, VendorStatus
    return Vendor.objects.create(user=vendor_user, company_name="Automated Vendor Ltd",
        registration_number=f"REG-{uuid.uuid4().hex[:9]}", email=vendor_user.email, status=VendorStatus.VERIFIED)
