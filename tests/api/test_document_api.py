import pytest
pytestmark = pytest.mark.django_db

def test_document_types_are_public(api_client):
    r = api_client.get("/api/v1/documents/types/")
    assert r.status_code == 200 and isinstance(r.data["data"], list)

def test_document_list_requires_authentication(api_client):
    assert api_client.get("/api/v1/documents/").status_code == 401

def test_empty_upload_is_rejected(authenticated_client):
    assert authenticated_client.post("/api/v1/documents/upload/initiate/", {}, format="json").status_code == 400
