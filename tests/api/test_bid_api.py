import pytest
from datetime import timedelta
from django.utils import timezone
pytestmark = pytest.mark.django_db

def _activate(tender):
    from tenders.models import TenderStatus
    tender.status = TenderStatus.ACTIVE; tender.submission_deadline = timezone.now() + timedelta(days=2); tender.save()

def test_vendor_creates_draft_bid(api_client, vendor_user, vendor_profile, draft_tender):
    _activate(draft_tender); api_client.force_authenticate(vendor_user)
    r = api_client.post("/api/v1/bids/", {"tender_id":str(draft_tender.id)}, format="json")
    assert r.status_code == 201, r.data
    from bids.models import BidStatus
    assert r.data["data"]["status"] == BidStatus.DRAFT

def test_second_create_resumes_existing_draft(api_client, vendor_user, vendor_profile, draft_tender):
    _activate(draft_tender); api_client.force_authenticate(vendor_user)
    first = api_client.post("/api/v1/bids/", {"tender_id":str(draft_tender.id)}, format="json")
    second = api_client.post("/api/v1/bids/", {"tender_id":str(draft_tender.id)}, format="json")
    assert first.status_code == 201 and second.status_code == 200 and first.data["data"]["id"] == second.data["data"]["id"]

def test_anonymous_cannot_create_bid(api_client, draft_tender):
    assert api_client.post("/api/v1/bids/", {"tender_id":str(draft_tender.id)}, format="json").status_code == 401
