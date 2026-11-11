import pytest
pytestmark = pytest.mark.django_db

def test_anonymous_directory_hides_drafts(api_client, draft_tender):
    r = api_client.get("/api/v1/tenders/")
    assert r.status_code == 200 and str(draft_tender.id) not in {x["id"] for x in r.data["data"]}

def test_manager_creates_persisted_draft(authenticated_client, tender_payload):
    from tenders.models import Tender, TenderStatus
    r = authenticated_client.post("/api/v1/tenders/", tender_payload, format="json")
    assert r.status_code == 201, r.data
    tender = Tender.objects.get(id=r.data["data"]["id"])
    assert tender.status == TenderStatus.DRAFT

def test_vendor_cannot_create_tender(api_client, vendor_user, tender_payload):
    api_client.force_authenticate(vendor_user)
    assert api_client.post("/api/v1/tenders/", tender_payload, format="json").status_code == 403

def test_vendor_cannot_edit_or_delete_draft(api_client, vendor_user, draft_tender):
    api_client.force_authenticate(vendor_user)
    assert api_client.patch(f"/api/v1/tenders/{draft_tender.id}/", {"title":"Not allowed"}, format="json").status_code == 403
    assert api_client.delete(f"/api/v1/tenders/{draft_tender.id}/").status_code == 403

def test_required_title_validation(authenticated_client, tender_payload):
    tender_payload.pop("title")
    r = authenticated_client.post("/api/v1/tenders/", tender_payload, format="json")
    assert r.status_code == 400 and "title" in r.data["errors"]

def test_search_and_pagination(authenticated_client, draft_tender):
    r = authenticated_client.get(f"/api/v1/tenders/?search={draft_tender.tender_number}&page=1&limit=1")
    assert r.status_code == 200 and r.data["pagination"]["total"] == 1 and r.data["data"][0]["id"] == str(draft_tender.id)

def test_draft_is_updated_and_soft_deleted(authenticated_client, draft_tender):
    assert authenticated_client.patch(f"/api/v1/tenders/{draft_tender.id}/", {"title":"Updated Tender"}, format="json").status_code == 200
    assert authenticated_client.delete(f"/api/v1/tenders/{draft_tender.id}/").status_code == 200
    draft_tender.refresh_from_db(); assert draft_tender.is_deleted
