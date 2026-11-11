import pytest, uuid
pytestmark = pytest.mark.django_db

def test_vendor_registration_persists(api_client):
    suffix = uuid.uuid4().hex[:10]
    r = api_client.post("/api/v1/vendors/", {"company_name":"QA Vendor", "registration_number":f"REG-{suffix}", "email":f"{suffix}@example.test"}, format="json")
    assert r.status_code == 201, r.data
    from vendors.models import Vendor
    assert Vendor.objects.filter(id=r.data["data"]["id"]).exists()

def test_vendor_search_and_detail(api_client, vendor_profile):
    r = api_client.get("/api/v1/vendors/?search=Automated%20Vendor")
    assert r.status_code == 200 and str(vendor_profile.id) in {x["id"] for x in r.data["data"]}
    assert api_client.get(f"/api/v1/vendors/{vendor_profile.id}/").status_code == 200
