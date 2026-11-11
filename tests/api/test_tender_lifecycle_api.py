import pytest
from datetime import timedelta
from django.utils import timezone
pytestmark = pytest.mark.django_db

def test_valid_transitions_persist_and_history(authenticated_client, draft_tender):
    from tenders.models import TenderStatus
    draft_tender.submission_deadline = timezone.now() + timedelta(days=2); draft_tender.save()
    for status in (TenderStatus.PUBLISHED, TenderStatus.ACTIVE, TenderStatus.EVALUATION):
        r = authenticated_client.post(f"/api/v1/tenders/{draft_tender.id}/transition/", {"targetStatus": status}, format="json")
        assert r.status_code == 200, r.data
    draft_tender.refresh_from_db()
    assert draft_tender.status == TenderStatus.EVALUATION and draft_tender.status_history.count() == 3

def test_invalid_transition_is_rejected(authenticated_client, draft_tender):
    assert authenticated_client.post(f"/api/v1/tenders/{draft_tender.id}/transition/", {"targetStatus":"CLOSED"}, format="json").status_code == 400

def test_vendor_cannot_transition(api_client, vendor_user, draft_tender):
    api_client.force_authenticate(vendor_user)
    assert api_client.post(f"/api/v1/tenders/{draft_tender.id}/transition/", {"targetStatus":"PUBLISHED"}, format="json").status_code == 403
